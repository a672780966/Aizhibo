import type { DiceProfile, Quality, WorldState } from '@interactive-story/chapter-schema';
import { resolveModifiers, type AppliedModifier } from './modifiers.js';
import { resolveQuality } from './quality.js';
import { rollRaw } from './roll.js';

export * from './hash.js';
export * from './diceNotation.js';
export * from './roll.js';
export * from './modifiers.js';
export * from './quality.js';

/**
 * Roll result. The first six field names and types deliberately match
 * `runtime-kernel`'s frozen `DiceRollRecordPayload` (seed/rollIndex/diceType/
 * rawValue/modifier/finalValue) so a future kernel can drop this value
 * straight into an event payload — but this package does NOT import
 * `runtime-kernel`; the alignment is a convention, not a type reuse.
 * `appliedModifiers` carries the per-modifier audit detail on top.
 */
export interface DiceRollResult {
  seed: string;
  rollIndex: number;
  diceType: string;
  rawValue: number;
  modifier: number;
  finalValue: number;
  quality: Quality | undefined;
  appliedModifiers: AppliedModifier[];
}

/**
 * The single public entry point: raw draw + modifier resolution + quality
 * mapping, deterministically. Same inputs always produce the same output.
 */
export function rollDice(
  profile: DiceProfile,
  seed: string,
  rollIndex: number,
  state: WorldState,
): DiceRollResult {
  const rawValue = rollRaw(profile.diceType, seed, rollIndex);
  const { total, applied } = resolveModifiers(profile, state);
  const finalValue = rawValue + total;
  const quality = resolveQuality(profile, finalValue);
  return {
    seed,
    rollIndex,
    diceType: profile.diceType,
    rawValue,
    modifier: total,
    finalValue,
    quality,
    appliedModifiers: applied,
  };
}
