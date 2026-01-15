package keeper

import (
	"context"
	"fmt"

	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/tmp/marketplace/x/mlcoin/types"
)

// BuyMallcoin handles buying MLCN with KES
func (k msgServer) BuyMallcoin(ctx context.Context, msg *types.MsgBuyMallcoin) (*types.MsgBuyMallcoinResponse, error) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)

	// load market price (initialize defaults if missing)
	market, err := k.MarketPrice.Get(ctx)
	if err != nil {
		market = types.MarketPrice{
			BuyPrice:        62, // 0.62 KES
			SellPrice:       58, // 0.58 KES
			TotalBuyVolume:  0,
			TotalSellVolume: 0,
		}
	}

	mlcn := msg.MlcnAmount
	if mlcn == 0 {
		return nil, errorsmod.Wrap(types.ErrInvalidRequest, "amount must be > 0")
	}

	// KES required (scaled by 100): kes = mlcn * buy_price
	kesRequired := mlcn * market.BuyPrice

	// get buyer KES balance
	kesBal, err := k.KesBalance.Get(ctx, msg.Buyer)
	if err != nil {
		return nil, errorsmod.Wrap(types.ErrInvalidRequest, "buyer KES balance not found")
	}
	if kesBal.Balance < kesRequired {
		return nil, errorsmod.Wrap(types.ErrInsufficientBalance, "insufficient KES to buy MLCN")
	}

	// deduct KES from buyer
	kesBal.Balance -= kesRequired
	if err := k.KesBalance.Set(ctx, msg.Buyer, kesBal); err != nil {
		return nil, err
	}

	// mint MLCN to buyer (use guarded minting)
	if err := k.Keeper.WithMintingEnabled(ctx, func() error { return k.Keeper.MintToWallet(ctx, msg.Buyer, mlcn) }); err != nil {
		return nil, err
	}

	// update market volumes and prices (simple linear adjustment)
	market.TotalBuyVolume += mlcn
	// price change: +1 cent per 1000 MLCN bought (minimum 1)
	priceChange := mlcn / 1000
	if priceChange == 0 {
		priceChange = 1
	}
	market.BuyPrice += priceChange
	market.SellPrice += priceChange
	market.LastUpdateHeight = uint64(sdkCtx.BlockHeight())
	if err := k.MarketPrice.Set(ctx, market); err != nil {
		return nil, err
	}

	// record trade
	seq, err := k.TransactionCount.Next(ctx)
	if err != nil {
		return nil, errorsmod.Wrap(err, "failed to get trade sequence")
	}
	tradeID := fmt.Sprintf("TR-%d", seq)
	trade := types.Trade{
		TxId:        tradeID,
		Trader:      msg.Buyer,
		TradeType:   "buy",
		MlcnAmount:  mlcn,
		KesAmount:   kesRequired,
		Price:       market.BuyPrice,
		Timestamp:   sdkCtx.BlockTime().Unix(),
		BlockHeight: uint64(sdkCtx.BlockHeight()),
	}
	if err := k.TradeHistory.Set(ctx, tradeID, trade); err != nil {
		return nil, err
	}

	return &types.MsgBuyMallcoinResponse{TradeId: tradeID, KesPaid: kesRequired, Price: market.BuyPrice}, nil
}

