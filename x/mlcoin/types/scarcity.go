package types

// ScarcityParams defines tunable parameters for the scarcity evaluator.
type ScarcityParams struct {
	// Weight for active wallets contribution (0..100)
	ActiveWalletsWeight uint32 `json:"active_wallets_weight"`
	// Weight for settlement volume contribution (0..100)
	SettlementVolumeWeight uint32 `json:"settlement_volume_weight"`
	// Weight for marketplace order count contribution (0..100)
	OrderCountWeight uint32 `json:"order_count_weight"`
	// Smoothing window in blocks for metrics aggregation
	WindowBlocks uint64 `json:"window_blocks"`
	// Minimum emission scale (0 = no emission, 100 = base emission)
	MinScalePercent uint32 `json:"min_scale_percent"`
	// Deflation epoch params
	DeflationEpoch DeflationEpochParams `json:"deflation_epoch"`
}

// DeflationEpochParams defines parameters for negative emission windows.
type DeflationEpochParams struct {
	// Enable deflation epoch mechanism
	Enabled bool `json:"enabled"`
	// Circulating supply threshold to trigger epoch (absolute units)
	CirculatingThreshold uint64 `json:"circulating_threshold"`
	// Volatility threshold (basis points: 1000 = 10%)
	VolatilityThresholdBps uint32 `json:"volatility_threshold_bps"`
	// Locked wallet accumulation rate threshold (units per block)
	LockedAccumulationRate uint64 `json:"locked_accumulation_rate"`
	// Duration of deflation epoch in blocks
	EpochDurationBlocks uint64 `json:"epoch_duration_blocks"`
	// Cooldown period before next epoch can trigger (blocks)
	CooldownBlocks uint64 `json:"cooldown_blocks"`
}

// ScarcityMetrics stores aggregated metrics used to compute scarcity.
type ScarcityMetrics struct {
	// Count of active wallets observed in the window
	ActiveWallets uint64 `json:"active_wallets"`
	// Sum of settlement volume (raw units) in the window
	SettlementVolume uint64 `json:"settlement_volume"`
	// Count of marketplace orders in the window
	OrderCount uint64 `json:"order_count"`
	// LastUpdated block height
	LastUpdated uint64 `json:"last_updated"`
}

// DeflationEpochState tracks active deflation epoch status.
type DeflationEpochState struct {
	// Active indicates if we're in a deflation epoch
	Active bool `json:"active"`
	// StartHeight is the block when epoch began
	StartHeight uint64 `json:"start_height"`
	// EndHeight is when epoch ends
	EndHeight uint64 `json:"end_height"`
	// LastEpochEnd tracks when the last epoch ended (for cooldown)
	LastEpochEnd uint64 `json:"last_epoch_end"`
	// TriggerReason describes why epoch was triggered
	TriggerReason string `json:"trigger_reason"`
}

// DefaultScarcityParams returns sane defaults.
func DefaultScarcityParams() ScarcityParams {
	return ScarcityParams{
		ActiveWalletsWeight:    40,
		SettlementVolumeWeight: 40,
		OrderCountWeight:       20,
		WindowBlocks:           6_000, // approximate daily window (assuming ~14s blocks)
		MinScalePercent:        10,    // never scale below 10% of base emission
		DeflationEpoch: DeflationEpochParams{
			Enabled:                true,
			CirculatingThreshold:   10_000_000_000_000, // 10T units
			VolatilityThresholdBps: 2000,               // 20% volatility
			LockedAccumulationRate: 1_000_000,          // 1M units/block
			EpochDurationBlocks:    43_200,             // ~7 days (14s blocks)
			CooldownBlocks:         21_600,             // ~3.5 days cooldown
		},
	}
}
