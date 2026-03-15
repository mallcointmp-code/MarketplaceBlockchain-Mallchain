package keeper

import (
	"context"

	errorsmod "cosmossdk.io/errors"
	"github.com/tmp/marketplace/x/mallpoints/types"
)

func (k msgServer) ConvertToMallcoin(ctx context.Context, msg *types.MsgConvertToMallcoin) (*types.MsgConvertToMallcoinResponse, error) {
	if _, err := k.addressCodec.StringToBytes(msg.Creator); err != nil {
		return nil, errorsmod.Wrap(err, "invalid creator address")
	}

	// Check if conversion window is open (15th of month)
	conversionWindow, err := k.Keeper.ConversionWindow.Get(ctx)
	if err != nil || !conversionWindow.IsOpen {
		return nil, errorsmod.Wrap(types.ErrConversionWindowClosed, "conversion only allowed on the 15th of each month")
	}

	// Check if user has a badge (required for conversion)
	// Query badge keeper through expected keepers interface
	hasBadge := k.HasBadge(ctx, msg.Creator)
	if !hasBadge {
		return nil, errorsmod.Wrap(types.ErrNoBadge, "user must have a badge to convert Mallpoints")
	}

	// Get user's Mallpoints balance
	userPoints, err := k.Keeper.UserPoints.Get(ctx, msg.Creator)
	if err != nil {
		return nil, errorsmod.Wrap(types.ErrUserNotFound, "user has no Mallpoints")
	}

	// Check if user has sufficient Mallpoints
	if userPoints.Points < msg.Amount {
		return nil, errorsmod.Wrap(types.ErrInsufficientPoints, "insufficient Mallpoints balance")
	}

	// Deduct Mallpoints
	userPoints.Points -= msg.Amount
	if err := k.Keeper.UserPoints.Set(ctx, msg.Creator, userPoints); err != nil {
		return nil, err
	}

	// Mint Mallcoins to user wallet via mlcoin keeper
	// Conversion rate: 1 Mallpoint = 1 Mallcoin (can be adjusted)
	err = k.MintToUser(ctx, msg.Creator, msg.Amount)
	if err != nil {
		return nil, errorsmod.Wrap(err, "failed to mint Mallcoins")
	}

	return &types.MsgConvertToMallcoinResponse{}, nil
}
