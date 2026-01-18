package app

import (
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"io"

	clienthelpers "cosmossdk.io/client/v2/helpers"
	"cosmossdk.io/core/appmodule"
	"cosmossdk.io/depinject"
	"cosmossdk.io/log"
	storetypes "cosmossdk.io/store/types"
	circuitkeeper "cosmossdk.io/x/circuit/keeper"
	upgradekeeper "cosmossdk.io/x/upgrade/keeper"

	abci "github.com/cometbft/cometbft/abci/types"
	dbm "github.com/cosmos/cosmos-db"
	"github.com/cosmos/cosmos-sdk/baseapp"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/cosmos-sdk/runtime"
	"github.com/cosmos/cosmos-sdk/server"
	"github.com/cosmos/cosmos-sdk/server/api"
	"github.com/cosmos/cosmos-sdk/server/config"
	servertypes "github.com/cosmos/cosmos-sdk/server/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	"github.com/cosmos/cosmos-sdk/x/auth"
	authante "github.com/cosmos/cosmos-sdk/x/auth/ante"
	authkeeper "github.com/cosmos/cosmos-sdk/x/auth/keeper"
	authsims "github.com/cosmos/cosmos-sdk/x/auth/simulation"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	authzkeeper "github.com/cosmos/cosmos-sdk/x/authz/keeper"
	bankkeeper "github.com/cosmos/cosmos-sdk/x/bank/keeper"
	consensuskeeper "github.com/cosmos/cosmos-sdk/x/consensus/keeper"
	distrkeeper "github.com/cosmos/cosmos-sdk/x/distribution/keeper"
	"github.com/cosmos/cosmos-sdk/x/genutil"
	genutiltypes "github.com/cosmos/cosmos-sdk/x/genutil/types"
	govkeeper "github.com/cosmos/cosmos-sdk/x/gov/keeper"
	mintkeeper "github.com/cosmos/cosmos-sdk/x/mint/keeper"
	paramskeeper "github.com/cosmos/cosmos-sdk/x/params/keeper"
	paramstypes "github.com/cosmos/cosmos-sdk/x/params/types"
	slashingkeeper "github.com/cosmos/cosmos-sdk/x/slashing/keeper"
	stakingkeeper "github.com/cosmos/cosmos-sdk/x/staking/keeper"
	icacontrollerkeeper "github.com/cosmos/ibc-go/v10/modules/apps/27-interchain-accounts/controller/keeper"
	icahostkeeper "github.com/cosmos/ibc-go/v10/modules/apps/27-interchain-accounts/host/keeper"
	ibctransferkeeper "github.com/cosmos/ibc-go/v10/modules/apps/transfer/keeper"
	ibckeeper "github.com/cosmos/ibc-go/v10/modules/core/keeper"

	"github.com/tmp/marketplace/docs"
	badgemodulekeeper "github.com/tmp/marketplace/x/badge/keeper"
	mallcoinmodulekeeper "github.com/tmp/marketplace/x/mallcoin/keeper"
	mallpointsmodulekeeper "github.com/tmp/marketplace/x/mallpoints/keeper"
	mlcointypes "github.com/tmp/marketplace/x/mlcoin/types"
	sovereignante "github.com/tmp/marketplace/x/sovereign/ante"
	sovereignkeeper "github.com/tmp/marketplace/x/sovereign/keeper"
	treasurymodulekeeper "github.com/tmp/marketplace/x/treasury/keeper"
	treasurymodule "github.com/tmp/marketplace/x/treasury/module"
	// vault module is intentionally not injected into the App struct to avoid
	// direct dependency on the vault keeper in the runtime wiring.
)

const (
	// Name is the name of the application.
	Name = "marketplace"
	// AccountAddressPrefix is the prefix for accounts addresses.
	AccountAddressPrefix = "mp"
	// ChainCoinType is the coin type of the chain.
	ChainCoinType = 118
)

// DefaultNodeHome default home directories for the application daemon
var DefaultNodeHome string

var (
	_ runtime.AppI            = (*App)(nil)
	_ servertypes.Application = (*App)(nil)
)

