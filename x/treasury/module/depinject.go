package module

import (
	"cosmossdk.io/core/address"
	"cosmossdk.io/core/appmodule"
	"cosmossdk.io/core/store"
	"cosmossdk.io/depinject"
	"github.com/cosmos/cosmos-sdk/codec"

	"github.com/tmp/marketplace/x/treasury/keeper"
	"github.com/tmp/marketplace/x/treasury/types"
)

// Note: not registering a module config via appconfig.Register to avoid
// requiring a generated proto Module type. The provider `ProvideModule`
// is still available for depinject wiring when the module package is imported.

type ModuleInputs struct {
	depinject.In

	Config       *types.Module
	StoreService store.KVStoreService
	Cdc          codec.Codec
	AddressCodec address.Codec

	BankKeeper types.BankKeeper
}

type ModuleOutputs struct {
	depinject.Out

	TreasuryKeeper keeper.Keeper
	Module         appmodule.AppModule
}

func ProvideModule(in ModuleInputs) ModuleOutputs {
	moduleName := types.ModuleName
	k := keeper.NewKeeperWithBank(in.StoreService, in.Cdc, in.BankKeeper, moduleName)
	m := AppModule{}
	return ModuleOutputs{TreasuryKeeper: k, Module: m}
}
