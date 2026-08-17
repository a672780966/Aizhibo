import type { Condition, RecoveryRule, StatePath } from '@interactive-story/chapter-schema';
import type { SchemaValidationResult } from './pass1Schema.js';
import { buildStoryGraphModel } from './pass3GraphModel.js';
import { computeReachability } from './pass3Reachability.js';
import {
  ANY_VALUE,
  pathKey,
  reachableInteractionActionIds,
  type ReachableStateModel,
} from './pass5ReachableState.js';

export interface UnsatisfiableFinding {
  targetId: string;
  reason: string;
}

/**
 * Ending satisfiability (ADDENDUM §A12): every REACHABLE non-fallback ending
 * must have at least one satisfiable `when` under the reachable state model.
 * This is a conservative static existence check, not a runtime evaluation.
 */
export function checkEndingSatisfiability(
  schemaResult: SchemaValidationResult,
  model: ReachableStateModel,
  reachable: Set<string>,
): UnsatisfiableFinding[] {
  const findings: UnsatisfiableFinding[] = [];
  for (const entry of schemaResult.endings.passed) {
    const ending = entry.value;
    if (ending.isFallback) continue;
    if (!reachable.has(ending.id)) continue;
    if (ending.when !== null && !isConditionSatisfiable(ending.when, model)) {
      findings.push({
        targetId: ending.id,
        reason: `ending "${ending.id}" has no satisfiable \`when\` condition under the reachable state model`,
      });
    }
  }
  return findings;
}

const DOWNED_COVERING_SCOPES = new Set([
  'ALL_DOWNED',
  'ALL_VIEWERS',
  'THIS_ACTION_GROUP',
  'OTHER_ACTION_GROUPS',
]);

/**
 * Recovery satisfiability (ADDENDUM §A13): when `downedPolicy` is
 * REQUIRE_RECOVERY, at least one downed-covering RecoveryRule must be possibly
 * triggerable under the reachable state model. The task package prescribes the
 * signature without a reachable parameter, so the reachable set is recomputed
 * here from the same inputs other PASS 3/5 functions use (deterministic, same
 * result by construction).
 */
export function checkRecoverySatisfiability(
  schemaResult: SchemaValidationResult,
  model: ReachableStateModel,
): UnsatisfiableFinding[] {
  const worldRules = schemaResult.worldRules.passed;
  if (worldRules === null || worldRules.downedPolicy !== 'REQUIRE_RECOVERY') {
    return [];
  }

  const graph = buildStoryGraphModel(schemaResult);
  const reachable = computeReachability(graph, schemaResult.manifest.passed?.entryNodeId ?? '');
  const reachableActions = reachableInteractionActionIds(schemaResult, reachable.reachable);

  const coveringRules = schemaResult.recovery.passed.filter((entry) =>
    DOWNED_COVERING_SCOPES.has(entry.value.scope),
  );
  if (coveringRules.length === 0) {
    return [
      {
        targetId: 'recovery',
        reason:
          'downedPolicy is REQUIRE_RECOVERY but no RecoveryRule has a scope covering DOWNED viewers',
      },
    ];
  }

  const triggerable = coveringRules.filter((entry) =>
    recoveryRuleMayTrigger(entry.value, reachable.reachable, reachableActions, model),
  );
  if (triggerable.length === 0) {
    return [
      {
        targetId: 'recovery',
        reason:
          'downedPolicy is REQUIRE_RECOVERY but none of the downed-covering RecoveryRules can possibly trigger under the reachable state model',
      },
    ];
  }
  return [];
}

function recoveryRuleMayTrigger(
  rule: RecoveryRule,
  reachable: Set<string>,
  reachableActions: Set<string>,
  model: ReachableStateModel,
): boolean {
  const trigger = rule.when;
  if (trigger.kind === 'STATE') {
    return isConditionSatisfiable(trigger.condition, model);
  }
  if (trigger.kind === 'SCENE_ENTER') {
    return reachable.has(trigger.nodeId);
  }
  // RESULT_QUALITY: the action being reachable suffices; reachable-quality
  // granularity is PASS 4 territory (conservative over-approximation).
  return reachableActions.has(trigger.actionId);
}

/**
 * Leaf-level satisfiability: EQ/IN require the referenced path to exist and
 * the target value(s) to be members of the key's value set (ANY_VALUE covers
 * any target); NEQ/GT/GTE/LT/LTE/EXISTS only require the path to exist.
 */
function checkLeaf(
  condition: { path: StatePath; op: string },
  model: ReachableStateModel,
): boolean {
  const values = model.keys.get(pathKey(condition.path));
  if (values === undefined) return false;
  if (values.has(ANY_VALUE)) return true;
  if (condition.op === 'EQ' && 'value' in condition) {
    return values.has(condition.value as string | number | boolean);
  }
  if (condition.op === 'IN' && 'value' in condition) {
    return (condition.value as (string | number | boolean)[]).some((v) => values.has(v));
  }
  return true;
}

export function isConditionSatisfiable(condition: Condition, model: ReachableStateModel): boolean {
  if ('op' in condition) {
    return checkLeaf(condition, model);
  }
  if ('all' in condition) {
    return condition.all.every((c) => isConditionSatisfiable(c, model));
  }
  if ('any' in condition) {
    return condition.any.some((c) => isConditionSatisfiable(c, model));
  }
  return checkNot(condition.not, model);
}

/**
 * `not`: conservatively satisfiable unless EVERY path referenced inside is
 * completely absent from the reachable state model (task package T006 #2) —
 * that surfaces conditions written against keys that can never exist in any
 * reachable state.
 */
function checkNot(inner: Condition, model: ReachableStateModel): boolean {
  const referenced = collectLeafPaths(inner);
  if (referenced.length === 0) return true;
  return !referenced.every((key) => !model.keys.has(key));
}

function collectLeafPaths(condition: Condition): string[] {
  if ('op' in condition) {
    return [pathKey(condition.path)];
  }
  if ('all' in condition) {
    return condition.all.flatMap(collectLeafPaths);
  }
  if ('any' in condition) {
    return condition.any.flatMap(collectLeafPaths);
  }
  return collectLeafPaths(condition.not);
}
