package types

import (
	"encoding/json"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

// Implement sdk.Msg on the generated proto message types.
func (m *MsgCreateMultisig) Route() string { return ModuleName }
func (m *MsgCreateMultisig) Type() string  { return "create_multisig" }
func (m *MsgCreateMultisig) GetSigners() []sdk.AccAddress {
	if m.Creator == "" {
		return []sdk.AccAddress{}
	}
	addr, err := sdk.AccAddressFromBech32(m.Creator)
	if err != nil {
		return []sdk.AccAddress{}
	}
	return []sdk.AccAddress{addr}
}
func (m *MsgCreateMultisig) GetSignBytes() []byte {
	bz, _ := json.Marshal(m)
	return sdk.MustSortJSON(bz)
}
func (m *MsgCreateMultisig) ValidateBasic() error { return nil }

func (m *MsgScheduleDisbursement) Route() string { return ModuleName }
func (m *MsgScheduleDisbursement) Type() string  { return "schedule_disbursement" }
func (m *MsgScheduleDisbursement) GetSigners() []sdk.AccAddress {
	if m.From == "" {
		return []sdk.AccAddress{}
	}
	addr, err := sdk.AccAddressFromBech32(m.From)
	if err != nil {
		return []sdk.AccAddress{}
	}
	return []sdk.AccAddress{addr}
}
func (m *MsgScheduleDisbursement) GetSignBytes() []byte {
	bz, _ := json.Marshal(m)
	return sdk.MustSortJSON(bz)
}
func (m *MsgScheduleDisbursement) ValidateBasic() error { return nil }

func (m *MsgApproveDisbursement) Route() string { return ModuleName }
func (m *MsgApproveDisbursement) Type() string  { return "approve_disbursement" }
func (m *MsgApproveDisbursement) GetSigners() []sdk.AccAddress {
	if m.Approver == "" {
		return []sdk.AccAddress{}
	}
	addr, err := sdk.AccAddressFromBech32(m.Approver)
	if err != nil {
		return []sdk.AccAddress{}
	}
	return []sdk.AccAddress{addr}
}
func (m *MsgApproveDisbursement) GetSignBytes() []byte {
	bz, _ := json.Marshal(m)
	return sdk.MustSortJSON(bz)
}
func (m *MsgApproveDisbursement) ValidateBasic() error { return nil }
