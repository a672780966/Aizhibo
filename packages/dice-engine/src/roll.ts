import { fnv1a32 } from './hash.js';
import { parseDiceNotation } from './diceNotation.js';

/**
 * Deterministic draw of one die face in [1, sides]. Pure function of
 * `(seed, rollIndex, drawIndex)`: the FNV-1a hash of `` `${seed}:${rollIndex}:${drawIndex}` ``
 * is mapped into the die range via `(hash % sides) + 1`. There is no stateful
 * PRNG and no hidden counter — `drawIndex` is an explicit parameter, so replay
 * is just calling again with the same arguments.
 *
 * Known and accepted: modulo bias exists for larger `sides` but is intentionally
 * not corrected — narrative dice, not a gambling system (see DECISIONS.md D3).
 * Degenerate callers (sides < 1) defensively draw 1 (constraint 4).
 */
export function drawDie(seed: string, rollIndex: number, drawIndex: number, sides: number): number {
  if (sides < 1) {
    return 1;
  }
  const hash = fnv1a32(`${seed}:${rollIndex}:${drawIndex}`);
  return (hash % sides) + 1;
}

/**
 * Deterministic raw roll: parse `diceType` (e.g. "2d6") and sum one draw per
 * die, `drawIndex = 0..count-1`. Pure, stateless across calls.
 */
export function rollRaw(diceType: string, seed: string, rollIndex: number): number {
  const { count, sides } = parseDiceNotation(diceType);
  let total = 0;
  for (let drawIndex = 0; drawIndex < count; drawIndex++) {
    total += drawDie(seed, rollIndex, drawIndex, sides);
  }
  return total;
}
