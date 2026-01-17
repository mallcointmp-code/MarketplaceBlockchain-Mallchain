package types

import (
	"context"

	"cosmossdk.io/core/address"
	sdk "github.com/cosmos/cosmos-sdk/types"

	mlcointypes "github.com/tmp/marketplace/x/mlcoin/types"
)

// AuthKeeper defines the expected interface for the Auth module.
type AuthKeeper interface {
	AddressCodec() address.Codec
	GetAccount(context.Context, sdk.AccAddress) sdk.AccountI // only used for simulation
	// Methods imported from account should be defined here
}

// BankKeeper defines the expected interface for the Bank module.
type BankKeeper interface {
	SpendableCoins(context.Context, sdk.AccAddress) sdk.Coins
	// Methods imported from bank should be defined here
}

// ParamSubspace defines the expected Subspace interface for parameters.
type ParamSubspace interface {
	Get(context.Context, []byte, interface{})
	Set(context.Context, []byte, interface{})
}

// BadgeKeeper defines the expected interface for the Badge module.
type BadgeKeeper interface {
	HasUserBadge(ctx context.Context, address string) bool
}

// MlcoinKeeper is an alias to the Mlcoin module's expected keeper interface.
// This ensures a single concrete interface type is used across modules for depinject.
type MlcoinKeeper = mlcointypes.MlcoinKeeper
