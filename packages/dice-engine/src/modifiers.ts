import type { DiceProfile, WorldState } from '@interactive-story/chapter-schema';
import { evaluateCondition } from '@interactive-story/rule-engine';

/**
 * A modifier that applied to a roll, with its reason for audit purposes.
 */
export interface AppliedModifier {
  amount: number;
  reason: string;
}

export interface ResolvedModifiers {
  total: number;
  applied: AppliedModifier[];
}

/**
 * Evaluate which DiceModifiers apply to the current WorldState and sum their
 * amounts. Reuses rule-engine's frozen `evaluateCondition`. Each applied
 * modifier is recorded with its reason (audit intent of spec §8; the frozen
 * DiceRollRecordPayload carries only the summed `modifier`, but keeping the
 * per-modifier detail here costs nothing and avoids recomputation later).
 * Empty/missing `profile.modifiers` yields `{ total: 0, applied: [] }`.
 */
export function resolveModifiers(profile: DiceProfile, state: WorldState): ResolvedModifiers {
  const applied: AppliedModifier[] = [];
  let total = 0;
  for (const modifier of profile.modifiers ?? []) {
    if (evaluateCondition(modifier.when, state)) {
      total += modifier.amount;
      applied.push({ amount: modifier.amount, reason: modifier.reason });
    }
  }
  return { total, applied };
}
