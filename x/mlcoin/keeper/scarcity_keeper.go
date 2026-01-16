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
// raw keys used in KV store for counters/current scale
var (
	keyActiveWallets       = []byte("scarcity.active_wallets")
	keySettlementVolume    = []byte("scarcity.settlement_volume")
	keyOrderCount          = []byte("scarcity.order.count")
	keyCurrentScale        = []byte("scarcity.current_scale")
	keyDeflationEpochState = []byte("scarcity.deflation_epoch")
	keyLockedWalletBalance = []byte("scarcity.locked_balance")
	keyPriceHistory        = []byte("scarcity.price_history")
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
// Returns 0 scale if we're in a deflation epoch (no emissions).
func (k Keeper) ComputeAndStoreScarcityScale(ctx sdk.Context) error {
	// kv store helper accepts sdk.Context as context.Context
	s, err := k.kvStore(ctx)
	if err != nil {
		return err
	}

	// Check deflation epoch first
	inDeflationEpoch, err := k.CheckAndUpdateDeflationEpoch(ctx)
	if err != nil {
		// Log but don't fail - continue with normal scale
		ctx.Logger().Error("Failed to check deflation epoch", "error", err)
	}

	var scale uint32
	if inDeflationEpoch {
		// Deflation epoch: zero emissions
		scale = 0
		ctx.Logger().Info("Deflation epoch active - emissions halted", "height", ctx.BlockHeight())
	} else {
		// Normal scarcity computation
		metrics, err := k.GetScarcityMetrics(ctx)
		if err != nil {
			return err
		}

		params := types.DefaultScarcityParams()
		scale = ComputeEmissionScaleFromMetrics(params, metrics)
	}
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

// ===== Deflation Epoch Management =====

// GetDeflationEpochState retrieves the current deflation epoch state.
func (k Keeper) GetDeflationEpochState(ctx context.Context) (types.DeflationEpochState, error) {
	s, err := k.kvStore(ctx)
	if err != nil {
		return types.DeflationEpochState{}, err
	}

	// Read raw state (fixed 64-byte layout: active(1) + startHeight(8) + endHeight(8) + lastEpochEnd(8) + reason_len(1) + reason(up to 38))
	b, err := s.Get(keyDeflationEpochState)
	if err != nil {
		return types.DeflationEpochState{}, err
	}
	if len(b) == 0 {
		return types.DeflationEpochState{Active: false}, nil
	}
	if len(b) < 26 {
		return types.DeflationEpochState{}, errors.New("corrupt deflation epoch state")
	}

	state := types.DeflationEpochState{
		Active:       b[0] != 0,
		StartHeight:  binary.BigEndian.Uint64(b[1:9]),
		EndHeight:    binary.BigEndian.Uint64(b[9:17]),
		LastEpochEnd: binary.BigEndian.Uint64(b[17:25]),
	}
	reasonLen := int(b[25])
	if len(b) >= 26+reasonLen {
		state.TriggerReason = string(b[26 : 26+reasonLen])
	}
	return state, nil
}

// SetDeflationEpochState persists deflation epoch state.
func (k Keeper) SetDeflationEpochState(ctx context.Context, state types.DeflationEpochState) error {
	s, err := k.kvStore(ctx)
	if err != nil {
		return err
	}

	// Serialize to fixed layout
	reasonBytes := []byte(state.TriggerReason)
	if len(reasonBytes) > 255 {
		reasonBytes = reasonBytes[:255]
	}

	b := make([]byte, 26+len(reasonBytes))
	if state.Active {
		b[0] = 1
	}
	binary.BigEndian.PutUint64(b[1:9], state.StartHeight)
	binary.BigEndian.PutUint64(b[9:17], state.EndHeight)
	binary.BigEndian.PutUint64(b[17:25], state.LastEpochEnd)
	b[25] = byte(len(reasonBytes))
	copy(b[26:], reasonBytes)

	return s.Set(keyDeflationEpochState, b)
}

// CheckAndUpdateDeflationEpoch evaluates deflation epoch trigger conditions.
// Returns true if currently in a deflation epoch (emissions should be halted).
func (k Keeper) CheckAndUpdateDeflationEpoch(ctx sdk.Context) (bool, error) {
	params := types.DefaultScarcityParams()
	if !params.DeflationEpoch.Enabled {
		return false, nil
	}

	currentHeight := uint64(ctx.BlockHeight())
	state, err := k.GetDeflationEpochState(ctx)
	if err != nil {
		return false, err
	}

	// If epoch is active, check if it should end
	if state.Active {
		if currentHeight >= state.EndHeight {
			// End the epoch
			state.Active = false
			state.LastEpochEnd = currentHeight
			if err := k.SetDeflationEpochState(ctx, state); err != nil {
				return false, err
			}
			ctx.Logger().Info("Deflation epoch ended", "height", currentHeight, "reason", state.TriggerReason)
			return false, nil
		}
		// Still active
		return true, nil
	}

	// Check cooldown period
	if state.LastEpochEnd > 0 && currentHeight < state.LastEpochEnd+params.DeflationEpoch.CooldownBlocks {
		return false, nil
	}

	// Check trigger conditions
	triggerReason := ""

	// 1. Circulating supply threshold
	emissionState, err := k.EmissionState.Get(ctx)
	if err == nil && emissionState.Circulating >= params.DeflationEpoch.CirculatingThreshold {
		triggerReason = "circulating_threshold"
	}

	// 2. Volatility threshold
	if triggerReason == "" {
		volatility, err := k.calculateVolatility(ctx)
		if err == nil && volatility >= params.DeflationEpoch.VolatilityThresholdBps {
			triggerReason = "volatility_threshold"
		}
	}

	// 3. Locked wallet accumulation rate
	if triggerReason == "" {
		accumulationRate, err := k.getLockedAccumulationRate(ctx)
		if err == nil && accumulationRate >= params.DeflationEpoch.LockedAccumulationRate {
			triggerReason = "locked_accumulation"
		}
	}

	// Trigger epoch if any condition met
	if triggerReason != "" {
		state = types.DeflationEpochState{
			Active:        true,
			StartHeight:   currentHeight,
			EndHeight:     currentHeight + params.DeflationEpoch.EpochDurationBlocks,
			LastEpochEnd:  state.LastEpochEnd,
			TriggerReason: triggerReason,
		}
		if err := k.SetDeflationEpochState(ctx, state); err != nil {
			return false, err
		}
		ctx.Logger().Info("Deflation epoch triggered",
			"height", currentHeight,
			"reason", triggerReason,
			"duration_blocks", params.DeflationEpoch.EpochDurationBlocks)
		return true, nil
	}

	return false, nil
}

// calculateVolatility computes recent price volatility in basis points.
func (k Keeper) calculateVolatility(ctx sdk.Context) (uint32, error) {
	// Read recent price history (stored as array of uint64: [price1, price2, ...])
	s, err := k.kvStore(ctx)
	if err != nil {
		return 0, err
	}

	b, err := s.Get(keyPriceHistory)
	if err != nil || len(b) < 16 {
		return 0, nil // No data = no volatility
	}

	// Parse prices (last 10 prices max, 8 bytes each)
	numPrices := len(b) / 8
	if numPrices < 2 {
		return 0, nil
	}
	if numPrices > 10 {
		numPrices = 10
	}

	prices := make([]uint64, numPrices)
	for i := 0; i < numPrices; i++ {
		prices[i] = binary.BigEndian.Uint64(b[i*8 : (i+1)*8])
	}

	// Compute standard deviation relative to mean
	var sum, sumSq uint64
	for _, p := range prices {
		sum += p
		sumSq += p * p
	}
	mean := sum / uint64(numPrices)
	if mean == 0 {
		return 0, nil
	}

	variance := (sumSq / uint64(numPrices)) - (mean * mean)
	stdDev := uint64(math.Sqrt(float64(variance)))

	// Return as basis points: (stdDev / mean) * 10000
	volatilityBps := (stdDev * 10000) / mean
	if volatilityBps > 0xFFFFFFFF {
		return 0xFFFFFFFF, nil
	}
	return uint32(volatilityBps), nil
}

// UpdatePriceHistory records current market price for volatility calculation.
func (k Keeper) UpdatePriceHistory(ctx sdk.Context, price uint64) error {
	s, err := k.kvStore(ctx)
	if err != nil {
		return err
	}

	// Read existing history
	b, err := s.Get(keyPriceHistory)
	if err != nil {
		return err
	}

	// Append new price (keep last 10)
	const maxPrices = 10
	numPrices := len(b) / 8
	if numPrices >= maxPrices {
		// Shift left, drop oldest
		copy(b, b[8:])
		b = b[:len(b)-8]
	}

	// Append new price
	newB := make([]byte, len(b)+8)
	copy(newB, b)
	binary.BigEndian.PutUint64(newB[len(b):], price)

	return s.Set(keyPriceHistory, newB)
}

// getLockedAccumulationRate returns the recent rate of locked wallet accumulation.
func (k Keeper) getLockedAccumulationRate(ctx sdk.Context) (uint64, error) {
	s, err := k.kvStore(ctx)
	if err != nil {
		return 0, err
	}

	// Read locked balance history (last value + previous value to compute rate)
	b, err := s.Get(keyLockedWalletBalance)
	if err != nil || len(b) < 16 {
		return 0, nil
	}

	currentLocked := binary.BigEndian.Uint64(b[0:8])
	previousLocked := binary.BigEndian.Uint64(b[8:16])

	if currentLocked > previousLocked {
		return currentLocked - previousLocked, nil
	}
	return 0, nil
}

// UpdateLockedWalletBalance records current locked wallet balance for accumulation tracking.
func (k Keeper) UpdateLockedWalletBalance(ctx sdk.Context, balance uint64) error {
	s, err := k.kvStore(ctx)
	if err != nil {
		return err
	}

	// Read current value
	b, err := s.Get(keyLockedWalletBalance)
	if err != nil {
		return err
	}

	// Store new value as current, shift old current to previous
	newB := make([]byte, 16)
	binary.BigEndian.PutUint64(newB[0:8], balance)
	if len(b) >= 8 {
		copy(newB[8:16], b[0:8]) // previous = old current
	}

	return s.Set(keyLockedWalletBalance, newB)
}
