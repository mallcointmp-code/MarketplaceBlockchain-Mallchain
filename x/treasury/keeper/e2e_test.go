//go:build ignore
// +build ignore

package keeper_test

import (
	"context"
	"testing"
	"time"

	"github.com/spf13/viper"
	"github.com/stretchr/testify/require"

	app "github.com/tmp/marketplace/app"
	"github.com/tmp/marketplace/x/treasury/types"

	"cosmossdk.io/log"
	dbm "github.com/cosmos/cosmos-db"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// E2E-style test: start the full app, mint to treasury module account, schedule and execute a disbursement.
func TestTreasuryE2E(t *testing.T) {
	t.Helper()

	logger := log.NewNopLogger()
	db := dbm.NewMemDB()

	// start app with nil appOptions (tests use minimal options)
	bApp := app.New(logger, db, nil, true, viper.New())

	// create sdk context
	sdkCtx := bApp.BaseApp.NewContext(false)

	// mint 1000 tokens directly into treasury module account
	denom := sdk.DefaultBondDenom
	coins := sdk.NewCoins(sdk.NewInt64Coin(denom, 1000))
	require.NoError(t, bApp.BankKeeper.MintCoins(context.Background(), types.ModuleName, coins))

	treasuryAddr := bApp.AuthKeeper.GetModuleAddress(types.ModuleName)
	require.NotNil(t, treasuryAddr)

	// create multisig via keeper on the app instance
	k := bApp.TreasuryKeeper
	m := types.MultisigWallet{Index: "ms1", Members: []string{"a", "b", "c"}, Threshold: 2, Balance: 1000}
	require.NoError(t, k.CreateMultisig(sdkCtx, m))

	// schedule disbursement to account
	dest := sdk.AccAddress([]byte{10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29})
	d := types.Disbursement{Index: "d1", From: "ms1", To: dest.String(), Amount: 100, ReleaseAt: time.Now().Add(-time.Minute), Approvals: nil, Executed: false}
	require.NoError(t, k.ScheduleDisbursement(sdkCtx, d))
	require.NoError(t, k.ApproveDisbursement(sdkCtx, "d1", "a"))
	require.NoError(t, k.ApproveDisbursement(sdkCtx, "d1", "b"))

	// execute due disbursements
	exec, err := k.ExecuteDueDisbursements(sdkCtx, time.Now())
	require.NoError(t, err)
	require.Contains(t, exec, "d1")

	// verify recipient balance updated
	got := bApp.BankKeeper.GetBalance(sdkCtx, dest, denom)
	require.Equal(t, int64(100), got.Amount.Int64())
}
