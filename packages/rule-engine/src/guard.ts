import type { SceneGuard, WorldState } from '@interactive-story/chapter-schema';
import { evaluateCondition } from './condition.js';

/**
 * Resolve which guard's `goto` to follow: guards are evaluated in descending
 * `priority` order; the first whose `when` holds wins. If none holds, return
 * `undefined` — the caller (Kernel) falls back to SceneNode.next.
 */
export function resolveGuard(guards: SceneGuard[], state: WorldState): string | undefined {
  const sorted = [...guards].sort((a, b) => b.priority - a.priority);
  for (const guard of sorted) {
    if (evaluateCondition(guard.when, state)) {
      return guard.goto;
    }
  }
  return undefined;
}
