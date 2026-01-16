package types

// SovereignLock stores lock info for a sovereign wallet.
type SovereignLock struct {
	Address      string `json:"address"`
	ExpiresAt    uint64 `json:"expires_at"`    // block height when funds unlock
	Duration     uint64 `json:"duration"`      // blocks locked for
	RegisteredAt uint64 `json:"registered_at"` // block height when registered
}

// Min/Max lock bounds in blocks (approx, assuming ~14s blocks)
const (
	SovereignMinLockBlocks uint64 = 43_200  // ~7 days
	SovereignMaxLockBlocks uint64 = 555_428 // ~90 days
)
