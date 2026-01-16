package types

import "cosmossdk.io/collections"

const (
	// ModuleName defines the module name
	ModuleName = "mlcoin"

	// StoreKey defines the primary module store key
	StoreKey = ModuleName

	// GovModuleName duplicates the gov module's name to avoid a dependency with x/gov.
	// It should be synced with the gov module's name if it is ever changed.
	// See: https://github.com/cosmos/cosmos-sdk/blob/v0.52.0-beta.2/x/gov/types/keys.go#L9
	GovModuleName = "gov"
)

// ParamsKey is the prefix to retrieve all Params
var ParamsKey = collections.NewPrefix("p_mlcoin")

var (
	EmissionStateKey    = collections.NewPrefix("emissionState/value/")
	TransactionKey      = collections.NewPrefix("transaction/value/")
	TransactionCountKey = collections.NewPrefix("transaction/count/")
	MarketPriceKey      = collections.NewPrefix("marketPrice/value/")
	KesBalanceKey       = collections.NewPrefix("kesBalance/value/")
	TradeHistoryKey     = collections.NewPrefix("tradeHistory/value/")
	CurrencyRateKey     = collections.NewPrefix("currencyRate/value/")
	// Scarcity-related keys
	ScarcityParamsKey           = collections.NewPrefix("scarcity/params/")
	ScarcityMetricsKey          = collections.NewPrefix("scarcity/metrics/")
	ScarcityActiveWalletsKey    = collections.NewPrefix("scarcity/active_wallets/")
	ScarcitySettlementVolumeKey = collections.NewPrefix("scarcity/settlement_volume/")
	ScarcityOrderCountKey       = collections.NewPrefix("scarcity/order_count/")
	ScarcityCurrentScaleKey     = collections.NewPrefix("scarcity/current_scale/")
)
