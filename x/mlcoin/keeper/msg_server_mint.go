package keeper

import (
	"context"

	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	minttypes "github.com/cosmos/cosmos-sdk/x/mint/types"
	"github.com/tmp/marketplace/x/mlcoin/types"
)

// MintMallcoin allows the module authority to mint MLC to a recipient address.
func (k msgServer) MintMallcoin(ctx context.Context, msg *types.MsgMintMallcoin) (*types.MsgMintMallcoinResponse, error) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)

	// Authority check: ensure the message authority matches keeper authority
	authStr, err := k.Keeper.addressCodec.BytesToString(k.Keeper.GetAuthority())
	if err != nil {
		return nil, errorsmod.Wrap(types.ErrUnauthorized, "invalid module authority")
	}
	if msg.Authority != authStr {
		return nil, errorsmod.Wrap(types.ErrUnauthorized, "unauthorized")
	}

	if msg.Amount == 0 {
		return nil, errorsmod.Wrap(types.ErrInvalidRequest, "amount must be > 0")
	}

	// Mint tokens into the mint module account, then transfer to recipient
	if err := k.Keeper.MintModuleCoins(ctx, minttypes.ModuleName, msg.Amount); err != nil {
		return nil, err
	}

	if err := k.Keeper.SendFromModuleToAccount(ctx, minttypes.ModuleName, msg.Recipient, msg.Amount); err != nil {
		return nil, err
	}

	// Optionally record a transaction; here we return a simple TxId placeholder
	txid := "minted"
	_ = sdkCtx

	return &types.MsgMintMallcoinResponse{TxId: txid}, nil
}
