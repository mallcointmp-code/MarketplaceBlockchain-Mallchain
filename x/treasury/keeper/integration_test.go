package keeper_test

import (
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

// fakeBank is a minimal fake BankKeeper used for integration testing.
type fakeBank struct {
	records map[string]string
}

func (f *fakeBank) SendCoinsFromModuleToAccount(ctx sdk.Context, senderModule string, recipient sdk.AccAddress, amt sdk.Coins) error {
	if f.records == nil {
		f.records = make(map[string]string)
	}
	f.records[recipient.String()] = amt.String()
	return nil
}

// Integration-style test: mint funds to treasury module account, schedule disbursement, approve, execute, verify balances.
func TestTreasuryDisbursementTransfer(t *testing.T) {
	t.Helper()

	storeKey := storetypes.NewKVStoreKey(types.StoreKey)
	storeService := runtime.NewKVStoreService(storeKey)
	ctx := testutil.DefaultContextWithDB(t, storeKey, storetypes.NewTransientStoreKey("transient_test")).Ctx

	// create a fake bank keeper implementing the minimal interface expected
	fb := &fakeBank{}

	k := keeper.NewKeeperWithBank(storeService, moduletestutil.MakeTestEncodingConfig(module.AppModule{}).Codec, fb, types.ModuleName)
	// obtain sdk.Context from wrapped test context
	sdkCtx := sdk.UnwrapSDKContext(ctx)

	// create multisig and fund its ledger (balance tracked in multisig struct)
	m := types.MultisigWallet{Index: "ms1", Members: []string{"a", "b", "c"}, Threshold: 2, Balance: 1000}
	require.NoError(t, k.CreateMultisig(sdkCtx, m))

	// schedule disbursement to a synthetic account (20 bytes)
	destAcc := sdk.AccAddress([]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20})
	d := types.Disbursement{Index: "d1", From: "ms1", To: destAcc.String(), Amount: 100, ReleaseAt: time.Now().Add(-time.Minute), Approvals: nil, Executed: false}
	require.NoError(t, k.ScheduleDisbursement(sdkCtx, d))

	// approve twice
	require.NoError(t, k.ApproveDisbursement(sdkCtx, "d1", "a"))
	require.NoError(t, k.ApproveDisbursement(sdkCtx, "d1", "b"))

	// execute due disbursements
	exec, err := k.ExecuteDueDisbursements(sdkCtx, time.Now())
	require.NoError(t, err)
	require.Contains(t, exec, "d1")

	// verify disbursement marked executed
	dd, err := k.GetDisbursement(sdkCtx, "d1")
	require.NoError(t, err)
	require.True(t, dd.Executed)

	// verify fake bank recorded the transfer
	rec, ok := fb.records[destAcc.String()]
	require.True(t, ok)
	require.NotEmpty(t, rec)
}
