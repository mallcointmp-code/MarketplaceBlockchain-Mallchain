package sovereign

import (
	"cosmossdk.io/core/appmodule"
	"cosmossdk.io/core/store"
	"cosmossdk.io/depinject"
	"github.com/cosmos/cosmos-sdk/codec"

	"github.com/tmp/marketplace/x/sovereign/keeper"
)

var _ depinject.OnePerModuleType = AppModule{}

func (AppModule) IsOnePerModuleType() {}

type ModuleInputs struct {
	depinject.In

	StoreService store.KVStoreService
	Cdc          codec.Codec
}

type ModuleOutputs struct {
	depinject.Out

	SovereignKeeper keeper.Keeper
	Module          appmodule.AppModule
}

func ProvideModule(in ModuleInputs) ModuleOutputs {
	k := keeper.NewKeeper(in.StoreService)
	m := NewAppModule(in.Cdc, k)
	return ModuleOutputs{SovereignKeeper: k, Module: m}
}
