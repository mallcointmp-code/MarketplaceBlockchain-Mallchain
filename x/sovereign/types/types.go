package types

import "time"

// Lock stores a time-locked restriction for an address.
type Lock struct {
	Address  string      `json:"address"`
	UnlockAt time.Time   `json:"unlock_at"`
	Founder  *FounderCap `json:"founder,omitempty"`
	Exempt   bool        `json:"exempt"`
}

// FounderCap describes founder phased cap schedule.
type FounderCap struct {
	TotalCap           uint64    `json:"total_cap"`
	InitialTransferCap uint64    `json:"initial_transfer_cap"`
	CapStart           time.Time `json:"cap_start"`
	CapEnd             time.Time `json:"cap_end"`
}
