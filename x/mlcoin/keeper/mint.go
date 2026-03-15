package keeper

import (
	"context"

	errorsmod "cosmossdk.io/errors"
	"github.com/tmp/marketplace/x/mlcoin/types"
)

// MintToWallet mints Mallcoins to a user's wallet
func (k Keeper) MintToWallet(ctx context.Context, address string, amount uint64) error {
	// Ensure minting is enabled for this call path.
	// Only code that explicitly calls `WithMintingEnabled` will set the flag.
	k.mu.Lock()
	allowed := k.internalMinting
	k.mu.Unlock()
	if !allowed {
		return errorsmod.Wrap(types.ErrUnauthorized, "minting not enabled for this caller")
	}
	// Get emission state
	emissionState, err := k.EmissionState.Get(ctx)
	if err != nil {
		return errorsmod.Wrap(types.ErrInvalidSupply, "emission state not initialized")
	}

	// Check if we've reached total supply
	if emissionState.Circulating+amount > emissionState.TotalSupply {
		return errorsmod.Wrap(types.ErrSupplyExhausted, "cannot mint more than total supply")
	}

	// Check daily limit
	if amount > emissionState.DailyLimit {
		return errorsmod.Wrap(types.ErrDailyLimitExceeded, "amount exceeds daily emission limit")
	}

	// Get or create wallet balance
	walletBalance, err := k.WalletBalance.Get(ctx, address)
	if err != nil {
		walletBalance = types.WalletBalance{
			Address: address,
			Balance: 0,
			Locked:  0,
		}
	}

	// Mint coins
	walletBalance.Balance += amount
	if err := k.WalletBalance.Set(ctx, address, walletBalance); err != nil {
		return err
	}

	// Update circulating supply
	emissionState.Circulating += amount
	if err := k.EmissionState.Set(ctx, emissionState); err != nil {
		return err
	}

	// Record mint transaction on blockchain
	_, err = k.RecordTransaction(ctx, "system", address, amount, "mint", "Minted from conversion or reward")
	if err != nil {
		// Log error but don't fail the mint
		// Minting is already completed, just recording failed
	}

	return nil
}
