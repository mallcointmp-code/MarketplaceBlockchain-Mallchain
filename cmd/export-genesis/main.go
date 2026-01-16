package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/tmp/marketplace/x/mlcoin/types"
)

func main() {
	gen := types.DefaultGenesis()
	b, err := json.MarshalIndent(gen, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "marshal failed: %v\n", err)
		os.Exit(1)
	}

	if err := os.MkdirAll("build", 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "mkdir failed: %v\n", err)
		os.Exit(1)
	}

	if err := os.WriteFile("build/genesis.json", b, 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "write failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("wrote build/genesis.json")
}
