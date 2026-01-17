package module

import (
	"context"
	"encoding/json"

	"cosmossdk.io/core/appmodule"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	"github.com/grpc-ecosystem/grpc-gateway/runtime"
	"google.golang.org/grpc"

	"github.com/tmp/marketplace/x/treasury/keeper"
	"github.com/tmp/marketplace/x/treasury/types"
)

var (
	_ module.AppModule    = (*AppModule)(nil)
	_ appmodule.AppModule = (*AppModule)(nil)
)

// AppModule holds module-level dependencies.
type AppModule struct{ K keeper.Keeper }

func (AppModule) IsAppModule() {}

// IsOnePerModuleType implements the depinject.OnePerModuleType interface.
func (AppModule) IsOnePerModuleType() {}

func (AppModule) Name() string { return "treasury" }

func (AppModule) RegisterLegacyAminoCodec(*codec.LegacyAmino) {}

func (AppModule) RegisterGRPCGatewayRoutes(clientCtx client.Context, mux *runtime.ServeMux) {}

func (AppModule) RegisterInterfaces(registrar codectypes.InterfaceRegistry) {}

// RegisterServices registers the Msg service with the application's gRPC registrar.
func (am AppModule) RegisterServices(registrar grpc.ServiceRegistrar) error {
	types.RegisterMsgServer(registrar, keeper.NewMsgServer(am.K))
	return nil
}

func (AppModule) DefaultGenesis(codec.JSONCodec) json.RawMessage { return nil }

func (AppModule) ValidateGenesis(codec.JSONCodec, client.TxEncodingConfig, json.RawMessage) error {
	return nil
}

func (AppModule) InitGenesis(ctx context.Context, _ codec.JSONCodec, _ json.RawMessage) {}

func (AppModule) ExportGenesis(ctx context.Context, _ codec.JSONCodec) json.RawMessage { return nil }

func (AppModule) ConsensusVersion() uint64 { return 1 }

func (AppModule) BeginBlock(_ context.Context) error { return nil }

func (AppModule) EndBlock(_ context.Context) error { return nil }
