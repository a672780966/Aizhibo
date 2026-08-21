# DEV-012 REPORT

## Status

READY_FOR_REVIEW

## Implemented

- T001–T005 completed.
- `presentationCommand.ts` adds the `PresentationCommand` envelope (`commandSeq` +
  inner `command`), the `PresentationState` projection derived by folding the sent
  command stream, and `wrapPresentationPort`, a decorator placed between the
  frozen `Ports.presentation` and any real Renderer. `machine.ts`,
  `presentationRegion.ts` and every other frozen action/state file are untouched.
  `commandSeq` starts at 1 and increments strictly for every `send`, including the
  `PRESENTATION_RESYNC` command emitted on a renderer hello/resync request.
- The only change to `ports.ts` is the one-line optional method addition
  `onRendererHello?(handler: () => void): void` on `PresentationPort`;
  `noopPresentationPort` is unchanged and still structurally compatible.
- `index.ts` appends only the new public exports
  (`wrapPresentationPort` + the three types).
- Tests cover strict sequencing, state folding over the five known command kinds
  (unknown kinds are ignored without throwing), the continuous-sequence RESYNC
  path via a test double that provides `onRendererHello`, the missing-callback
  noop case, and a real `createRuntimeMachine` + `valid-minimal` end-to-end run
  where `getState().currentSceneId` advances with the scene.

## Changed Files

```text
packages/runtime-kernel/src/presentationCommand.ts
packages/runtime-kernel/src/presentationCommand.test.ts
packages/runtime-kernel/src/ports.ts
packages/runtime-kernel/src/index.ts
specs/dev/DEV-012/INDEX.md
specs/dev/DEV-012/REQUIREMENTS.md
specs/dev/DEV-012/ACCEPTANCE.md
specs/dev/DEV-012/REPORT.md
specs/dev/DEV-012/DECISIONS.md
specs/comms/LEDGER.md
```

The `ports.ts`/`index.ts` changes are additive only. No other runtime-kernel source
file, package, persistence file, fixture, or read-only specification path was
modified.

## Tests Executed

Commands were run in the required order after workspace installation:

| Command | Exit code | Result |
|---|---:|---|
| `pnpm install` | 0 | PASS; no dependency changes |
| `pnpm typecheck` | 0 | PASS; `tsc -b && tsc -b --noEmit` |
| `pnpm lint` | 0 | PASS; ESLint no errors/warnings |
| `pnpm format:check` | 0 | PASS; all files formatted |
| `pnpm build` | 0 | PASS; `tsc -b` |
| `pnpm test` | 0 | PASS; 81 test files / 417 tests |

The new `presentationCommand.test.ts` covers the sequencing, folding, RESYNC,
noop-absence, and end-to-end scene-advance behaviors enumerated under A08–A12.

## Acceptance Results

| # | Result | Evidence |
|---|---|---|
| A01 | PASS | `pnpm install` exit code 0 |
| A02 | PASS | `pnpm typecheck` exit code 0 |
| A03 | PASS | `pnpm lint` exit code 0 |
| A04 | PASS | `pnpm format:check` exit code 0 |
| A05 | PASS | `pnpm build` exit code 0 |
| A06 | PASS | `pnpm test`: 81 files / 417 tests, all passed; no regressions |
| A07 | PASS | `ports.ts` diff adds only the one `onRendererHello?` line; `noopPresentationPort` unchanged, typecheck passes |
| A08 | PASS | test asserts `commandSeq` is strictly [1,2,3,4,5] across five sends and 3-send RESYNC sequence continuity |
| A09 | PASS | folding test covers LOADING/READY/FAILOVER/SCENE_ENTER/RESULT_PLAYING; unknown kind leaves state intact, no throw |
| A10 | PASS | triggered `onRendererHello` handler emits `PRESENTATION_RESYNC` with `state` deep-equal to `getState()`, `commandSeq` continues (3) |
| A11 | PASS | wrapping a port without `onRendererHello` works and never throws |
| A12 | PASS | real `createRuntimeMachine` + `valid-minimal`: after BOOT `getState().currentSceneId` is `scene-start` |
| A13 | PASS | `index.ts` diff contains additions only |
| A14 | PASS | no existing runtime-kernel file other than `ports.ts`/`index.ts` changed |
| A15 | PASS | persistence and all five read-only implementation packages have no diff |
| A16 | PASS | no package manifest or lockfile dependency was added |
| A17 | PASS | `DECISIONS.md` covers the decorator rationale, the optional-field extension, and the interaction-close gap |
| A18 | PASS | node documents exist and T001–T005 are checked in `INDEX.md` |
| A19 | PASS | one commit with subject `DEV-012: runtime api`; commit-time worktree was clean |
| A20 | PASS | NODE_REPORT and LEDGER row 0095 reference the final commit head |
| A21 | PASS | project index, DAG, task, audit, and protocol paths are unchanged |

## Scope Deviations

NONE.

## Known Issues

NONE.

## Blockers

NONE.

## Future Considerations

- The concrete inner command schema (kind/payload) is DEV-028/030's job; the
  envelope keeps `command` loosely typed as `unknown` per the frozen DEV-009 port.
- `commandSeq` gap detection belongs to the receiver / DEV-020 Renderer Shell.
- A future real Renderer implementation (DEV-028) can provide `onRendererHello`
  to drive resync over an actual transport; this node stays pure in-memory.

## Decisions

See `specs/dev/DEV-012/DECISIONS.md`. It is included in this delivery and covers
every required node decision, including the honest record of the known
interaction-close gap.