package types

// SettlementParams configures multi-tier settlement behavior.
type SettlementParams struct {
    Enabled            bool   `json:"enabled"`
    LargeThreshold     uint64 `json:"large_threshold"`     // amounts >= this are large transfers
    LargeDelayBlocks   uint64 `json:"large_delay_blocks"`   // delay before large transfers can be settled
    LargeRequiredSigs  uint32 `json:"large_required_sigs"`  // multisig confirmations required
}

// SettlementRequest represents a pending transfer awaiting settlement.
type SettlementRequest struct {
    Id           uint64 `json:"id"`
    From         string `json:"from"`
    To           string `json:"to"`
    Amount       uint64 `json:"amount"`
    EnqueueHeight uint64 `json:"enqueue_height"`
    UnlockHeight uint64 `json:"unlock_height"` // when it becomes eligible
    RequiredSigs uint32 `json:"required_sigs"`
    Confirmations uint32 `json:"confirmations"`
    Completed    bool   `json:"completed"`
}

// DefaultSettlementParams returns reasonable defaults.
func DefaultSettlementParams() SettlementParams {
    return SettlementParams{
        Enabled:           true,
        LargeThreshold:    10_000_000, // 10M units
        LargeDelayBlocks:  6_000,      // ~1 day
        LargeRequiredSigs: 2,
    }
}
