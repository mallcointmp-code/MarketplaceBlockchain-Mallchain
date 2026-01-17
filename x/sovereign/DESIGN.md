# Sovereign Time-Locked Wallets — Design

Purpose
- Increase trust by making founder/team/treasury funds time-locked and transparent.
- Enforce transfer caps for the founder for phased vesting.

Overview
- New on-chain module `x/sovereign` that tracks time locks and transfer caps for special addresses.
- Locks prevent sending tokens (MsgSend and other transfer Msgs) until unlock time, and optionally apply transfer caps for a period after unlock.

Key Concepts
- Lock record (per address):
  - Address: string (bech32)
  - UnlockAt: int64 (unix seconds)
  - CapSchedule: optional schedule details (see Founder special-case)
  - Exempt: bool (for future governance overrides)

Defaults / Rules
- All designated sovereign addresses (founder, team, treasury) must have locks with duration between 7 and 90 days.
- Founder special-case:
  - Immediate mandatory lock of 239 days from genesis (or from lock creation if applied later).
  - After 239 days (when unlocked), the founder may transfer up to 40_000_000 Mallcoins for a period of 5 years.
  - After the 5-year cap period elapses, the remaining 120_000_000 Mallcoins become freely transferable.
  - Implementation detail: the cap is enforced as a rolling remaining-cap counter for the 5-year window starting at UnlockAt.

Storage Model
- KVStore prefix: `sovereign/lock/` + address -> `Lock` protobuf message.
- Genesis: `SovereignGenesis { locks: [Lock] }` to seed founder/team/treasury entries.

Protobuf types (sketch)

message Lock {
  string address = 1;
  int64 unlock_at = 2; // unix seconds
  FounderCap founder_cap = 3; // optional
  bool exempt = 4;
}

message FounderCap {
  uint64 total_cap = 1;       // 160_000_000 (example), entire allocation monitored
  uint64 initial_transfer_cap = 2; // 40_000_000 available in first 5 years
  int64 cap_start = 3; // unlock time
  int64 cap_end = 4; // cap_start + 5 years
}

Genesis
- `SovereignGenesis` includes `locks` for founder/team/treasury with unlock times and founder_cap set for founder address (239-day lock + cap schedule).

APIs
- gRPC Query service
  - `QueryLock(address) -> Lock` (returns unlock timestamp and cap info)
  - `ListLocks() -> []Lock` (pagination)
  - `QueryRemainingCap(address) -> uint64` (for founder cap remaining amount and remaining period)

- CLI commands
  - `marketplaced query sovereign lock <addr>`
  - `marketplaced tx sovereign set-lock <addr> <unlock-at>` (governance use / admin)

Enforcement
- AnteDecorator `SovereignLockDecorator` (runs before other ante checks):
  - For each signer in tx:
    - If signer has a `Lock` and now < UnlockAt: reject tx with descriptive error.
    - If signer has `FounderCap` and current time in [cap_start, cap_end]: enforce that cumulative transfers from that address during cap window do not exceed `initial_transfer_cap`.
      - Implementation for tracking cumulative transfers:
        - Store `sovereign/transfers/<addr>/<window_start>` -> uint64 transferred.
        - On each MsgSend that moves coins out from signer, compute amount (sdk.Coins), convert to canonical smallest unit and increment stored counter atomically.
        - Reject tx if new total > cap.
    - After `cap_end`, cap removed and full amount becomes transferable.

Edge cases & notes
- Multiple Msgs in same tx: sum total outgoing amounts before checking cap.
- Token denominations: cap specified in Mallcoins (MLCN) native denom; convert to `sdk.Coin` amounts and only count transfers of that denom.
- Governance overrides: add messages or allow a governance module to modify or remove locks in emergencies.

Acceptance criteria
- `x/sovereign` module added with keeper, types (proto), genesis init/export, and queries.
- `SovereignLockDecorator` wired into `app/app.go` ante chain and rejects locked signers.
- Founder lock seeded in genesis with 239-day lock and cap schedule (40M for 5 years), and tests showing enforcement.
- CLI query command shows remaining countdown and cap remaining value.

Implementation plan (step-by-step)
1. Add `x/sovereign` module skeleton with `types/`, `keeper/`, `client/cli/`, `module/` and `module/depinject.go`.
2. Add protobuf definitions for `Lock`, `FounderCap`, and `SovereignGenesis` under `proto/sovereign/` and add to `proto/buf.gen.gogo.yaml` generation targets.
3. Implement keeper methods: `GetLock(ctx, addr)`, `SetLock(ctx, Lock)`, `IncrementTransferred(ctx, addr, amount)`, `GetTransferred(ctx, addr, windowStart)`.
4. Implement ante decorator `SovereignLockDecorator` and wire into `app/app.go` ante chain (place early).
5. Add genesis initialization: set founder/team/treasury locks.
6. Add queries and CLI command for querying locks and remaining cap.
7. Add unit tests for keeper and ante decorator and an E2E test that seeds genesis with the founder lock and demonstrates capped transfers.
8. Add docs and release notes.

Work items to start next
- Create `x/sovereign` design file (this file).
- Implement proto types and run codegen.
- Implement keeper + queries.

Timeline estimate (rough)
- Design & proto: 1-2 hours
- Keeper + queries + tests (unit): 3-5 hours
- Ante decorator + app wiring + E2E test: 3-6 hours
- CLI + docs + polishing: 1-2 hours


