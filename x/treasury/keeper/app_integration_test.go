package keeper_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/tmp/marketplace/x/treasury/keeper"
	"github.com/tmp/marketplace/x/treasury/types"

	math "cosmossdk.io/math"
	storetypes "cosmossdk.io/store/types"
	"github.com/cosmos/cosmos-sdk/runtime"
	"github.com/cosmos/cosmos-sdk/testutil"
	sdk "github.com/cosmos/cosmos-sdk/types"
	moduletestutil "github.com/cosmos/cosmos-sdk/types/module/testutil"
	module "github.com/tmp/marketplace/x/treasury/module"
)

// inMemoryBank simulates a minimal bank keeper that tracks module and account balances.
type inMemoryBank struct {
	moduleBalances map[string]sdk.Coins
	accBalances    map[string]sdk.Coins
}

func (b *inMemoryBank) ensure() {
	if b.moduleBalances == nil {
		b.moduleBalances = make(map[string]sdk.Coins)
	}
	if b.accBalances == nil {
		b.accBalances = make(map[string]sdk.Coins)
	}
}

// SendCoinsFromModuleToAccount transfers coins from a module balance to an account balance.
func (b *inMemoryBank) SendCoinsFromModuleToAccount(ctx sdk.Context, senderModule string, recipient sdk.AccAddress, amt sdk.Coins) error {
	b.ensure()
	mb := b.moduleBalances[senderModule]
	if !mb.IsAllGTE(amt) {
		return fmt.Errorf("module has insufficient balance")
	}
	// subtract amt from mb manually
	newMb := sdk.NewCoins()
	for _, c := range mb {
		amtB := amt.AmountOf(c.Denom)
		if c.Amount.LT(amtB) {
			return fmt.Errorf("module has insufficient balance for denom %s", c.Denom)
		}
		newAmt := c.Amount.Sub(amtB)
		if !newAmt.IsZero() {
			newMb = newMb.Add(sdk.NewCoin(c.Denom, newAmt))
		}
	}
	b.moduleBalances[senderModule] = newMb
	addr := recipient.String()
	b.accBalances[addr] = b.accBalances[addr].Add(amt...)
	return nil
}

// AddCoinsToModule is a test helper to set module balances.
func (b *inMemoryBank) AddCoinsToModule(module string, coins sdk.Coins) {
	b.ensure()
	b.moduleBalances[module] = b.moduleBalances[module].Add(coins...)
}

// GetAccountBalance returns the coins for a given account address.
func (b *inMemoryBank) GetAccountBalance(addr sdk.AccAddress) sdk.Coins {
	b.ensure()
	return b.accBalances[addr.String()]
}

// GetModuleBalance returns the coins for a module account.
func (b *inMemoryBank) GetModuleBalance(module string) sdk.Coins {
	b.ensure()
	return b.moduleBalances[module]
}

// App-level style integration test using the inMemoryBank to validate real transfers.
func TestTreasuryAppIntegration(t *testing.T) {
	t.Helper()

	storeKey := storetypes.NewKVStoreKey(types.StoreKey)
	storeService := runtime.NewKVStoreService(storeKey)
	ctx := testutil.DefaultContextWithDB(t, storeKey, storetypes.NewTransientStoreKey("transient_app_test")).Ctx

	// create in-memory bank and seed module account
	ib := &inMemoryBank{}
	// seed treasury module account with 1000 tokens
	ib.AddCoinsToModule(types.ModuleName, sdk.NewCoins(sdk.NewCoin(sdk.DefaultBondDenom, math.NewInt(1000))))

	k := keeper.NewKeeperWithBank(storeService, moduletestutil.MakeTestEncodingConfig(module.AppModule{}).Codec, ib, types.ModuleName)
	sdkCtx := sdk.UnwrapSDKContext(ctx)

	// create multisig and fund its ledger (balance field is just illustrative)
	m := types.MultisigWallet{Index: "ms1", Members: []string{"a", "b", "c"}, Threshold: 2, Balance: 1000}
	require.NoError(t, k.CreateMultisig(sdkCtx, m))

	// schedule disbursement to a synthetic account (20 bytes)
	destAcc := sdk.AccAddress([]byte{11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30})
	amount := int64(100)
	d := types.Disbursement{Index: "d1", From: "ms1", To: destAcc.String(), Amount: uint64(amount), ReleaseAt: time.Now().Add(-time.Minute), Approvals: nil, Executed: false}
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

	// verify balances moved in the in-memory bank
	destBal := ib.GetAccountBalance(destAcc)
	require.True(t, destBal.AmountOf(sdk.DefaultBondDenom).Equal(math.NewInt(amount)))

	modBal := ib.GetModuleBalance(types.ModuleName)
	// module balance should have decreased by amount
	require.True(t, modBal.AmountOf(sdk.DefaultBondDenom).Equal(math.NewInt(1000-amount)))
}
