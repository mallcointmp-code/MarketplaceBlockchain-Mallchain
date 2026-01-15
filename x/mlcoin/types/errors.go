package types

// DONTCOVER

import (
	"cosmossdk.io/errors"
)

// x/mlcoin module sentinel errors
var (
	ErrInvalidSigner       = errors.Register(ModuleName, 1100, "expected gov account as only signer for proposal message")
	ErrWalletNotFound      = errors.Register(ModuleName, 1101, "wallet not found")
	ErrInsufficientBalance = errors.Register(ModuleName, 1102, "insufficient balance")
	ErrEmissionCapExceeded = errors.Register(ModuleName, 1103, "emission cap exceeded")
	ErrInvalidSupply       = errors.Register(ModuleName, 1104, "invalid supply amount")
	ErrDailyLimitExceeded  = errors.Register(ModuleName, 1105, "daily emission limit exceeded")
	ErrMonthlyCapExceeded  = errors.Register(ModuleName, 1106, "monthly emission cap exceeded")
	ErrSupplyExhausted     = errors.Register(ModuleName, 1107, "total supply exhausted")
	ErrTransactionNotFound = errors.Register(ModuleName, 1108, "transaction not found")
	ErrInvalidRequest      = errors.Register(ModuleName, 1109, "invalid request")
	ErrUnauthorized        = errors.Register(ModuleName, 1110, "unauthorized")
)
