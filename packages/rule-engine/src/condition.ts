import type { Condition, WorldState } from '@interactive-story/chapter-schema';
import { resolveStatePath } from './statePath.js';

/**
 * Evaluate a Condition tree against a WorldState. Pure and defensive: type
 * mismatches and unsupported addressing yield safe defaults (false) rather
 * than throwing (task package §9 constraint 3).
 */
export function evaluateCondition(condition: Condition, state: WorldState): boolean {
  if ('op' in condition) {
    return evaluateLeaf(condition, state);
  }
  if ('all' in condition) {
    return condition.all.every((c) => evaluateCondition(c, state));
  }
  if ('any' in condition) {
    return condition.any.some((c) => evaluateCondition(c, state));
  }
  return !evaluateCondition(condition.not, state);
}

function evaluateLeaf(leaf: Extract<Condition, { op: string }>, state: WorldState): boolean {
  // discovered / activeThreats only carry a meaningful EXISTS; any other
  // comparison on them is a defensive false (task package T004 #6).
  const isMemberContainer =
    leaf.path.container === 'discovered' || leaf.path.container === 'activeThreats';
  if (leaf.op !== 'EXISTS' && isMemberContainer) {
    return false;
  }

  const actual = resolveStatePath(state, leaf.path);
  switch (leaf.op) {
    case 'EXISTS':
      // For discovered/activeThreats, the resolved value IS the membership
      // boolean; return it directly. For other containers, existence = defined.
      return isMemberContainer ? (actual as boolean) : actual !== undefined;
    case 'IN':
      return leaf.value.includes(actual as never);
    case 'EQ':
      return actual === leaf.value;
    case 'NEQ':
      return actual !== leaf.value;
    case 'GT':
    case 'GTE':
    case 'LT':
    case 'LTE':
      return compareOrdered(leaf.op, actual, leaf.value);
  }
}

function compareOrdered(
  op: 'GT' | 'GTE' | 'LT' | 'LTE',
  actual: unknown,
  expected: unknown,
): boolean {
  if (typeof actual !== 'number' || typeof expected !== 'number') {
    return false; // cannot compare sizes across type mismatch — default false
  }
  switch (op) {
    case 'GT':
      return actual > expected;
    case 'GTE':
      return actual >= expected;
    case 'LT':
      return actual < expected;
    case 'LTE':
      return actual <= expected;
  }
}
