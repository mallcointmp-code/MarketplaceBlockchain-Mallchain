package keeper

import (
	"context"
	"encoding/binary"
	"encoding/json"

	corestore "cosmossdk.io/core/store"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tmp/marketplace/x/sovereign/types"
)

type Keeper struct {
	storeService corestore.KVStoreService
}

func NewKeeper(storeService corestore.KVStoreService) Keeper {
	return Keeper{storeService: storeService}
}

func (k Keeper) kvStore(ctx sdk.Context) corestore.KVStore { return k.storeService.OpenKVStore(ctx) }

func (k Keeper) GetLock(ctx context.Context, addr string) (types.Lock, bool) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	s := k.kvStore(sdkCtx)
	key := lockKey(addr)
	b, _ := s.Get(key)
	if len(b) == 0 {
		return types.Lock{}, false
	}
	var l types.Lock
	if err := json.Unmarshal(b, &l); err != nil {
		return types.Lock{}, false
	}
	return l, true
}

func (k Keeper) SetLock(ctx context.Context, l types.Lock) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	s := k.kvStore(sdkCtx)
	bz, err := json.Marshal(&l)
	if err != nil {
		return err
	}
	s.Set(lockKey(l.Address), bz)
	return nil
}

func (k Keeper) DeleteLock(ctx context.Context, addr string) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	s := k.kvStore(sdkCtx)
	s.Delete(lockKey(addr))
}

func (k Keeper) IsLocked(ctx context.Context, addr string) bool {
	l, ok := k.GetLock(ctx, addr)
	if !ok || l.Exempt {
		return false
	}
	// use SDK block time
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	now := sdkCtx.BlockTime()
	return now.Before(l.UnlockAt)
}

func lockKey(addr string) []byte { return append([]byte("sovereign/lock/"), []byte(addr)...) }

func u64ToBytes(i uint64) []byte { b := make([]byte, 8); binary.BigEndian.PutUint64(b, i); return b }
