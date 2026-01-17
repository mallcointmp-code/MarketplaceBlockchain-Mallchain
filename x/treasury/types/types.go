package types

import "time"

// MultisigWallet holds information about a multisig treasury wallet.
type MultisigWallet struct {
	Index     string   `json:"index"`
	Members   []string `json:"members"`
	Threshold uint32   `json:"threshold"`
	Balance   uint64   `json:"balance"`
}

// Disbursement represents a scheduled transfer from a multisig wallet.
type Disbursement struct {
	Index     string    `json:"index"`
	From      string    `json:"from"`
	To        string    `json:"to"`
	Amount    uint64    `json:"amount"`
	ReleaseAt time.Time `json:"release_at"`
	Approvals []string  `json:"approvals"`
	Executed  bool      `json:"executed"`
}
