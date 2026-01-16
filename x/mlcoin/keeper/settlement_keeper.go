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
    keySettlementQueue = []byte("settlement.queue")
    keySettlementSeq   = []byte("settlement.seq")
)

func serializeSettlement(req types.SettlementRequest) []byte {
    from := []byte(req.From)
    if len(from) > 255 { from = from[:255] }
    to := []byte(req.To)
    if len(to) > 255 { to = to[:255] }
    b := make([]byte, 8+1+len(from)+1+len(to)+8+8+4+4+1)
    off := 0
    binary.BigEndian.PutUint64(b[off:off+8], req.Id); off += 8
    b[off] = byte(len(from)); off++
    copy(b[off:off+len(from)], from); off += len(from)
    b[off] = byte(len(to)); off++
    copy(b[off:off+len(to)], to); off += len(to)
    binary.BigEndian.PutUint64(b[off:off+8], req.Amount); off += 8
    binary.BigEndian.PutUint64(b[off:off+8], req.EnqueueHeight); off += 8
    binary.BigEndian.PutUint32(b[off:off+4], req.RequiredSigs); off +=4
    binary.BigEndian.PutUint32(b[off:off+4], req.Confirmations); off +=4
    if req.Completed { b[off] = 1 } else { b[off] = 0 }
    return b
}

func deserializeSettlements(raw []byte) ([]types.SettlementRequest, error) {
    var out []types.SettlementRequest
    i := 0
    for i < len(raw) {
        if i+8 > len(raw) { return nil, errors.New("corrupt") }
        id := binary.BigEndian.Uint64(raw[i:i+8]); i+=8
        if i+1 > len(raw) { return nil, errors.New("corrupt") }
        fl := int(raw[i]); i++
        if i+fl > len(raw) { return nil, errors.New("corrupt") }
        from := string(raw[i:i+fl]); i+=fl
        if i+1 > len(raw) { return nil, errors.New("corrupt") }
        tl := int(raw[i]); i++
        if i+tl > len(raw) { return nil, errors.New("corrupt") }
        to := string(raw[i:i+tl]); i+=tl
        if i+8+8+4+4+1 > len(raw) { return nil, errors.New("corrupt") }
        amount := binary.BigEndian.Uint64(raw[i:i+8]); i+=8
        enqueue := binary.BigEndian.Uint64(raw[i:i+8]); i+=8
        reqSigs := binary.BigEndian.Uint32(raw[i:i+4]); i+=4
        conf := binary.BigEndian.Uint32(raw[i:i+4]); i+=4
        completed := raw[i] != 0; i++
        out = append(out, types.SettlementRequest{Id:id, From:from, To:to, Amount:amount, EnqueueHeight:enqueue, RequiredSigs:reqSigs, Confirmations:conf, Completed:completed})
    }
    return out, nil
}

func serializeSettlements(list []types.SettlementRequest) []byte {
    var out []byte
    for _, r := range list { out = append(out, serializeSettlement(r)...)}
    return out
}

// EnqueueTransfer enqueues a transfer; small transfers are returned as immediate settlements.
func (k Keeper) EnqueueTransfer(ctx context.Context, from, to string, amount uint64) (bool, error) {
    s, err := k.kvStore(ctx)
    if err != nil {
        return false, err
    }
    params := types.DefaultSettlementParams()
    // small transfer => instant (micro-settlement)
    if !params.Enabled || amount < params.LargeThreshold {
        // treat as settlement: increment settlement volume, no queue
        _ = k.IncSettlementVolume(ctx, amount)
        return true, nil
    }
    // large transfer: create request
    seqB, _ := s.Get(keySettlementSeq)
    var seq uint64
    if len(seqB) >= 8 { seq = binary.BigEndian.Uint64(seqB[:8]) }
    seq++
    var nb [8]byte; binary.BigEndian.PutUint64(nb[:], seq); _ = s.Set(keySettlementSeq, nb[:])

    // compute unlock height
    var enqueueH uint64
    if sdkCtx, ok := ctx.(sdk.Context); ok { enqueueH = uint64(sdkCtx.BlockHeight()) }
    unlock := enqueueH + params.LargeDelayBlocks

    req := types.SettlementRequest{Id:seq, From:from, To:to, Amount:amount, EnqueueHeight:enqueueH, UnlockHeight:unlock, RequiredSigs:params.LargeRequiredSigs, Confirmations:0, Completed:false}
    raw, _ := s.Get(keySettlementQueue)
    raw = append(raw, serializeSettlement(req)...)
    if err := s.Set(keySettlementQueue, raw); err != nil { return false, err }
    return false, nil
}

// ConfirmSettlement increments confirmations for a given request id by one (signer identity omitted for simplicity).
func (k Keeper) ConfirmSettlement(ctx context.Context, id uint64) error {
    s, err := k.kvStore(ctx)
    if err != nil { return err }
    raw, _ := s.Get(keySettlementQueue)
    if len(raw) == 0 { return nil }
    list, err := deserializeSettlements(raw)
    if err != nil { return err }
    for i := range list {
        if list[i].Id == id && !list[i].Completed {
            list[i].Confirmations++
            // update
            return s.Set(keySettlementQueue, serializeSettlements(list))
        }
    }
    return nil
}

// ProcessSettlementQueue processes pending settlements: complete those past unlock and with enough confirmations.
func (k Keeper) ProcessSettlementQueue(ctx sdk.Context) error {
    s, err := k.kvStore(ctx)
    if err != nil { return err }
    raw, _ := s.Get(keySettlementQueue)
    if len(raw) == 0 { return nil }
    list, err := deserializeSettlements(raw)
    if err != nil { return err }
    // sort by enqueue height
    sort.SliceStable(list, func(i,j int) bool { return list[i].EnqueueHeight < list[j].EnqueueHeight })
    var remaining []types.SettlementRequest
    var processedAny bool
    var currentH uint64
    currentH = uint64(ctx.BlockHeight())
    for _, r := range list {
        if r.Completed { continue }
        if currentH < r.UnlockHeight { remaining = append(remaining, r); continue }
        if r.Confirmations < r.RequiredSigs { remaining = append(remaining, r); continue }
        // finalize: increment settlement volume to reflect release
        _ = k.IncSettlementVolume(ctx, r.Amount)
        r.Completed = true
        processedAny = true
    }
    if len(remaining) == 0 {
        _ = s.Set(keySettlementQueue, []byte{})
    } else {
        _ = s.Set(keySettlementQueue, serializeSettlements(remaining))
    }
    if processedAny { /* could emit event */ }
    return nil
}
