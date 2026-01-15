package types

// DefaultBurnWallet represents the BurnWallet default value.
// TODO: Determine the default value.
var DefaultBurnWallet string = "burn_wallet"

// NewParams creates a new Params instance.
func NewParams(
	burnWallet string,
) Params {
	return Params{
		BurnWallet: burnWallet,
	}
}

// DefaultParams returns a default set of parameters.
func DefaultParams() Params {
	return NewParams(
		DefaultBurnWallet,
	)
}

// Validate validates the set of params.
func (p Params) Validate() error {
	if err := validateBurnWallet(p.BurnWallet); err != nil {
		return err
	}

	return nil
}

// validateBurnWallet validates the BurnWallet parameter.
func validateBurnWallet(v string) error {
	// TODO implement validation
	return nil
}
