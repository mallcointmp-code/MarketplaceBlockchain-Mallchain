package keeper_test

import (
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tmp/marketplace/x/mlcoin/keeper"
	"github.com/tmp/marketplace/x/mlcoin/types"
)

func TestScarcityCountersAndScale(t *testing.T) {
	f := initFixture(t)

	// increment counters
	if err := f.keeper.IncActiveWallets(f.ctx, 100); err != nil {
		t.Fatalf("inc active wallets: %v", err)
	}
	if err := f.keeper.IncSettlementVolume(f.ctx, 1000); err != nil {
		t.Fatalf("inc settlement volume: %v", err)
	}
	if err := f.keeper.IncOrderCount(f.ctx, 10); err != nil {
		t.Fatalf("inc order count: %v", err)
	}

	// compute and store scale via sdk context
	sdkCtx := sdk.UnwrapSDKContext(f.ctx)
	if err := f.keeper.ComputeAndStoreScarcityScale(sdkCtx); err != nil {
		t.Fatalf("compute scale: %v", err)
	}

	// verify stored scale equals expected
	metrics, err := f.keeper.GetScarcityMetrics(f.ctx)
	if err != nil {
		t.Fatalf("get metrics: %v", err)
	}
	want := keeper.ComputeEmissionScaleFromMetrics(types.DefaultScarcityParams(), metrics)

	got, err := f.keeper.GetCurrentScarcityScale(f.ctx)
	if err != nil {
		t.Fatalf("get current scale: %v", err)
	}
	if got != want {
		t.Fatalf("scale mismatch: got %d want %d", got, want)
	}
}

// Removed stray code fences