// SellMallcoin handles selling MLCN for KES
func (k msgServer) SellMallcoin(ctx context.Context, msg *types.MsgSellMallcoin) (*types.MsgSellMallcoinResponse, error) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)

	// load market price
	market, err := k.MarketPrice.Get(ctx)
	if err != nil {
		market = types.MarketPrice{BuyPrice: 62, SellPrice: 58}
	}

	mlcn := msg.MlcnAmount
	if mlcn == 0 {
		return nil, errorsmod.Wrap(types.ErrInvalidRequest, "amount must be > 0")
	}

	// check seller balance
	wallet, err := k.WalletBalance.Get(ctx, msg.Seller)
	if err != nil {
		return nil, errorsmod.Wrap(types.ErrWalletNotFound, "seller wallet not found")
	}
	if wallet.Balance < mlcn {
		return nil, errorsmod.Wrap(types.ErrInsufficientBalance, "insufficient MLCN to sell")
	}

	// kes to credit to seller
	kesToCredit := mlcn * market.SellPrice

	// deduct MLCN from seller
	wallet.Balance -= mlcn
	if err := k.WalletBalance.Set(ctx, msg.Seller, wallet); err != nil {
		return nil, err
	}

	// reduce circulating supply
	emission, err := k.EmissionState.Get(ctx)
	if err == nil {
		if emission.Circulating >= mlcn {
			emission.Circulating -= mlcn
			_ = k.EmissionState.Set(ctx, emission)
		}
	}

	// credit KES to seller
	kesBal, err := k.KesBalance.Get(ctx, msg.Seller)
	if err != nil {
		kesBal = types.KesBalance{Address: msg.Seller, Balance: 0}
	}
	kesBal.Balance += kesToCredit
	if err := k.KesBalance.Set(ctx, msg.Seller, kesBal); err != nil {
		return nil, err
	}

	// update market
	market.TotalSellVolume += mlcn
	priceChange := mlcn / 1000
	if priceChange == 0 {
		priceChange = 1
	}
	// decrease prices on sells but keep them >=1
	if market.BuyPrice > priceChange {
		market.BuyPrice -= priceChange
	} else {
		market.BuyPrice = 1
	}
	if market.SellPrice > priceChange {
		market.SellPrice -= priceChange
	} else {
		market.SellPrice = 1
	}
	market.LastUpdateHeight = uint64(sdkCtx.BlockHeight())
	if err := k.MarketPrice.Set(ctx, market); err != nil {
		return nil, err
	}

	// record trade
	seq, err := k.TransactionCount.Next(ctx)
	if err != nil {
		return nil, errorsmod.Wrap(err, "failed to get trade sequence")
	}
	tradeID := fmt.Sprintf("TR-%d", seq)
	trade := types.Trade{
		TxId:        tradeID,
		Trader:      msg.Seller,
		TradeType:   "sell",
		MlcnAmount:  mlcn,
		KesAmount:   kesToCredit,
		Price:       market.SellPrice,
		Timestamp:   sdkCtx.BlockTime().Unix(),
		BlockHeight: uint64(sdkCtx.BlockHeight()),
	}
	if err := k.TradeHistory.Set(ctx, tradeID, trade); err != nil {
		return nil, err
	}

	// Record transaction on-chain for the sell (seller -> system)
	_, _ = k.RecordTransaction(ctx, msg.Seller, "system", mlcn, "sell", "Sold to marketplace")

	return &types.MsgSellMallcoinResponse{TradeId: tradeID, KesReceived: kesToCredit, Price: market.SellPrice}, nil
}

// SetCurrencyRate sets a currency rate to KES (admin)
func (k msgServer) SetCurrencyRate(ctx context.Context, msg *types.MsgSetCurrencyRate) (*types.MsgSetCurrencyRateResponse, error) {
	// Allow manual setting only when submitted by module authority (e.g., governance).
	// Extract authority string from keeper and compare to message authority.
	authStr, err := k.Keeper.addressCodec.BytesToString(k.Keeper.GetAuthority())
	if err != nil {
		return nil, errorsmod.Wrap(types.ErrUnauthorized, "invalid module authority")
	}
	if msg.Authority != authStr {
		return nil, errorsmod.Wrap(types.ErrUnauthorized, "only module authority may set currency rates")
	}

	// Persist the provided rate
	rate := types.CurrencyRate{
		Currency:  msg.Currency,
		RateToKes: msg.RateToKes,
	}
	if err := k.Keeper.CurrencyRates.Set(ctx, msg.Currency, rate); err != nil {
		return nil, err
	}

	return &types.MsgSetCurrencyRateResponse{}, nil
}
