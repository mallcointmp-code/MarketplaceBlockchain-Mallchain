package keeper

import (
	"encoding/binary"
	"errors"
	"sort"

	"context"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tmp/marketplace/x/mlcoin/types"
)

var (
	keyConversionQueue  = []byte("conversion.queue")
	keyConversionVolume = []byte("conversion.volume") // accumulated processed conversion volume
)

// helper serialize/deserialize conversion request
func serializeConversionRequest(r types.ConversionRequest) []byte {
	addr := []byte(r.Address)
	if len(addr) > 255 {
		addr = addr[:255]
	}
	b := make([]byte, 1+len(addr)+8+8+1)
	b[0] = byte(len(addr))
	copy(b[1:1+len(addr)], addr)
	off := 1 + len(addr)
	binary.BigEndian.PutUint64(b[off:off+8], r.Amount)
	off += 8
	binary.BigEndian.PutUint64(b[off:off+8], r.EnqueueHeight)
	off += 8
	if r.HasBadge {
		b[off] = 1
	} else {
		b[off] = 0
	}
	return b
}

func deserializeConversionRequests(raw []byte) ([]types.ConversionRequest, error) {
	var res []types.ConversionRequest
	i := 0
	for i < len(raw) {
		if i+1 > len(raw) {
			return nil, errors.New("corrupt queue")
		}
		addrLen := int(raw[i])
		if i+1+addrLen+8+8+1 > len(raw) {
			return nil, errors.New("corrupt entry")
		}
		addr := string(raw[i+1 : i+1+addrLen])
		off := i + 1 + addrLen
		amount := binary.BigEndian.Uint64(raw[off : off+8])
		off += 8
		h := binary.BigEndian.Uint64(raw[off : off+8])
		off += 8
		badge := raw[off] != 0
		off += 1
		res = append(res, types.ConversionRequest{Address: addr, Amount: amount, EnqueueHeight: h, HasBadge: badge})
		i = off
	}
	return res, nil
}

func serializeConversionRequests(list []types.ConversionRequest) []byte {
	var out []byte
	for _, r := range list {
		out = append(out, serializeConversionRequest(r)...)
	}
	return out
}

// EnqueueConversion appends a conversion request to the queue.
func (k Keeper) EnqueueConversion(ctx context.Context, address string, amount uint64, hasBadge bool) error {
	s := k.storeService.OpenKVStore(ctx)
	raw, _ := s.Get(keyConversionQueue)
	// build request
	var h uint64
	if sdkCtx, ok := ctx.(sdk.Context); ok {
		h = uint64(sdkCtx.BlockHeight())
	}
	req := types.ConversionRequest{Address: address, Amount: amount, EnqueueHeight: h, HasBadge: hasBadge}
	raw = append(raw, serializeConversionRequest(req)...)
	return s.Set(keyConversionQueue, raw)
}

// ComputeConversionFeeBps computes fee in basis points based on recent conversion volume.
func (k Keeper) ComputeConversionFeeBps(ctx context.Context, amount uint64) (uint32, error) {
	s := k.storeService.OpenKVStore(ctx)
	raw, err := s.Get(keyConversionVolume)
	if err != nil {
		return 0, err
	}
	var vol uint64
	if len(raw) >= 8 {
		vol = binary.BigEndian.Uint64(raw[:8])
	}
	params := types.DefaultConversionParams()
	base := uint64(params.BaseFeeBps)
	if vol <= params.SurgeThreshold {
		return uint32(base), nil
	}
	extra := vol - params.SurgeThreshold
	diff := uint64(params.MaxFeeBps) - base
	// fee = base + extra * diff / surge
	add := (extra * diff) / params.SurgeThreshold
	fee := base + add
	if fee > uint64(params.MaxFeeBps) {
		fee = uint64(params.MaxFeeBps)
	}
	return uint32(fee), nil
}

// ProcessConversionQueue processes up to rate entries per block, honoring badge priority.
func (k Keeper) ProcessConversionQueue(ctx sdk.Context) error {
	s, err := k.kvStore(ctx)
	if err != nil {
		return err
	}
	raw, _ := s.Get(keyConversionQueue)
	if len(raw) == 0 {
		return nil
	}
	list, err := deserializeConversionRequests(raw)
	if err != nil {
		return err
	}
	params := types.DefaultConversionParams()
	rate := int(params.QueueProcessRate)
	if rate <= 0 {
		rate = 1
	}
	// sort: badge first if enabled, then older enqueues first
	if params.BadgePriority {
		sort.SliceStable(list, func(i, j int) bool {
			if list[i].HasBadge != list[j].HasBadge {
				return list[i].HasBadge && !list[j].HasBadge
			}
			return list[i].EnqueueHeight < list[j].EnqueueHeight
		})
	} else {
		sort.SliceStable(list, func(i, j int) bool { return list[i].EnqueueHeight < list[j].EnqueueHeight })
	}

	// process up to rate
	toProcess := rate
	if toProcess > len(list) {
		toProcess = len(list)
	}
	processed := list[:toProcess]
	remaining := list[toProcess:]

	// simulate processing: increment settlement volume and conversion volume
	for _, r := range processed {
		// compute fee (not used to modify amount here; just available)
		_, _ = k.ComputeConversionFeeBps(ctx, r.Amount)
		// record as settlement volume to reflect release
		_ = k.IncSettlementVolume(ctx, r.Amount)
		// accumulate conversion volume
		// read current
		curB, _ := s.Get(keyConversionVolume)
		var cur uint64
		if len(curB) >= 8 {
			cur = binary.BigEndian.Uint64(curB[:8])
		}
		cur += r.Amount
		var nb [8]byte
		binary.BigEndian.PutUint64(nb[:], cur)
		_ = s.Set(keyConversionVolume, nb[:])
	}

	// write remaining queue back
	if len(remaining) == 0 {
		_ = s.Set(keyConversionQueue, []byte{})
	} else {
		_ = s.Set(keyConversionQueue, serializeConversionRequests(remaining))
	}
	return nil
}
