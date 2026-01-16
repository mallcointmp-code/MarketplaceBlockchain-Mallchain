package keeper_test

import (
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/stretchr/testify/require"

	"github.com/tmp/marketplace/x/mlcoin/types"
)

func TestSovereignRegisterAndLock(t *testing.T) {
	f := initFixture(t)

	// try invalid lock (too small)
	_, _, err := f.keeper.CanMoveSovereignFunds(f.ctx, "founder1")
	require.NoError(t, err)

	// Register with minimum allowed
	err = f.keeper.RegisterSovereignWallet(f.ctx, "founder1", types.SovereignMinLockBlocks)
	require.NoError(t, err)

	// Immediately cannot move
	can, remaining, err := f.keeper.CanMoveSovereignFunds(f.ctx, "founder1")
	require.NoError(t, err)
	require.False(t, can)
	require.Greater(t, remaining, uint64(0))

	// Advance to unlock height
	sdkCtx := sdk.UnwrapSDKContext(f.ctx)
	sdkCtx = sdkCtx.WithBlockHeight(int64(sdkCtx.BlockHeight()) + int64(types.SovereignMinLockBlocks+1))
	newCtx := sdk.WrapSDKContext(sdkCtx)

	// Now should be movable
	can, rem, err := f.keeper.CanMoveSovereignFunds(newCtx, "founder1")
	require.NoError(t, err)
	require.True(t, can)
	require.Equal(t, uint64(0), rem)
}
