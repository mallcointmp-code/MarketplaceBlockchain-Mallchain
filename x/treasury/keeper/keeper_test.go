package keeper_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/tmp/marketplace/x/treasury/keeper"
	"github.com/tmp/marketplace/x/treasury/types"

	storetypes "cosmossdk.io/store/types"
	"github.com/cosmos/cosmos-sdk/runtime"
	"github.com/cosmos/cosmos-sdk/testutil"
	sdk "github.com/cosmos/cosmos-sdk/types"
	moduletestutil "github.com/cosmos/cosmos-sdk/types/module/testutil"
	module "github.com/tmp/marketplace/x/treasury/module"
)

func initFixture(t *testing.T) (func(), keeper.Keeper, context.Context) {
	t.Helper()
	storeKey := storetypes.NewKVStoreKey(types.StoreKey)
	storeService := runtime.NewKVStoreService(storeKey)
	ctx := testutil.DefaultContextWithDB(t, storeKey, storetypes.NewTransientStoreKey("transient_test")).Ctx

	k := keeper.NewKeeper(storeService, moduletestutil.MakeTestEncodingConfig(module.AppModule{}).Codec)
	return func() {}, k, ctx
}

func TestMultisigAndDisbursement(t *testing.T) {
	_, k, ctx := initFixture(t)

	sdkCtx := sdk.UnwrapSDKContext(ctx) // Unwrap the SDK context

	// create multisig
	m := types.MultisigWallet{Index: "ms1", Members: []string{"a", "b", "c"}, Threshold: 2, Balance: 1000}
	require.NoError(t, k.CreateMultisig(sdkCtx, m))

	got, err := k.GetMultisig(sdkCtx, "ms1")
	require.NoError(t, err)
	require.NotNil(t, got)
	require.Equal(t, uint32(2), got.Threshold)

	// schedule disbursement
	d := types.Disbursement{Index: "d1", From: "ms1", To: "dest", Amount: 100, ReleaseAt: time.Now().Add(-time.Minute), Approvals: nil, Executed: false}
	require.NoError(t, k.ScheduleDisbursement(sdkCtx, d))

	// approve by two members
	require.NoError(t, k.ApproveDisbursement(sdkCtx, "d1", "a"))
	require.NoError(t, k.ApproveDisbursement(sdkCtx, "d1", "b"))

	exec, err := k.ExecuteDueDisbursements(sdkCtx, time.Now())
	require.NoError(t, err)
	require.Contains(t, exec, "d1")

	dd, err := k.GetDisbursement(sdkCtx, "d1")
	require.NoError(t, err)
	require.True(t, dd.Executed)
}
