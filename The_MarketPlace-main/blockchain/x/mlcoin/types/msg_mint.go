package types

// MsgMintMallcoin defines a request to mint Mallcoin to a recipient by authority.
type MsgMintMallcoin struct {
	Authority string `json:"authority"`
	Recipient string `json:"recipient"`
	Amount    uint64 `json:"amount"`
}

type MsgMintMallcoinResponse struct {
	TxId string `json:"tx_id"`
}
