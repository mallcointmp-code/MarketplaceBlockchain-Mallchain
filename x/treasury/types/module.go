package types

// Module configuration for depinject/appconfig. Minimal placeholder compatible with other modules.
type Module struct {
	// Authority defines the custom module authority (optional).
	Authority string `json:"authority,omitempty"`
}

func (m *Module) Reset()         { *m = Module{} }
func (m *Module) String() string { return "treasury.Module" }
func (*Module) ProtoMessage()    {}
