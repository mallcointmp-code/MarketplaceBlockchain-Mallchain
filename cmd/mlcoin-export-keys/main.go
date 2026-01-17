package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"os"

	"github.com/cosmos/cosmos-sdk/crypto/keys/ed25519"
	"github.com/tmp/marketplace/x/mlcoin/types"
)

func main() {
	fs := flag.NewFlagSet("mlcoin-export-keys", flag.ExitOnError)
	printOnly := fs.Bool("print-only", false, "If set, only prints what would be done")
	genesisPath := fs.String("genesis", "build/genesis.json", "path to genesis json to read wallets from")
	fs.Parse(flag.CommandLine.Args())

	if *printOnly {
		fmt.Println("print-only mode: no on-chain changes will be made")
	}

	// If a genesis file exists, read wallet entries from it and generate keys locally.
	f, err := os.Open(*genesisPath)
	if err != nil {
		log.Fatalf("failed to open genesis file %s: %v", *genesisPath, err)
	}
	defer f.Close()

	b, err := io.ReadAll(f)
	if err != nil {
		log.Fatalf("read failed: %v", err)
	}

	var gen types.GenesisState
	if err := json.Unmarshal(b, &gen); err != nil {
		log.Fatalf("failed to unmarshal genesis: %v", err)
	}

	for _, w := range gen.WalletBalanceMap {
		priv := ed25519.GenPrivKey()
		privHex := fmt.Sprintf("%x", priv.Bytes())
		pub := priv.PubKey()
		newAddr := pub.Address()
		fmt.Printf("IDX=%s OLD=%s NEW=%s PRIV=%s\n", w.Index, w.Address, newAddr.String(), privHex)
	}
}
