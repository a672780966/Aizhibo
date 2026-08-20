import type {
  ActionDefinition,
  ActionScale,
  PlayerEffect,
  Quality,
  ResultDictionary,
  ResultEntry,
  StateEffect,
  WorldRules,
  WorldState,
} from '@interactive-story/chapter-schema';
import { resolveScale } from './actionScale.js';

/**
 * Shape of a dice roll as produced by dice-engine (`DiceRollResult`). A local
 * re-definition, not an import from `@interactive-story/dice-engine`, per
 * SCOPE_RULING 0062 (BLK-006 方案 B): fields align with dice-engine's
 * `DiceRollResult` verbatim, but the project reference is deliberately avoided
 * because dice-engine already depends on rule-engine — importing its type back
 * would create a cyclic project reference (TS6202). This is the mirror of
 * DEV-005's own "alignment by convention, not type reuse" discipline
 * (DEV-005 DECISIONS D5). This node only reads `quality`; the other fields are
 * present purely to keep the shape aligned.
 */
interface ResolveRollResult {
  seed: string;
  rollIndex: number;
  diceType: string;
  rawValue: number;
  modifier: number;
  finalValue: number;
  quality: Quality | undefined;
  appliedModifiers: { amount: number; reason: string }[];
}

/**
 * Everything the resolver needs about a single dice resolution attempt. The
 * dice result is already produced (by dice-engine) — this node does NOT roll.
 *
 * `playerStateSummary` from spec §9 is deliberately omitted (see DECISIONS D1):
 * nothing this node computes (scale / result lookup / effect extraction) reads
 * it, and its shape was never defined by any frozen node.
 *
 * `worldState` is retained even though no current computation reads it — it
 * reuses the already-frozen WorldState type at zero cost and keeps a seat for
 * future state-dependent result differentiation without a breaking change
 * (see DECISIONS D1).
 */
export interface ResolveInput {
  chapterId: string;
  sceneId: string;
  interactionId: string;
  actionId: string;
  participantCount: number;
  dice: ResolveRollResult;
  worldState: WorldState;
}

/**
 * The resolved, ready-to-apply outcome of an action. `worldEffects`/
 * `playerEffects` are returned, never applied here — actually applying them
 * (DEV-004 `applyEffect`) is the Kernel's job.
 */
export interface ResolveResult {
  actionId: string;
  scale: ActionScale;
  quality: Quality;
  resultId: string;
  worldEffects: StateEffect[];
  playerEffects: PlayerEffect[];
  narrativeId: string;
  visibility: 'PUBLIC' | 'DEFERRED';
}

/**
 * The single public entry point: turn a rolled dice result + participant count
 * into a resolved action outcome. Pure function — reads input, returns a new
 * ResolveResult, applies nothing.
 *
 * Branch behaviour (task T004 #3):
 *  - `input.dice.quality === undefined` (dice-engine couldn't grade) -> undefined
 *  - full result entry -> used directly
 *  - `mapsTo` entry -> single hop only (D3); the target must be a full result
 *  - `unreachable: true` entry -> undefined (runtime defence)
 *  - no entry for the rolled quality -> undefined
 */
export function resolveAction(
  input: ResolveInput,
  action: ActionDefinition,
  worldRules: WorldRules,
  resultDict: ResultDictionary,
): ResolveResult | undefined {
  const quality = input.dice.quality;
  if (quality === undefined) {
    return undefined;
  }

  const scale = resolveScale(
    input.participantCount,
    action.scaleBands ?? worldRules.defaultScaleBands,
  );

  const entry = resultDict.entries.find((e) => e.quality === quality);
  if (entry === undefined) {
    return undefined;
  }
  if ('unreachable' in entry) {
    return undefined;
  }
  if ('mapsTo' in entry) {
    // single hop only — a chainsTo mapsTo, or a map to an unreachable/absent
    // target, is a resolution failure (see DECISIONS D3)
    return resolveMappedEntry(resultDict, entry.mapsTo, input.actionId, scale);
  }
  return toResolveResult(input.actionId, scale, quality, entry);
}

function resolveMappedEntry(
  resultDict: ResultDictionary,
  targetQuality: Quality,
  actionId: string,
  scale: ActionScale,
): ResolveResult | undefined {
  const target = resultDict.entries.find((e) => e.quality === targetQuality);
  if (target === undefined || 'mapsTo' in target || 'unreachable' in target) {
    return undefined;
  }
  return toResolveResult(actionId, scale, target.quality, target);
}

function toResolveResult(
  actionId: string,
  scale: ActionScale,
  quality: Quality,
  entry: Extract<ResultEntry, { resultId: string }>,
): ResolveResult {
  return {
    actionId,
    scale,
    quality,
    resultId: entry.resultId,
    worldEffects: entry.worldEffects,
    playerEffects: entry.playerEffects,
    narrativeId: entry.narrativeId,
    visibility: entry.visibility,
  };
}
