package keeper

import (
	"context"

	errorsmod "cosmossdk.io/errors"
	"github.com/tmp/marketplace/x/mlcoin/types"
)

func (k msgServer) TransferMallcoin(ctx context.Context, msg *types.MsgTransferMallcoin) (*types.MsgTransferMallcoinResponse, error) {
	if _, err := k.addressCodec.StringToBytes(msg.Creator); err != nil {
		return nil, errorsmod.Wrap(err, "invalid sender address")
	}

	if _, err := k.addressCodec.StringToBytes(msg.To); err != nil {
		return nil, errorsmod.Wrap(err, "invalid recipient address")
	}

	// Get sender balance
	senderBalance, err := k.Keeper.WalletBalance.Get(ctx, msg.Creator)
	if err != nil {
		return nil, errorsmod.Wrap(types.ErrWalletNotFound, "sender wallet not found")
	}

	// Check if sender has sufficient balance
	if senderBalance.Balance < msg.Amount {
		return nil, errorsmod.Wrap(types.ErrInsufficientBalance, "insufficient Mallcoin balance")
	}

	// Get or create recipient balance
	recipientBalance, err := k.Keeper.WalletBalance.Get(ctx, msg.To)
	if err != nil {
		recipientBalance = types.WalletBalance{
			Address: msg.To,
			Balance: 0,
			Locked:  0,
		}
	}

	// Transfer funds
	senderBalance.Balance -= msg.Amount
	recipientBalance.Balance += msg.Amount

	// Update balances
	if err := k.Keeper.WalletBalance.Set(ctx, msg.Creator, senderBalance); err != nil {
		return nil, err
	}
	if err := k.Keeper.WalletBalance.Set(ctx, msg.To, recipientBalance); err != nil {
		return nil, err
	}

	// Record transaction on blockchain
	txID, err := k.Keeper.RecordTransaction(ctx, msg.Creator, msg.To, msg.Amount, "transfer", "P2P transfer")
	if err != nil {
		// Log error but don't fail the transfer
		// Transaction is already completed, just recording failed
	}

	return &types.MsgTransferMallcoinResponse{TxId: txID}, nil
}
