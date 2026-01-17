package sovereign

import (
	"cosmossdk.io/core/appmodule"
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/types/module"

	"github.com/tmp/marketplace/x/sovereign/keeper"
)

var _ appmodule.AppModule = (*AppModule)(nil)

type AppModule struct {
	cdc    codec.Codec
	keeper keeper.Keeper
}

func NewAppModule(cdc codec.Codec, k keeper.Keeper) AppModule {
	return AppModule{cdc: cdc, keeper: k}
}

func (AppModule) IsAppModule() {}

func (AppModule) Name() string { return "sovereign" }

func (am AppModule) RegisterServices(_ module.Configurator) {}
