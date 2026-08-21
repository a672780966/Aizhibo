# DEV-011 REPORT

## Status

READY_FOR_REVIEW

## Implemented

- T001–T006 completed.
- `voteExtraction.ts` extracts ordered vote rounds from `INTERACTION.VOTE` and
  `INTERACTION.LOCKING` events, ignoring unrelated output events.
- `replay.ts` recreates the runtime from zero and replays only the historical vote inputs while
  reusing the DEV-007 phase-driving sequence. Missing rounds and max-step exhaustion fail loudly.
- `replayCompare.ts` uses the standard library deep comparator and reports indexed divergences for
  the deterministic fields while intentionally excluding wall-clock `id`/`timestamp` by default.
- `runtime-kernel/src/index.ts` only appends the requested public exports.

## Changed Files

```text
packages/runtime-kernel/src/voteExtraction.ts
packages/runtime-kernel/src/voteExtraction.test.ts
packages/runtime-kernel/src/replay.ts
packages/runtime-kernel/src/replay.test.ts
packages/runtime-kernel/src/replayCompare.ts
packages/runtime-kernel/src/replayCompare.test.ts
packages/runtime-kernel/src/index.ts
specs/dev/DEV-011/INDEX.md
specs/dev/DEV-011/REQUIREMENTS.md
specs/dev/DEV-011/ACCEPTANCE.md
specs/dev/DEV-011/REPORT.md
specs/dev/DEV-011/DECISIONS.md
specs/comms/LEDGER.md
```

No other runtime-kernel source file, package, persistence file, fixture, or read-only specification
path was modified.

## Tests Executed

Commands were run in the required order after workspace installation:

| Command | Exit code | Result |
|---|---:|---|
| `pnpm install` | 0 | PASS; no dependency changes |
| `pnpm typecheck` | 0 | PASS; `tsc -b && tsc -b --noEmit` |
| `pnpm lint` | 0 | PASS; ESLint no errors/warnings |
| `pnpm format:check` | 0 | PASS; all files formatted |
| `pnpm build` | 0 | PASS; `tsc -b` |
| `pnpm test` | 0 | PASS; 80 test files / 413 tests |

Replay tests cover valid-minimal end-to-end replay, missing vote-round failure, independent system
clock comparison, payload divergence, and a full-field equality run using relative-origin adapters
around the frozen deterministic `virtualClockPort` export. The adapters normalize its existing
module-level counter without modifying the frozen source file.

## Acceptance Results

| # | Result | Evidence |
|---|---|---|
| A01 | PASS | `pnpm install` exit code 0 |
| A02 | PASS | `pnpm typecheck` exit code 0 |
| A03 | PASS | `pnpm lint` exit code 0 |
| A04 | PASS | `pnpm format:check` exit code 0 |
| A05 | PASS | `pnpm build` exit code 0 |
| A06 | PASS | `pnpm test`: 80 files / 413 tests, all passed |
| A07 | PASS | vote extraction tests cover empty, single, multiple, and interleaved events |
| A08 | PASS | valid-minimal replay reaches `CHAPTER_END` |
| A09 | PASS | missing vote round throws `Replay requires vote round 0` |
| A10 | PASS | independent system-clock replay returns no default divergences |
| A11 | PASS | relative-origin `virtualClockPort` runs match every field, including id/timestamp |
| A12 | PASS | changed nested payload produces the expected indexed divergence |
| A13 | PASS | `index.ts` diff contains additions only |
| A14 | PASS | no existing runtime-kernel file other than `index.ts` changed |
| A15 | PASS | persistence and all five read-only implementation packages have no diff |
| A16 | PASS | no package manifest or lockfile dependency was added |
| A17 | PASS | `DECISIONS.md` covers replay input, comparison fields, LKG boundary, and mismatch handling |
| A18 | PASS | node documents exist and T001–T006 are checked in `INDEX.md` |
| A19 | PASS | one commit with subject `DEV-011: deterministic replay`; commit-time worktree was clean |
| A20 | PASS | NODE_REPORT and LEDGER row 0091 reference the final commit head |
| A21 | PASS | project index, DAG, task, audit, and protocol paths are unchanged |

## Scope Deviations

NONE.

## Known Issues

NONE.

## Blockers

NONE.

## Future Considerations

- DEV-012 may expose replay through Runtime API; this node intentionally adds no server entry point.
- Partial replay from an intermediate sequence remains out of scope until it has a real consumer.

## Decisions

See `specs/dev/DEV-011/DECISIONS.md`. It is included in this delivery and covers every required
node decision.
