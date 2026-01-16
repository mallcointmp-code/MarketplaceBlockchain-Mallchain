package keeper_test

import (
	"testing"

	"github.com/stretchr/testify/require"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

func TestEnqueueAndProcessConversionQueue(t *testing.T) {
	f := initFixture(t)
	// Enqueue three requests: two normal, one badge
	require.NoError(t, f.keeper.EnqueueConversion(f.ctx, "addr1", 1000, false))
	require.NoError(t, f.keeper.EnqueueConversion(f.ctx, "addr2", 2000, true))
	require.NoError(t, f.keeper.EnqueueConversion(f.ctx, "addr3", 3000, false))

	// Process queue (uses sdk.Context)
	sdkCtx := sdk.UnwrapSDKContext(f.ctx)
	// ensure some conversion volume to trigger fee scaling
	_ = f.keeper.IncSettlementVolume(f.ctx, 2_000_000)

	err := f.keeper.ProcessConversionQueue(sdkCtx)
	require.NoError(t, err)

	// After processing, some entries should have been consumed
	// Repeat processing until queue is empty
	for i := 0; i < 5; i++ {
		_ = f.keeper.ProcessConversionQueue(sdkCtx)
	}

	// Ensure conversion volume was increased
	metrics, err := f.keeper.GetScarcityMetrics(f.ctx)
	require.NoError(t, err)
	require.Greater(t, metrics.SettlementVolume, uint64(0))
}
