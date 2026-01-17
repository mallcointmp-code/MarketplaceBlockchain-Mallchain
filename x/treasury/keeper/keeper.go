package keeper

import (
	"encoding/json"
	"fmt"
	"time"

	corestore "cosmossdk.io/core/store"
	math "cosmossdk.io/math"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tmp/marketplace/x/treasury/types"
)

// Keeper manages treasury state.
type Keeper struct {
	storeService corestore.KVStoreService
	cdc          codec.Codec
	bankKeeper   types.BankKeeper
	moduleName   string
}

// NewKeeper constructs a treasury keeper.
func NewKeeper(storeService corestore.KVStoreService, cdc codec.Codec) Keeper {
	return Keeper{storeService: storeService, cdc: cdc}
}

// NewKeeperWithBank constructs a treasury keeper with bank injection and module account name.
func NewKeeperWithBank(storeService corestore.KVStoreService, cdc codec.Codec, bk types.BankKeeper, moduleName string) Keeper {
	return Keeper{storeService: storeService, cdc: cdc, bankKeeper: bk, moduleName: moduleName}
}

func (k Keeper) kvStore(ctx sdk.Context) (corestore.KVStore, error) {
	return k.storeService.OpenKVStore(ctx), nil
}

// CreateMultisig creates and stores a multisig wallet
func (k Keeper) CreateMultisig(ctx sdk.Context, m types.MultisigWallet) error {
	s, err := k.kvStore(ctx)
	if err != nil {
		return err
	}
	key := []byte(types.MultisigPrefix + m.Index)
	b, err := json.Marshal(m)
	if err != nil {
		return err
	}
	return s.Set(key, b)
}

func (k Keeper) GetMultisig(ctx sdk.Context, index string) (*types.MultisigWallet, error) {
	s, err := k.kvStore(ctx)
	if err != nil {
		return nil, err
	}
	b, err := s.Get([]byte(types.MultisigPrefix + index))
	if err != nil {
		return nil, err
	}
	if len(b) == 0 {
		return nil, nil
	}
	var m types.MultisigWallet
	if err := json.Unmarshal(b, &m); err != nil {
		return nil, err
	}
	return &m, nil
}

// ScheduleDisbursement stores a future disbursement
func (k Keeper) ScheduleDisbursement(ctx sdk.Context, d types.Disbursement) error {
	s, err := k.kvStore(ctx)
	if err != nil {
		return err
	}
	key := []byte(types.DisbursementPrefix + d.Index)
	b, err := json.Marshal(d)
	if err != nil {
		return err
	}
	return s.Set(key, b)
}

func (k Keeper) GetDisbursement(ctx sdk.Context, index string) (*types.Disbursement, error) {
	s, err := k.kvStore(ctx)
	if err != nil {
		return nil, err
	}
	b, err := s.Get([]byte(types.DisbursementPrefix + index))
	if err != nil {
		return nil, err
	}
	if len(b) == 0 {
		return nil, nil
	}
	var d types.Disbursement
	if err := json.Unmarshal(b, &d); err != nil {
		return nil, err
	}
	return &d, nil
}

// ApproveDisbursement registers an approval by a member
func (k Keeper) ApproveDisbursement(ctx sdk.Context, disbIndex, approver string) error {
	d, err := k.GetDisbursement(ctx, disbIndex)
	if err != nil {
		return err
	}
	if d == nil {
		return fmt.Errorf("disbursement not found: %s", disbIndex)
	}
	// check already approved
	for _, a := range d.Approvals {
		if a == approver {
			return nil
		}
	}
	d.Approvals = append(d.Approvals, approver)
	return k.ScheduleDisbursement(ctx, *d)
}

// ExecuteDueDisbursements runs due disbursements whose approvals meet threshold.
// It returns the list of executed disbursement indexes.
func (k Keeper) ExecuteDueDisbursements(ctx sdk.Context, now time.Time) ([]string, error) {
	s, err := k.kvStore(ctx)
	if err != nil {
		return nil, err
	}
	it, _ := s.Iterator(nil, nil)
	if it != nil {
		defer it.Close()
	}
	var executed []string
	for it.Valid() {
		key := string(it.Key())
		if !startsWith(key, types.DisbursementPrefix) {
			it.Next()
			continue
		}
		var d types.Disbursement
		if err := json.Unmarshal(it.Value(), &d); err != nil {
			it.Next()
			continue
		}
		if d.Executed {
			it.Next()
			continue
		}
		if now.Before(d.ReleaseAt) {
			it.Next()
			continue
		}
		// load multisig to check threshold
		m, err := k.GetMultisig(ctx, d.From)
		if err != nil || m == nil {
			it.Next()
			continue
		}
		if uint32(len(d.Approvals)) >= m.Threshold {
			// perform transfer if bank keeper is available
			if k.bankKeeper != nil {
				// convert recipient
				acc, err := sdk.AccAddressFromBech32(d.To)
				if err != nil {
					return executed, fmt.Errorf("invalid recipient address %s: %w", d.To, err)
				}
				coins := sdk.NewCoins(sdk.NewCoin(sdk.DefaultBondDenom, math.NewInt(int64(d.Amount))))
				if err := k.bankKeeper.SendCoinsFromModuleToAccount(ctx, k.moduleName, acc, coins); err != nil {
					return executed, fmt.Errorf("failed to send coins for disbursement %s: %w", d.Index, err)
				}
			}

			// mark executed
			d.Executed = true
			if err := k.ScheduleDisbursement(ctx, d); err != nil {
				return executed, err
			}
			executed = append(executed, d.Index)
		}
		it.Next()
	}
	return executed, nil
}

func startsWith(s, pref string) bool {
	if len(s) < len(pref) {
		return false
	}
	return s[:len(pref)] == pref
}
