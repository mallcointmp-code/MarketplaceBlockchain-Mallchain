package main

import (
	"fmt"
	"os"

	clienthelpers "cosmossdk.io/client/v2/helpers"
	svrcmd "github.com/cosmos/cosmos-sdk/server/cmd"

	"github.com/tmp/marketplace/app"
	"github.com/tmp/marketplace/cmd/marketplaced/cmd"
	_ "github.com/tmp/marketplace/x/vault/module"
	types "github.com/tmp/marketplace/x/vault/types"
)

func main() {
	if err := types.RegisterDescriptor(); err != nil {
		fmt.Fprintln(os.Stderr, "warning: failed to register vault proto descriptor:", err)
	}
	rootCmd := cmd.NewRootCmd()
	if err := svrcmd.Execute(rootCmd, clienthelpers.EnvPrefix, app.DefaultNodeHome); err != nil {
		fmt.Fprintln(rootCmd.OutOrStderr(), err)
		os.Exit(1)
	}
}
