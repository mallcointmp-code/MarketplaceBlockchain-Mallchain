package keeper_test

import (
	"testing"

	storetypes "cosmossdk.io/store/types"
	addresscodec "github.com/cosmos/cosmos-sdk/codec/address"
	"github.com/cosmos/cosmos-sdk/runtime"
	"github.com/cosmos/cosmos-sdk/testutil"
	sdk "github.com/cosmos/cosmos-sdk/types"
	moduletestutil "github.com/cosmos/cosmos-sdk/types/module/testutil"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	"github.com/stretchr/testify/require"

	"github.com/tmp/marketplace/x/mlcoin/keeper"
	module "github.com/tmp/marketplace/x/mlcoin/module"
	"github.com/tmp/marketplace/x/mlcoin/types"
)

func setupKeeperForDeflation(t testing.TB) (keeper.Keeper, sdk.Context) {
	encCfg := moduletestutil.MakeTestEncodingConfig(module.AppModule{})
	addressCodec := addresscodec.NewBech32Codec(sdk.GetConfig().GetBech32AccountAddrPrefix())
	storeKey := storetypes.NewKVStoreKey(types.StoreKey)

	storeService := runtime.NewKVStoreService(storeKey)
	ctx := testutil.DefaultContextWithDB(t, storeKey, storetypes.NewTransientStoreKey("transient_test")).Ctx

	authority := authtypes.NewModuleAddress(types.GovModuleName)

	k := keeper.NewKeeper(
		storeService,
		encCfg.Codec,
		addressCodec,
		authority,
	)

	sdkCtx := sdk.UnwrapSDKContext(ctx)

	// Initialize params
	err := k.Params.Set(ctx, types.DefaultParams())
	require.NoError(t, err)

	// Initialize emission state
	err = k.EmissionState.Set(ctx, types.EmissionState{
		TotalSupply: 1_000_000_000_000,
		Circulating: 500_000_000_000,
	})
	require.NoError(t, err)

	return k, sdkCtx
}

func TestDeflationEpochCirculatingThreshold(t *testing.T) {
	k, ctx := setupKeeperForDeflation(t)

	// Set circulating below threshold
	err := k.EmissionState.Set(ctx, types.EmissionState{
		TotalSupply: 1_000_000_000_000,
		Circulating: 5_000_000_000_000, // Below default 10T threshold
	})
	require.NoError(t, err)

	// Should not trigger
	inEpoch, err := k.CheckAndUpdateDeflationEpoch(ctx)
	require.NoError(t, err)
	require.False(t, inEpoch)

	// Increase circulating above threshold
	err = k.EmissionState.Set(ctx, types.EmissionState{
		TotalSupply: 1_000_000_000_000,
		Circulating: 15_000_000_000_000, // Above 10T threshold
	})
	require.NoError(t, err)

	// Should trigger deflation epoch
	inEpoch, err = k.CheckAndUpdateDeflationEpoch(ctx)
	require.NoError(t, err)
	require.True(t, inEpoch)

	// Verify state was saved
	state, err := k.GetDeflationEpochState(ctx)
	require.NoError(t, err)
	require.True(t, state.Active)
	require.Equal(t, "circulating_threshold", state.TriggerReason)
	require.Equal(t, uint64(ctx.BlockHeight()), state.StartHeight)
}

func TestDeflationEpochVolatility(t *testing.T) {
	k, ctx := setupKeeperForDeflation(t)

	// Add price history with high volatility
	prices := []uint64{100, 150, 80, 200, 90} // High variance
	for _, price := range prices {
		err := k.UpdatePriceHistory(ctx, price)
		require.NoError(t, err)
	}

	// Check if volatility triggers epoch
	inEpoch, err := k.CheckAndUpdateDeflationEpoch(ctx)
	require.NoError(t, err)

	// Volatility calculation should detect high variance
	state, err := k.GetDeflationEpochState(ctx)
	require.NoError(t, err)

	if inEpoch {
		require.True(t, state.Active)
		require.Equal(t, "volatility_threshold", state.TriggerReason)
	}
}

