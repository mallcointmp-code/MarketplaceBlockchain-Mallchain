package keeper

import (
	"context"
	"encoding/binary"
	"errors"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tmp/marketplace/x/mlcoin/types"
)

var keySovereignPrefix = []byte("sovereign.lock.")

func sovereignKey(addr string) []byte {
	return append(keySovereignPrefix, []byte(addr)...)
}

// RegisterSovereignWallet registers a sovereign wallet with a mandatory time-lock.
// lockBlocks must be within allowed bounds.
func (k Keeper) RegisterSovereignWallet(ctx context.Context, addr string, lockBlocks uint64) error {
	if lockBlocks < types.SovereignMinLockBlocks || lockBlocks > types.SovereignMaxLockBlocks {
		return errors.New("lockBlocks out of allowed range")
	}
	s, err := k.kvStore(ctx)
	if err != nil {
		return err
	}
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	curH := uint64(sdkCtx.BlockHeight())
	expires := curH + lockBlocks
	// serialize: expires(8) + duration(8) + registeredAt(8)
	var b [24]byte
	binary.BigEndian.PutUint64(b[0:8], expires)
	binary.BigEndian.PutUint64(b[8:16], lockBlocks)
	binary.BigEndian.PutUint64(b[16:24], curH)
	return s.Set(sovereignKey(addr), b[:])
}

// GetSovereignLock returns the lock info for an address. If not found, returns nil and no error.
func (k Keeper) GetSovereignLock(ctx context.Context, addr string) (*types.SovereignLock, error) {
	s, err := k.kvStore(ctx)
	if err != nil {
		return nil, err
	}
	b, err := s.Get(sovereignKey(addr))
	if err != nil {
		return nil, err
	}
	if len(b) == 0 {
		return nil, nil
	}
	if len(b) < 24 {
		return nil, errors.New("corrupt sovereign entry")
	}
	expires := binary.BigEndian.Uint64(b[0:8])
	dur := binary.BigEndian.Uint64(b[8:16])
	reg := binary.BigEndian.Uint64(b[16:24])
	return &types.SovereignLock{Address: addr, ExpiresAt: expires, Duration: dur, RegisteredAt: reg}, nil
}

// CanMoveSovereignFunds returns whether the sovereign wallet can move funds now, and remaining blocks.
func (k Keeper) CanMoveSovereignFunds(ctx context.Context, addr string) (bool, uint64, error) {
	lock, err := k.GetSovereignLock(ctx, addr)
	if err != nil {
		return false, 0, err
	}
	if lock == nil {
		return true, 0, nil
	}
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	curH := uint64(sdkCtx.BlockHeight())
	if curH >= lock.ExpiresAt {
		return true, 0, nil
	}
	return false, lock.ExpiresAt - curH, nil
}
