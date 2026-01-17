package keeper_test

import (
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/stretchr/testify/require"

	"github.com/tmp/marketplace/x/mlcoin/types"
)

func TestAssignKeysToAllWallets(t *testing.T) {
	f := initFixture(t)

	// seed two wallet balances in the store
	w1 := types.WalletBalance{Index: "w1", Address: sdk.AccAddress([]byte("old1")).String(), Balance: 100}
	w2 := types.WalletBalance{Index: "w2", Address: sdk.AccAddress([]byte("old2")).String(), Balance: 200}
	require.NoError(t, f.keeper.WalletBalance.Set(f.ctx, w1.Index, w1))
	require.NoError(t, f.keeper.WalletBalance.Set(f.ctx, w2.Index, w2))

	assigned, err := f.keeper.AssignKeysToAllWallets(f.ctx)
	require.NoError(t, err)
	require.Len(t, assigned, 2)

	// verify the store was updated
	got, err := f.keeper.WalletBalance.Get(f.ctx, "w1")
	require.NoError(t, err)
	require.NotEqual(t, "old1", got.Address)

	// log the keys so the operator can capture them from test output; include index
	for _, a := range assigned {
		t.Logf("IDX=%s OLD=%s NEW=%s PRIV=%s", a.Index, a.OldAddress, a.NewAddress, a.PrivHex)
	}
}
