package keeper

import (
	"context"
	"time"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/tmp/marketplace/x/treasury/types"
)

// MsgServer provides handlers for treasury messages in tests and CLI scaffolding.
type MsgServer struct {
	k Keeper
	types.UnimplementedMsgServer
}

func NewMsgServer(k Keeper) MsgServer { return MsgServer{k: k} }

func (m MsgServer) CreateMultisig(ctx context.Context, msg *types.MsgCreateMultisig) (*types.MsgCreateMultisigResponse, error) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	w := types.MultisigWallet{Index: msg.Index, Members: msg.Members, Threshold: msg.Threshold, Balance: msg.Balance}
	if err := m.k.CreateMultisig(sdkCtx, w); err != nil {
		return nil, err
	}
	return &types.MsgCreateMultisigResponse{}, nil
}

func (m MsgServer) ScheduleDisbursement(ctx context.Context, msg *types.MsgScheduleDisbursement) (*types.MsgScheduleDisbursementResponse, error) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	d := types.Disbursement{Index: msg.Index, From: msg.From, To: msg.To, Amount: msg.Amount, ReleaseAt: UnixToTime(msg.ReleaseAtUnix), Approvals: nil, Executed: false}
	if err := m.k.ScheduleDisbursement(sdkCtx, d); err != nil {
		return nil, err
	}
	return &types.MsgScheduleDisbursementResponse{}, nil
}

func (m MsgServer) ApproveDisbursement(ctx context.Context, msg *types.MsgApproveDisbursement) (*types.MsgApproveDisbursementResponse, error) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	if err := m.k.ApproveDisbursement(sdkCtx, msg.Index, msg.Approver); err != nil {
		return nil, err
	}
	return &types.MsgApproveDisbursementResponse{}, nil
}

func UnixToTime(u int64) time.Time {
	if u == 0 {
		return time.Now()
	}
	return time.Unix(u, 0)
}