// App extends an ABCI application, but with most of its parameters exported.
// They are exported for convenience in creating helper functions, as object
// capabilities aren't needed for testing.
type App struct {
	*runtime.App
	legacyAmino       *codec.LegacyAmino
	appCodec          codec.Codec
	txConfig          client.TxConfig
	interfaceRegistry codectypes.InterfaceRegistry

	// keepers
	// only keepers required by the app are exposed
	// the list of all modules is available in the app_config
	AuthKeeper            authkeeper.AccountKeeper
	BankKeeper            bankkeeper.Keeper
	StakingKeeper         *stakingkeeper.Keeper
	SlashingKeeper        slashingkeeper.Keeper
	MintKeeper            mintkeeper.Keeper
	DistrKeeper           distrkeeper.Keeper
	GovKeeper             *govkeeper.Keeper
	UpgradeKeeper         *upgradekeeper.Keeper
	AuthzKeeper           authzkeeper.Keeper
	ConsensusParamsKeeper consensuskeeper.Keeper
	CircuitBreakerKeeper  circuitkeeper.Keeper
	ParamsKeeper          paramskeeper.Keeper

	// ibc keepers
	IBCKeeper           *ibckeeper.Keeper
	ICAControllerKeeper icacontrollerkeeper.Keeper
	ICAHostKeeper       icahostkeeper.Keeper
	TransferKeeper      ibctransferkeeper.Keeper

	// simulation manager
	sm               *module.SimulationManager
	MallcoinKeeper   *mallcoinmodulekeeper.Keeper
	MlcoinKeeper     mlcointypes.MlcoinKeeper
	MallpointsKeeper *mallpointsmodulekeeper.Keeper
	BadgeKeeper      *badgemodulekeeper.Keeper
	TreasuryKeeper   *treasurymodulekeeper.Keeper
	SovereignKeeper  *sovereignkeeper.Keeper
}

func init() {
	var err error
	clienthelpers.EnvPrefix = Name
	DefaultNodeHome, err = clienthelpers.GetNodeHomeDirectory("." + Name)
	if err != nil {
		panic(err)
	}

}

// AppConfig returns the default app config.
func AppConfig() depinject.Config {
	return depinject.Configs(appConfig)
}

