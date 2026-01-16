package keeper_test

import (
    "testing"

    "github.com/stretchr/testify/require"
    sdk "github.com/cosmos/cosmos-sdk/types"

    "github.com/tmp/marketplace/x/mlcoin/types"
)

func TestMicroSettlementInstant(t *testing.T) {
    f := initFixture(t)
    // small transfer
    ok, err := f.keeper.EnqueueTransfer(f.ctx, "alice", "bob", 1_000)
    require.NoError(t, err)
    require.True(t, ok, "micro settlement should be instant")
    metrics, err := f.keeper.GetScarcityMetrics(f.ctx)
    require.NoError(t, err)
    require.Greater(t, metrics.SettlementVolume, uint64(0))
}

func TestLargeTransferDelayAndMultisig(t *testing.T) {
    f := initFixture(t)
    params := types.DefaultSettlementParams()
    // enqueue large transfer
    ok, err := f.keeper.EnqueueTransfer(f.ctx, "alice", "bank", params.LargeThreshold+1)
    require.NoError(t, err)
    require.False(t, ok)

    // processing immediately should not finalize (delay)
    sdkCtx := sdk.UnwrapSDKContext(f.ctx)
    err = f.keeper.ProcessSettlementQueue(sdkCtx)
    require.NoError(t, err)
    metrics, _ := f.keeper.GetScarcityMetrics(f.ctx)
    // still zero increase beyond initial
    require.Equal(t, uint64(0), metrics.SettlementVolume)

    // confirm with required sigs
    // read seq (first id should be 1); confirm twice
    _ = f.keeper.ConfirmSettlement(f.ctx, 1)
    _ = f.keeper.ConfirmSettlement(f.ctx, 1)

    // advance blocks to pass unlock
    sdkCtx = sdkCtx.WithBlockHeight(int64(params.LargeDelayBlocks + 10))
    err = f.keeper.ProcessSettlementQueue(sdkCtx)
    require.NoError(t, err)
    metrics, _ = f.keeper.GetScarcityMetrics(f.ctx)
    require.Greater(t, metrics.SettlementVolume, uint64(0))
}
