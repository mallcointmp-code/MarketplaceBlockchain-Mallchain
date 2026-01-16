package keeper

import (
	"context"
	"encoding/hex"
	"fmt"

	"github.com/cosmos/cosmos-sdk/crypto/keys/ed25519"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/tmp/marketplace/x/mlcoin/types"
)

// GenerateAndExportWallet generates a new keypair, returns the account address and
// the private key encoded as hex. This implements the "ephemeral generation + user export"
// prototype: the private key is returned to the caller exactly once and is NOT stored.
func (k Keeper) GenerateAndExportWallet(ctx context.Context) (string, string, error) {
	priv := ed25519.GenPrivKey()
	privBytes := priv.Bytes()
	pub := priv.PubKey()
	addr := sdk.AccAddress(pub.Address())
	return addr.String(), hex.EncodeToString(privBytes), nil
}

// AssignedKey describes a generated key assignment for an existing wallet entry.
type AssignedKey struct {
	OldAddress string
	NewAddress string
	PrivHex    string
}

// AssignKeysToAllWallets generates a fresh keypair for every wallet in the
// module's WalletBalance map, updates the wallet's stored address to the new
// address, and returns the private keys to the caller exactly once. The
// private keys are NOT persisted on-chain; callers must securely capture them.
func (k Keeper) AssignKeysToAllWallets(ctx context.Context) ([]AssignedKey, error) {
	var out []AssignedKey
	err := k.WalletBalance.Walk(ctx, nil, func(idx string, val types.WalletBalance) (stop bool, err error) {
		old := val.Address
		priv := ed25519.GenPrivKey()
		privHex := hex.EncodeToString(priv.Bytes())
		newAddr := sdk.AccAddress(priv.PubKey().Address()).String()

		val.Address = newAddr
		if err := k.WalletBalance.Set(ctx, idx, val); err != nil {
			return true, err
		}

		out = append(out, AssignedKey{OldAddress: old, NewAddress: newAddr, PrivHex: privHex})
		return false, nil
	})
	if err != nil {
		return nil, err
	}

	for _, a := range out {
		_ = fmt.Sprintf("assigned %s -> %s priv:%s", a.OldAddress, a.NewAddress, a.PrivHex)
	}

	return out, nil
}