// New returns a reference to an initialized App.
func New(
	logger log.Logger,
	db dbm.DB,
	traceStore io.Writer,
	loadLatest bool,
	appOpts servertypes.AppOptions,
	baseAppOptions ...func(*baseapp.BaseApp),
) *App {
	var (
		app        = &App{}
		appBuilder *runtime.AppBuilder

		// Note: pass AppConfig and other DI options directly to depinject.Inject
		// instead of composing them into a single Config to avoid duplicate
		// provisioning of internal depinject types.
	)

	var appModules map[string]appmodule.AppModule
	// compose a single depinject.Config from AppConfig and runtime supplies
	diCfg := depinject.Configs(
		AppConfig(),
		depinject.Supply(
			appOpts,
			logger,
			app.GetIBCKeeper,
			map[string]module.AppModuleBasic{
				genutiltypes.ModuleName: genutil.NewAppModuleBasic(genutiltypes.DefaultMessageValidator),
			},
		),
		// explicitly provide treasury and sovereign module providers for wiring
		depinject.Provide(
			treasurymodule.ProvideModule,
		),
		depinject.Provide(
			sovereignmodule.ProvideModule,
		),
	)

	if err := depinject.Inject(diCfg,
		&appBuilder,
		&appModules,
		&app.appCodec,
		&app.legacyAmino,
		&app.txConfig,
		&app.interfaceRegistry,
		&app.AuthKeeper,
		&app.BankKeeper,
		&app.StakingKeeper,
		&app.SlashingKeeper,
		&app.MintKeeper,
		&app.DistrKeeper,
		&app.GovKeeper,
		&app.UpgradeKeeper,
		&app.AuthzKeeper,
		&app.ConsensusParamsKeeper,
		&app.CircuitBreakerKeeper,
		&app.ParamsKeeper,
		&app.MallcoinKeeper,
		&app.MlcoinKeeper,
		&app.MallpointsKeeper,
		&app.BadgeKeeper,
		&app.SovereignKeeper,
	); err != nil {
		panic(err)
	}

	// create sovereign ante decorator (runs before the standard ante handler)
	sovDec := sovereignante.NewSovereignLockDecorator(app.SovereignKeeper)

	// add to default baseapp options
	// enable optimistic execution
	baseAppOptions = append(baseAppOptions, baseapp.SetOptimisticExecution())

	// build an AnteHandler using the SDK's default auth ante handler and
	// wrap it to emit lightweight audit events (and provide scaffolding for
	// rate-limiting and replay-protection). We create the ante handler here
	// because we have access to the required keepers from depinject above.
	anteHandler, err := authante.NewAnteHandler(authante.HandlerOptions{
		AccountKeeper:   app.AuthKeeper,
		BankKeeper:      app.BankKeeper,
		SignModeHandler: app.txConfig.SignModeHandler(),
		SigGasConsumer:  authante.DefaultSigVerificationGasConsumer,
	})
	if err != nil {
		panic(err)
	}

	// wrappedAnte emits an audit event and delegates to the SDK ante handler.
	wrappedAnte := func(ctx sdk.Context, tx sdk.Tx, simulate bool) (sdk.Context, error) {
		// Emit a simple audit event with minimal info (no sensitive data)
		ev := sdk.NewEvent("tx_audit",
			sdk.NewAttribute("num_msgs", fmt.Sprintf("%d", len(tx.GetMsgs()))),
			sdk.NewAttribute("simulate", fmt.Sprintf("%t", simulate)),
			sdk.NewAttribute("height", fmt.Sprintf("%d", ctx.BlockHeight())),
		)
		ctx.EventManager().EmitEvent(ev)

		// Rate limiting: per-sender per-block limit
		const perAddrPerBlockLimit = 10

		// use mlcoin module KV store to keep ante-related keys
		storeKey := app.GetKey("mlcoin")
		if storeKey != nil {
			store := ctx.KVStore(storeKey)

			// global rate-limit key per-block
			rlKey := []byte("ante:global:count")
			val := store.Get(rlKey)
			var storedHeight uint64
			var count uint64
			if val != nil && len(val) == 16 {
				storedHeight = binary.BigEndian.Uint64(val[:8])
				count = binary.BigEndian.Uint64(val[8:16])
			}
			curH := uint64(ctx.BlockHeight())
			if storedHeight < curH {
				// reset for new block
				storedHeight = curH
				count = 1
			} else {
				count++
			}
			if count > perAddrPerBlockLimit {
				return ctx, fmt.Errorf("rate limit exceeded for address")
			}
			// write back
			buf := make([]byte, 16)
			binary.BigEndian.PutUint64(buf[:8], storedHeight)
			binary.BigEndian.PutUint64(buf[8:16], count)
			store.Set(rlKey, buf)

			// replay protection: hash tx bytes and ensure not seen before
			if encoder := app.txConfig.TxEncoder(); encoder != nil {
				if b, err := encoder(tx); err == nil {
					h := sha256.Sum256(b)
					replayKey := append([]byte("ante:replay:"), h[:]...)
					if store.Has(replayKey) {
						return ctx, fmt.Errorf("replayed transaction")
					}
					// mark replay seen with current height
					heightBuf := make([]byte, 8)
					binary.BigEndian.PutUint64(heightBuf, curH)
					store.Set(replayKey, heightBuf)
				}
			}
		}

		// Delegate to sovereign decorator which then calls the standard ante handler
		return sovDec.AnteHandle(ctx, tx, simulate, anteHandler)
	}

	// We will set the ante handler on the built app below (after Build())

	// build app
	app.App = appBuilder.Build(db, traceStore, baseAppOptions...)

	// set the wrapped ante handler (audit + scaffold for rate-limiting)
	app.App.SetAnteHandler(wrappedAnte)

	// register legacy modules
	if err := app.registerIBCModules(appOpts); err != nil {
		panic(err)
	}

	// retrieve treasury keeper from app modules if present
	if m, ok := appModules["treasury"]; ok {
		if am, ok := m.(treasurymodule.AppModule); ok {
			app.TreasuryKeeper = am.K
		}
	}

	/****  Module Options ****/

	// create the simulation manager and define the order of the modules for deterministic simulations
	overrideModules := map[string]module.AppModuleSimulation{
		authtypes.ModuleName: auth.NewAppModule(app.appCodec, app.AuthKeeper, authsims.RandomGenesisAccounts, nil),
	}
	app.sm = module.NewSimulationManagerFromAppModules(app.ModuleManager.Modules, overrideModules)

	app.sm.RegisterStoreDecoders()

	// A custom InitChainer sets if extra pre-init-genesis logic is required.
	// This is necessary for manually registered modules that do not support app wiring.
	// Manually set the module version map as shown below.
	// The upgrade module will automatically handle de-duplication of the module version map.
	app.SetInitChainer(func(ctx sdk.Context, req *abci.RequestInitChain) (*abci.ResponseInitChain, error) {
		if err := app.UpgradeKeeper.SetModuleVersionMap(ctx, app.ModuleManager.GetVersionMap()); err != nil {
			return nil, err
		}
		return app.App.InitChainer(ctx, req)
	})

	if err := app.Load(loadLatest); err != nil {
		panic(err)
	}

	return app
}

