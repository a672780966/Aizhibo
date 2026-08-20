# DEV-010 REPORT

## Status

READY_FOR_REVIEW

## Implemented

- T001–T009 completed; `packages/persistence` created for the first time.
- `db.ts` opens `DatabaseSync` and idempotently creates exactly four authorized tables.
- `sessionStore.ts`, `eventStore.ts`, `snapshotStore.ts`, `recovery.ts`, `viewerState.ts`, and
  `health.ts` implement the requested persistence APIs.
- `runtime-kernel` only gained the additive `getPersistedSnapshot` and `restoreRuntimeMachine`
  exports. Restoration uses XState's native persisted snapshot option and reattaches injected Ports
  after start without exposing the persisted shape.
- LKG is write-through: callers append new events and save the full persisted snapshot at the same
  sequence. Event replay is left to DEV-011.

## Changed Files

```text
packages/persistence/package.json
packages/persistence/tsconfig.json
packages/persistence/src/db.ts
packages/persistence/src/db.test.ts
packages/persistence/src/sessionStore.ts
packages/persistence/src/sessionStore.test.ts
packages/persistence/src/eventStore.ts
packages/persistence/src/eventStore.test.ts
packages/persistence/src/snapshotStore.ts
packages/persistence/src/snapshotStore.test.ts
packages/persistence/src/recovery.ts
packages/persistence/src/recovery.test.ts
packages/persistence/src/viewerState.ts
packages/persistence/src/viewerState.test.ts
packages/persistence/src/health.ts
packages/persistence/src/health.test.ts
packages/persistence/src/index.ts
packages/runtime-kernel/src/machine.ts
packages/runtime-kernel/src/index.ts
tsconfig.json
pnpm-lock.yaml
specs/dev/DEV-010/INDEX.md
specs/dev/DEV-010/REQUIREMENTS.md
specs/dev/DEV-010/ACCEPTANCE.md
specs/dev/DEV-010/REPORT.md
specs/dev/DEV-010/DECISIONS.md
specs/comms/LEDGER.md
```

The `runtime-kernel` files contain additions only. No other package source, chapter fixture, or
read-only specification path was changed.

## Tests Executed

Commands were run in the required order after workspace installation:

| Command | Exit code | Result |
|---|---:|---|
| `pnpm install` | 0 | PASS; workspace recognized 9 projects, no new third-party dependency |
| `pnpm typecheck` | 0 | PASS; `tsc -b && tsc -b --noEmit` |
| `pnpm lint` | 0 | PASS; ESLint no errors/warnings |
| `pnpm format:check` | 0 | PASS; all files formatted |
| `pnpm build` | 0 | PASS; `tsc -b` |
| `pnpm test` | 0 | PASS; 77 test files / 405 tests |

The persistence recovery test uses a real runtime actor, real `node:sqlite` `:memory:` database,
write-through event/snapshot storage, and compares restored phases and the complete event log.

## Acceptance Results

| # | Result | Evidence |
|---|---|---|
| A01 | PASS | `pnpm install` exit code 0 |
| A02 | PASS | `pnpm typecheck` exit code 0 |
| A03 | PASS | `pnpm lint` exit code 0 |
| A04 | PASS | `pnpm format:check` exit code 0 |
| A05 | PASS | `pnpm build` exit code 0 |
| A06 | PASS | `pnpm test`: 77 files / 405 tests, all passed |
| A07 | PASS | persistence dependencies contain only runtime-kernel and shared |
| A08 | PASS | runtime-kernel `machine.ts`/`index.ts` diff is additions only |
| A09 | PASS | native XState persisted snapshot round-trip test passes |
| A10 | PASS | schema test finds exactly four tables and repeats `initSchema` idempotently |
| A11 | PASS | event store round-trip restores JSON payloads in sequence order |
| A12 | PASS | recovery E2E passes with real actor and real SQLite |
| A13 | PASS | viewer upsert test verifies composite identity and timestamp behavior |
| A14 | PASS | health tests verify OK and DOWN database handles |
| A15 | PASS | schema creates no non-goal tables |
| A16 | PASS | only runtime-kernel `machine.ts`/`index.ts` changed |
| A17 | PASS | five read-only implementation packages have no diff |
| A18 | PASS | lockfile only adds the workspace importer; no third-party package added |
| A19 | PASS | `DECISIONS.md` covers write-through LKG, Chapter Version, node:sqlite, Date.now, and delayed tables |
| A20 | PASS | node documents exist and T001–T009 are checked in `INDEX.md` |
| A21 | PASS | final commit is the single `DEV-010: persistence` commit and is clean at commit time |
| A22 | PASS | NODE_REPORT will reference the final commit head and append its LEDGER row |
| A23 | PASS | project index, DAG, task, audit, and protocol paths are unchanged |

## Scope Deviations

NONE.

## Known Issues

NONE.

## Blockers

NONE.

## Future Considerations

- DEV-011 owns deterministic Event Log replay and replay verification.
- A formal Chapter Version field can replace the documented `chapter_id` LKG substitute when one is frozen.
- ViewerState Platform typing and retention/purge belong to their future real consumers.

## Decisions

See `specs/dev/DEV-010/DECISIONS.md`. It is included in this delivery and covers every required
node decision.