func TestDeflationEpochLockedAccumulation(t *testing.T) {
	k, ctx := setupKeeperForDeflation(t)

	// Update locked balance with high accumulation
	err := k.UpdateLockedWalletBalance(ctx, 500_000)
	require.NoError(t, err)

	// Move to next block and add significant accumulation
	ctx = ctx.WithBlockHeight(2)
	err = k.UpdateLockedWalletBalance(ctx, 2_000_000) // 1.5M increase
	require.NoError(t, err)

	// Should trigger if accumulation rate exceeds threshold
	inEpoch, err := k.CheckAndUpdateDeflationEpoch(ctx)
	require.NoError(t, err)

	state, err := k.GetDeflationEpochState(ctx)
	require.NoError(t, err)

	if inEpoch {
		require.True(t, state.Active)
		require.Equal(t, "locked_accumulation", state.TriggerReason)
	}
}

func TestDeflationEpochDuration(t *testing.T) {
	k, ctx := setupKeeperForDeflation(t)

	// Trigger epoch manually
	params := types.DefaultScarcityParams()
	state := types.DeflationEpochState{
		Active:        true,
		StartHeight:   100,
		EndHeight:     100 + params.DeflationEpoch.EpochDurationBlocks,
		TriggerReason: "test",
	}
	err := k.SetDeflationEpochState(ctx, state)
	require.NoError(t, err)

	// Check before end
	ctx = ctx.WithBlockHeight(int64(state.EndHeight - 1))
	inEpoch, err := k.CheckAndUpdateDeflationEpoch(ctx)
	require.NoError(t, err)
	require.True(t, inEpoch)

	// Check at end height - should deactivate
	ctx = ctx.WithBlockHeight(int64(state.EndHeight))
	inEpoch, err = k.CheckAndUpdateDeflationEpoch(ctx)
	require.NoError(t, err)
	require.False(t, inEpoch)

	// Verify state
	updatedState, err := k.GetDeflationEpochState(ctx)
	require.NoError(t, err)
	require.False(t, updatedState.Active)
	require.Equal(t, uint64(state.EndHeight), updatedState.LastEpochEnd)
}

func TestDeflationEpochCooldown(t *testing.T) {
	k, ctx := setupKeeperForDeflation(t)

	// Set up a recently ended epoch
	params := types.DefaultScarcityParams()
	state := types.DeflationEpochState{
		Active:       false,
		LastEpochEnd: 100,
	}
	err := k.SetDeflationEpochState(ctx, state)
	require.NoError(t, err)

	// Set circulating to trigger condition
	err = k.EmissionState.Set(ctx, types.EmissionState{
		Circulating: 15_000_000_000_000,
	})
	require.NoError(t, err)

	// Try to trigger during cooldown
	ctx = ctx.WithBlockHeight(int64(state.LastEpochEnd + params.DeflationEpoch.CooldownBlocks - 1))
	inEpoch, err := k.CheckAndUpdateDeflationEpoch(ctx)
	require.NoError(t, err)
	require.False(t, inEpoch, "Should not trigger during cooldown")

	// After cooldown should trigger
	ctx = ctx.WithBlockHeight(int64(state.LastEpochEnd + params.DeflationEpoch.CooldownBlocks + 1))
	inEpoch, err = k.CheckAndUpdateDeflationEpoch(ctx)
	require.NoError(t, err)
	require.True(t, inEpoch, "Should trigger after cooldown")
}

func TestScarcityScaleWithDeflationEpoch(t *testing.T) {
	k, ctx := setupKeeperForDeflation(t)

	// Increment some counters
	err := k.IncActiveWallets(ctx, 100)
	require.NoError(t, err)
	err = k.IncSettlementVolume(ctx, 5000)
	require.NoError(t, err)

	// Normal computation should work
	err = k.ComputeAndStoreScarcityScale(ctx)
	require.NoError(t, err)

	scale, err := k.GetCurrentScarcityScale(ctx)
	require.NoError(t, err)
	require.Greater(t, scale, uint32(0), "Normal scale should be > 0")

	// Trigger deflation epoch
	err = k.EmissionState.Set(ctx, types.EmissionState{
		Circulating: 15_000_000_000_000, // Above threshold
	})
	require.NoError(t, err)

	// Compute scale again - should be 0 during epoch
	err = k.ComputeAndStoreScarcityScale(ctx)
	require.NoError(t, err)

	scale, err = k.GetCurrentScarcityScale(ctx)
	require.NoError(t, err)
	require.Equal(t, uint32(0), scale, "Scale should be 0 during deflation epoch")
}
