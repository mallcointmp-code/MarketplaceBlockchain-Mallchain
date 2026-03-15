package keeper

import (
	"context"

	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/tmp/marketplace/x/mlcoin/types"
)

func (k msgServer) TransferMallcoin(ctx context.Context, msg *types.MsgTransferMallcoin) (*types.MsgTransferMallcoinResponse, error) {
	// Validate Bech32 addresses
	if _, err := k.addressCodec.StringToBytes(msg.Creator); err != nil {
		return nil, errorsmod.Wrap(err, "invalid sender address")
	}

	if _, err := k.addressCodec.StringToBytes(msg.To); err != nil {
		return nil, errorsmod.Wrap(err, "invalid recipient address")
	}

	// Signature verification and sequence checking are performed by the
	// standard Cosmos SDK ante handler (ADR-036). Here we simply perform
	// the application-level transfer using the Bank keeper.

	sdkCtx := sdk.UnwrapSDKContext(ctx)

	sender, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return nil, errorsmod.Wrap(err, "invalid sender bech32 address")
	}
	receiver, err := sdk.AccAddressFromBech32(msg.To)
	if err != nil {
		return nil, errorsmod.Wrap(err, "invalid recipient bech32 address")
	}

	// Amounts are stored in micro-units in this module. Use denom "mlc".
	coins := sdk.NewCoins(sdk.NewInt64Coin("mlc", int64(msg.Amount)))

	if err := k.Keeper.bankKeeper.SendCoins(sdkCtx, sender, receiver, coins); err != nil {
		return nil, errorsmod.Wrap(err, "failed to send coins")
	}

	// Record transaction on blockchain (recording is best-effort)
	txID, _ := k.Keeper.RecordTransaction(ctx, msg.Creator, msg.To, msg.Amount, "transfer", "P2P transfer")

	return &types.MsgTransferMallcoinResponse{TxId: txID}, nil
}
