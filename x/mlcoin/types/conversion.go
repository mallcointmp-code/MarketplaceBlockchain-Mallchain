package types

// ConversionParams control conversion pressure absorbers.
type ConversionParams struct {
	Enabled          bool   `json:"enabled"`
	BaseFeeBps       uint32 `json:"base_fee_bps"`       // base conversion fee in bps
	MaxFeeBps        uint32 `json:"max_fee_bps"`        // maximum fee in bps under surge
	SurgeThreshold   uint64 `json:"surge_threshold"`    // volume threshold to consider surge
	QueueProcessRate uint32 `json:"queue_process_rate"` // number of queue entries processed per block
	BadgePriority    bool   `json:"badge_priority"`     // whether badge holders get priority
}

// ConversionRequest represents a user's request to convert Mallpoints -> Mallcoin
type ConversionRequest struct {
	Address       string `json:"address"`
	Amount        uint64 `json:"amount"`
	EnqueueHeight uint64 `json:"enqueue_height"`
	HasBadge      bool   `json:"has_badge"`
}

// DefaultConversionParams returns conservative defaults.
func DefaultConversionParams() ConversionParams {
	return ConversionParams{
		Enabled:          true,
		BaseFeeBps:       50,        // 0.50%
		MaxFeeBps:        1000,      // 10%
		SurgeThreshold:   1_000_000, // 1M units
		QueueProcessRate: 10,
		BadgePriority:    true,
	}
}
