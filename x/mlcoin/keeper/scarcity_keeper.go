package keeper

import (
"encoding/binary"
"math"

"context"
"errors"

corestore "cosmossdk.io/core/store"
sdk "github.com/cosmos/cosmos-sdk/types"

"github.com/tmp/marketplace/x/mlcoin/types"
)

// ComputeEmissionScaleFromMetrics computes emission scale percent (Min..100)
// from provided metrics and params. This is a pure function to allow easy
// unit testing and decoupling from storage; persistence and collection
// of metrics will be added in follow-ups.
func ComputeEmissionScaleFromMetrics(params types.ScarcityParams, metrics types.ScarcityMetrics) uint32 {
// naive normalization: if metrics are zero => return 100
if metrics.ActiveWallets == 0 && metrics.SettlementVolume == 0 && metrics.OrderCount == 0 {
return 100
}

totalWeight := float64(params.ActiveWalletsWeight + params.SettlementVolumeWeight + params.OrderCountWeight)
if totalWeight == 0 {
totalWeight = 1
}

a := float64(metrics.ActiveWallets)
v := float64(metrics.SettlementVolume)
o := float64(metrics.OrderCount)

normA := 0.0
normV := 0.0
normO := 0.0
if a > 0 {
normA = math.Log1p(a)
}
if v > 0 {
normV = math.Log1p(v)
}
if o > 0 {
normO = math.Log1p(o)
}

weighted := (normA*float64(params.ActiveWalletsWeight) + normV*float64(params.SettlementVolumeWeight) + normO*float64(params.OrderCountWeight)) / totalWeight

s := 1.0 / (1.0 + weighted)

min := float64(params.MinScalePercent)
scale := min + (100.0-min)*s
if scale < min {
scale = min
}
if scale > 100 {
scale = 100
}

return uint32(scale + 0.5)
}

// raw keys used in KV store for counters/current scale
var (
keyActiveWallets    = []byte("scarcity.active_wallets")
keySettlementVolume = []byte("scarcity.settlement_volume")
keyOrderCount       = []byte("scarcity.order.count")
keyCurrentScale     = []byte("scarcity.current_scale")
)

func (k Keeper) kvStore(ctx context.Context) (corestore.KVStore, error) {
s := k.storeService.OpenKVStore(ctx)
return s, nil
}

func readUint64(s corestore.KVStore, key []byte) (uint64, error) {
b, err := s.Get(key)
if err != nil {
return 0, err
}
if len(b) == 0 {
return 0, nil
}
if len(b) < 8 {
return 0, errors.New("short value")
}
return binary.BigEndian.Uint64(b[:8]), nil
}

func writeUint64(s corestore.KVStore, key []byte, v uint64) error {
var b [8]byte
binary.BigEndian.PutUint64(b[:], v)
return s.Set(key, b[:])
}

func readUint32(s corestore.KVStore, key []byte) (uint32, error) {
b, err := s.Get(key)
if err != nil {
return 0, err
}
if len(b) == 0 {
return 0, nil
}
if len(b) < 4 {
return 0, errors.New("short value")
}
return binary.BigEndian.Uint32(b[:4]), nil
}

func writeUint32(s corestore.KVStore, key []byte, v uint32) error {
var b [4]byte
binary.BigEndian.PutUint32(b[:], v)
return s.Set(key, b[:])
}

// IncSettlementVolume increments the settlement volume counter by amt.
func (k Keeper) IncSettlementVolume(ctx context.Context, amt uint64) error {
s, err := k.kvStore(ctx)
if err != nil {
return err
}
cur, err := readUint64(s, keySettlementVolume)
if err != nil {
return err
}
return writeUint64(s, keySettlementVolume, cur+amt)
}

// IncOrderCount increments the order count by n.
func (k Keeper) IncOrderCount(ctx context.Context, n uint64) error {
s, err := k.kvStore(ctx)
if err != nil {
return err
}
cur, err := readUint64(s, keyOrderCount)
if err != nil {
return err
}
return writeUint64(s, keyOrderCount, cur+n)
}

// IncActiveWallets increments active-wallets counter by n.
func (k Keeper) IncActiveWallets(ctx context.Context, n uint64) error {
s, err := k.kvStore(ctx)
if err != nil {
return err
}
cur, err := readUint64(s, keyActiveWallets)
if err != nil {
return err
}
return writeUint64(s, keyActiveWallets, cur+n)
}

// GetScarcityMetrics reads persisted counters and returns a metrics snapshot.
func (k Keeper) GetScarcityMetrics(ctx context.Context) (types.ScarcityMetrics, error) {
s, err := k.kvStore(ctx)
if err != nil {
return types.ScarcityMetrics{}, err
}
a, err := readUint64(s, keyActiveWallets)
if err != nil {
return types.ScarcityMetrics{}, err
}
v, err := readUint64(s, keySettlementVolume)
if err != nil {
return types.ScarcityMetrics{}, err
}
o, err := readUint64(s, keyOrderCount)
if err != nil {
return types.ScarcityMetrics{}, err
}
return types.ScarcityMetrics{ActiveWallets: a, SettlementVolume: v, OrderCount: o}, nil
}

// ComputeAndStoreScarcityScale reads counters, computes scale and persists it.
func (k Keeper) ComputeAndStoreScarcityScale(ctx sdk.Context) error {
// kv store helper accepts sdk.Context as context.Context
s, err := k.kvStore(ctx)
if err != nil {
return err
}
metrics, err := k.GetScarcityMetrics(ctx)
if err != nil {
return err
}

params := types.DefaultScarcityParams()
scale := ComputeEmissionScaleFromMetrics(params, metrics)

return writeUint32(s, keyCurrentScale, scale)
}

// GetCurrentScarcityScale returns the stored current scale or 100 if missing.
func (k Keeper) GetCurrentScarcityScale(ctx context.Context) (uint32, error) {
s, err := k.kvStore(ctx)
if err != nil {
return 0, err
}
v, err := readUint32(s, keyCurrentScale)
if err != nil {
return 0, err
}
if v == 0 {
return 100, nil
}
return v, nil
}
