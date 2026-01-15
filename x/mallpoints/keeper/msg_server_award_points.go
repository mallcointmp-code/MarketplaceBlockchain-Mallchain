package keeper

import (
	"context"

	errorsmod "cosmossdk.io/errors"
	"github.com/tmp/marketplace/x/mallpoints/types"
)

func (k msgServer) AwardPoints(ctx context.Context, msg *types.MsgAwardPoints) (*types.MsgAwardPointsResponse, error) {
	if _, err := k.addressCodec.StringToBytes(msg.Creator); err != nil {
		return nil, errorsmod.Wrap(err, "invalid creator address")
	}

	if _, err := k.addressCodec.StringToBytes(msg.Recipient); err != nil {
		return nil, errorsmod.Wrap(err, "invalid recipient address")
	}

	// Get or create user points record
	userPoints, err := k.Keeper.UserPoints.Get(ctx, msg.Recipient)
	if err != nil {
		userPoints = types.UserPoints{
			Address:        msg.Recipient,
			Points:         0,
			TasksCompleted: 0,
			LastEarned:     0,
		}
	}

	// Award points based on task type
	// TODO: Add proof-of-work validation for engagement tasks
	userPoints.Points += msg.Amount
	userPoints.TasksCompleted += 1
	// TODO: Set LastEarned to current block time

	if err := k.Keeper.UserPoints.Set(ctx, msg.Recipient, userPoints); err != nil {
		return nil, err
	}

	return &types.MsgAwardPointsResponse{}, nil
}