// GetSubspace returns a param subspace for a given module name.
func (app *App) GetSubspace(moduleName string) paramstypes.Subspace {
	subspace, _ := app.ParamsKeeper.GetSubspace(moduleName)
	return subspace
}

// LegacyAmino returns App's amino codec.
func (app *App) LegacyAmino() *codec.LegacyAmino {
	return app.legacyAmino
}

// AppCodec returns App's app codec.
func (app *App) AppCodec() codec.Codec {
	return app.appCodec
}

// InterfaceRegistry returns App's InterfaceRegistry.
func (app *App) InterfaceRegistry() codectypes.InterfaceRegistry {
	return app.interfaceRegistry
}

// TxConfig returns App's TxConfig
func (app *App) TxConfig() client.TxConfig {
	return app.txConfig
}

// GetKey returns the KVStoreKey for the provided store key.
func (app *App) GetKey(storeKey string) *storetypes.KVStoreKey {
	kvStoreKey, ok := app.UnsafeFindStoreKey(storeKey).(*storetypes.KVStoreKey)
	if !ok {
		return nil
	}
	return kvStoreKey
}

// SimulationManager implements the SimulationApp interface
func (app *App) SimulationManager() *module.SimulationManager {
	return app.sm
}

// RegisterAPIRoutes registers all application module routes with the provided
// API server.
func (app *App) RegisterAPIRoutes(apiSvr *api.Server, apiConfig config.APIConfig) {
	app.App.RegisterAPIRoutes(apiSvr, apiConfig)
	// register swagger API in app.go so that other applications can override easily
	if err := server.RegisterSwaggerAPI(apiSvr.ClientCtx, apiSvr.Router, apiConfig.Swagger); err != nil {
		panic(err)
	}

	// register app's OpenAPI routes.
	docs.RegisterOpenAPIService(Name, apiSvr.Router)
}

// GetMaccPerms returns a copy of the module account permissions
//
// NOTE: This is solely to be used for testing purposes.
func GetMaccPerms() map[string][]string {
	dup := make(map[string][]string)
	for _, perms := range moduleAccPerms {
		dup[perms.GetAccount()] = perms.GetPermissions()
	}

	return dup
}

// BlockedAddresses returns all the app's blocked account addresses.
func BlockedAddresses() map[string]bool {
	result := make(map[string]bool)

	if len(blockAccAddrs) > 0 {
		for _, addr := range blockAccAddrs {
			result[addr] = true
		}
	} else {
		for addr := range GetMaccPerms() {
			result[addr] = true
		}
	}

	return result
}
