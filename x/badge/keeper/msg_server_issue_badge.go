package keeper

import (
	"context"

	errorsmod "cosmossdk.io/errors"
	"github.com/tmp/marketplace/x/badge/types"
)

func (k msgServer) IssueBadge(ctx context.Context, msg *types.MsgIssueBadge) (*types.MsgIssueBadgeResponse, error) {
	if _, err := k.addressCodec.StringToBytes(msg.Creator); err != nil {
		return nil, errorsmod.Wrap(err, "invalid creator address")
	}

	if _, err := k.addressCodec.StringToBytes(msg.Recipient); err != nil {
		return nil, errorsmod.Wrap(err, "invalid recipient address")
	}

	// Check if user already has a badge
	existingBadge, err := k.Keeper.UserBadge.Get(ctx, msg.Recipient)
	if err == nil && existingBadge.HasBadge {
		return nil, errorsmod.Wrap(types.ErrBadgeAlreadyIssued, "user already has a badge")
	}

	// Issue the badge
	badge := types.UserBadge{
		Address:    msg.Recipient,
		HasBadge:   true,
		IssuedDate: 0, // TODO: Set to current block time
		BadgeType:  msg.BadgeType,
	}

	if err := k.Keeper.UserBadge.Set(ctx, msg.Recipient, badge); err != nil {
		return nil, err
	}

	return &types.MsgIssueBadgeResponse{}, nil
}
