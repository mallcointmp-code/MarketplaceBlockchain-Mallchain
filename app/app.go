package app

import (
	"encoding/json"
	"fmt"
	"io"
	"reflect"

	sdkmath "cosmossdk.io/math"
	secp256k1 "github.com/cosmos/cosmos-sdk/crypto/keys/secp256k1"
	sims "github.com/cosmos/cosmos-sdk/testutil/sims"

	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"

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
	treasurymodulekeeper "github.com/tmp/marketplace/x/treasury/keeper"
	treasurymoduletypes "github.com/tmp/marketplace/x/treasury/types"
)

const (
	// Name is the name of the application.
	Name = "marketplace"
	// AccountAddressPrefix is the prefix for accounts addresses.
	AccountAddressPrefix = "cosmos"
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
	sm             *module.SimulationManager
	TreasuryKeeper treasurymoduletypes.TreasuryKeeper
}

// bankAdapter adapts the concrete bank keeper to the treasury module's
// expected BankKeeper interface in `x/treasury/types`.
type bankAdapter struct{ bk bankkeeper.Keeper }

func (a bankAdapter) SendCoinsFromModuleToAccount(ctx sdk.Context, senderModule string, recipient sdk.AccAddress, amt sdk.Coins) error {
	return a.bk.SendCoinsFromModuleToAccount(ctx, senderModule, recipient, amt)
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
	return depinject.Configs(
		appConfig,
		depinject.Supply(
			// supply custom module basics
			map[string]module.AppModuleBasic{
				genutiltypes.ModuleName: genutil.NewAppModuleBasic(genutiltypes.DefaultMessageValidator),
			},
		),
	)
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

		// merge the AppConfig and other configuration in one config
		appConfig = depinject.Configs(
			AppConfig(),
			depinject.Supply(
				appOpts, // supply app options
				logger,  // supply logger

				// Supply with IBC keeper getter for the IBC modules with App Wiring.
				// The IBC Keeper cannot be passed because it has not been initiated yet.
				// Passing the getter, the app IBC Keeper will always be accessible.
				// This needs to be removed after IBC supports App Wiring.
				app.GetIBCKeeper,

				// here alternative options can be supplied to the DI container.
				// those options can be used f.e to override the default behavior of some modules.
				// for instance supplying a custom address codec for not using bech32 addresses.
				// read the depinject documentation and depinject module wiring for more information
				// on available options and how to use them.
			),
		)
	)

	var appModules map[string]appmodule.AppModule
	if err := depinject.Inject(appConfig,
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
	); err != nil {
		panic(err)
	}

	// sanity checks to help debug DI wiring
	if appBuilder == nil {
		panic("depinject: appBuilder is nil after Inject; check module providers and appConfig")
	}

	// add to default baseapp options
	// enable optimistic execution
	baseAppOptions = append(baseAppOptions, baseapp.SetOptimisticExecution())

	// build app
	app.App = appBuilder.Build(db, traceStore, baseAppOptions...)

	if app.App == nil {
		panic("depinject: built runtime App is nil; module wiring may be incomplete")
	}

	// ensure underlying BaseApp was created
	if app.App.BaseApp == nil {
		panic("depinject: runtime App has nil BaseApp; runtime wiring incomplete")
	}

	// debug: report module manager state
	if app.ModuleManager == nil {
		fmt.Println("depinject: runtime App has nil ModuleManager")
	} else {
		fmt.Printf("depinject: runtime App ModuleManager has %d modules\n", len(app.ModuleManager.Modules))
	}

	for name := range app.ModuleManager.Modules {
		fmt.Println("depinject: module registered:", name)
	}

	// print mounted commit multi-store keys
	if cms := app.App.CommitMultiStore(); cms != nil {
		fmt.Println("depinject: mounted store keys:")
		if keyed, ok := cms.(interface {
			StoreKeysByName() map[string]storetypes.StoreKey
		}); ok {
			for name, sk := range keyed.StoreKeysByName() {
				ptr := uintptr(0)
				rv := reflect.ValueOf(sk)
				if rv.IsValid() {
					// underlying should be a pointer type
					if rv.Kind() == reflect.Ptr {
						ptr = rv.Pointer()
					}
				}
				fmt.Printf(" - %s (type=%T ptr=%#x)\n", name, sk, ptr)
			}

			// also print the pointer for the store key returned by UnsafeFindStoreKey for auth
			sk := app.UnsafeFindStoreKey(authtypes.StoreKey)
			if sk == nil {
				fmt.Println("depinject: UnsafeFindStoreKey returned nil for auth store key")
			} else {
				rv := reflect.ValueOf(sk)
				ptr := uintptr(0)
				if rv.IsValid() && rv.Kind() == reflect.Ptr {
					ptr = rv.Pointer()
				}
				fmt.Printf("depinject: UnsafeFindStoreKey(%s) -> type=%T ptr=%#x\n", authtypes.StoreKey, sk, ptr)
			}
		} else {
			fmt.Println("depinject: CommitMultiStore does not expose StoreKeysByName()")
		}
	} else {
		fmt.Println("depinject: CommitMultiStore is nil")
	}

	// MultiStore inspection moved later (after InitChain / module registration)

	// NOTE: genesis InitChain must run after loading the commit multi-store
	// to ensure the root commit stores are populated before any branched
	// CacheMultiStore is created. The actual InitChain call will be performed
	// after `app.Load(loadLatest)` below if the chain has no commits.

	// register legacy modules
	if err := app.registerIBCModules(appOpts); err != nil {
		panic(err)
	}

	// Ensure treasury keeper exists: some module wiring may not expose the keeper
	// directly into the app struct via depinject. In that case, construct it
	// here using a KVStoreService backed by the keyed store and the BankKeeper.
	if app.TreasuryKeeper == nil {
		storeSvc := runtime.NewKVStoreService(app.GetKey(treasurymoduletypes.StoreKey))
		adapter := bankAdapter{bk: app.BankKeeper}
		app.TreasuryKeeper = treasurymodulekeeper.NewKeeperWithBank(storeSvc, app.appCodec, adapter, treasurymoduletypes.ModuleName)
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

	// if DB is empty (no commits), initialize genesis so BaseApp volatile state is set
	if app.LastCommitID().Version == 0 {
		gen := appBuilder.DefaultGenesis()

		// create a minimal validator set and genesis account so staking init doesn't panic
		valSet, err := sims.CreateRandomValidatorSet()
		if err != nil {
			panic(err)
		}

		// create a genesis account with a large balance
		priv := secp256k1.GenPrivKey()
		pub := priv.PubKey()
		ba := authtypes.NewBaseAccount(pub.Address().Bytes(), pub, 0, 0)
		genAccs := []authtypes.GenesisAccount{ba}
		balances := []banktypes.Balance{{Address: ba.GetAddress().String(), Coins: sdk.NewCoins(sdk.NewCoin(sdk.DefaultBondDenom, sdkmath.NewInt(100000000000000)))}}

		genState, err := sims.GenesisStateWithValSet(app.appCodec, gen, valSet, genAccs, balances...)
		if err != nil {
			panic(err)
		}

		bz, err := json.Marshal(genState)
		if err != nil {
			panic(err)
		}

		if _, err := app.App.InitChain(&abci.RequestInitChain{AppStateBytes: bz}); err != nil {
			panic(err)
		}
	}

	// Now that modules are registered and state is loaded, create a context and inspect
	// the MultiStore internals (cachemulti) via reflection to compare the internal
	// store map keys with the StoreKeysByName() entries.
	if app.App != nil && app.App.BaseApp != nil {
		// safe to create context now
		ctx := app.App.BaseApp.NewContext(false)
		fmt.Println("depinject: inspecting MultiStore obtained from BaseApp.NewContext(false)")
		ms := ctx.MultiStore()
		rv := reflect.ValueOf(ms)
		if !rv.IsValid() {
			fmt.Println("depinject: MultiStore reflect.Value is invalid")
		} else {
			fmt.Printf("depinject: MultiStore reflect kind=%s type=%s\n", rv.Kind(), rv.Type())
			if rv.Kind() == reflect.Interface || rv.Kind() == reflect.Ptr {
				rv = rv.Elem()
			}
			if rv.IsValid() && rv.Kind() == reflect.Struct {
				rt := rv.Type()
				for i := 0; i < rv.NumField(); i++ {
					f := rv.Field(i)
					fname := rt.Field(i).Name
					fmt.Printf("depinject: MultiStore.field %s kind=%s type=%s\n", fname, f.Kind(), f.Type())
					if f.Kind() == reflect.Map {
						kt := f.Type().Key()
						fmt.Printf("depinject:  - map key type=%s len=%d\n", kt.String(), f.Len())
						if f.Len() > 0 {
							for _, k := range f.MapKeys() {
								ptr := uintptr(0)
								if k.Kind() == reflect.Ptr {
									ptr = k.Pointer()
								}
								fmt.Printf("depinject:    - map key type=%s kind=%s ptr=%#x\n", k.Type(), k.Kind(), ptr)
								// if this is the `keys` map (map[string]StoreKey) print the StoreKey value pointer too
								if k.Kind() == reflect.String {
									val := f.MapIndex(k)
									if val.IsValid() {
										// val should be an interface containing a StoreKey
										if val.Kind() == reflect.Interface || val.Kind() == reflect.Ptr {
											vv := val
											if vv.Kind() == reflect.Interface {
												vv = vv.Elem()
											}
											if vv.IsValid() && (vv.Kind() == reflect.Ptr) {
												fmt.Printf("depinject:      -> store key value type=%s ptr=%#x for name=%s\n", vv.Type(), vv.Pointer(), k.String())
											} else {
												fmt.Printf("depinject:      -> store key value type=%s kind=%s for name=%s\n", vv.Type(), vv.Kind(), k.String())
											}
										}
									}
								}
							}
						} else {
							fmt.Println("depinject:    - map is empty")
						}
					}
				}
			} else {
				fmt.Println("depinject: MultiStore is not a struct after deref; skipping field inspection")
			}
		}
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
