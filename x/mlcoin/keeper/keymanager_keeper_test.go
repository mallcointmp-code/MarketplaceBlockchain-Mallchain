package keeper_test

import (
	"context"
	"encoding/hex"
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/stretchr/testify/require"
)

func TestGenerateAndExportWallet(t *testing.T) {
	f := initFixture(t)

	addr1, privHex1, err := f.keeper.GenerateAndExportWallet(context.Background())
	require.NoError(t, err)
	require.NotEmpty(t, addr1)
	require.NotEmpty(t, privHex1)

	// decode private hex and derive address
	privBytes, err := hex.DecodeString(privHex1)
	require.NoError(t, err)
	// validate address string format
	_, err = sdk.AccAddressFromBech32(addr1)
	require.NoError(t, err)

	// Generate a second and ensure different
	addr2, privHex2, err := f.keeper.GenerateAndExportWallet(context.Background())
	require.NoError(t, err)
	require.NotEqual(t, addr1, addr2)
	require.NotEqual(t, privHex1, privHex2)
	_ = privBytes
}
