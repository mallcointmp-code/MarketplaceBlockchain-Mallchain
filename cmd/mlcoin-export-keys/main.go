package main

import (
	"context"
	"flag"
	"fmt"
	"log"

	storetypes "cosmossdk.io/store/types"
	addresscodec "github.com/cosmos/cosmos-sdk/codec/address"
	"github.com/cosmos/cosmos-sdk/runtime"
	moduletestutil "github.com/cosmos/cosmos-sdk/types/module/testutil"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"

	"github.com/tmp/marketplace/x/mlcoin/keeper"
	module "github.com/tmp/marketplace/x/mlcoin/module"
	"github.com/tmp/marketplace/x/mlcoin/types"
)

func main() {
	fs := flag.NewFlagSet("mlcoin-export-keys", flag.ExitOnError)
	printOnly := fs.Bool("print-only", false, "If set, only prints what would be done")
	fs.Parse(flag.CommandLine.Args())

	storeKey := storetypes.NewKVStoreKey(types.StoreKey)
	storeService := runtime.NewKVStoreService(storeKey)

	encCfg := moduletestutil.MakeTestEncodingConfig(module.AppModule{})
	addressCodec := addresscodec.NewBech32Codec("cosmos")
	authority := authtypes.NewModuleAddress(types.GovModuleName)

	k := keeper.NewKeeper(
		storeService,
		encCfg.Codec,
		addressCodec,
		authority,
	)

	if *printOnly {
		fmt.Println("print-only mode: no on-chain changes will be made")
	}

	assigned, err := k.AssignKeysToAllWallets(context.Background())
	if err != nil {
		log.Fatalf("assign failed: %v", err)
	}

	for _, a := range assigned {
		fmt.Printf("OLD=%s NEW=%s PRIV=%s\n", a.OldAddress, a.NewAddress, a.PrivHex)
	}
}
