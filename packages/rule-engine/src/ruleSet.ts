import type { StateRuleSet, WorldState } from '@interactive-story/chapter-schema';
import { evaluateCondition } from './condition.js';
import { applyEffect } from './effect.js';

export interface ApplyStateRuleSetResult {
  nextState: WorldState;
  newlyFiredRuleIds: string[];
}

/**
 * Evaluate a full StateRuleSet, applying the effects of every rule whose
 * `when` holds. Rules are processed in array order (order = priority). A rule
 * with `once === true` whose id is already in `firedRuleIds` is skipped.
 *
 * The engine is stateless: whether to persist `newlyFiredRuleIds` into
 * WorldState is the caller's (future Kernel) decision — this function only
 * reports what fired this call.
 */
export function applyStateRuleSet(
  ruleSet: StateRuleSet,
  state: WorldState,
  firedRuleIds: ReadonlySet<string>,
): ApplyStateRuleSetResult {
  let nextState = state;
  const newlyFiredRuleIds: string[] = [];
  for (const rule of ruleSet.rules) {
    if (rule.once === true && firedRuleIds.has(rule.id)) {
      continue;
    }
    if (evaluateCondition(rule.when, nextState)) {
      for (const effect of rule.effects) {
        nextState = applyEffect(effect, nextState);
      }
      if (rule.once === true) {
        newlyFiredRuleIds.push(rule.id);
      }
    }
  }
  return { nextState, newlyFiredRuleIds };
}
