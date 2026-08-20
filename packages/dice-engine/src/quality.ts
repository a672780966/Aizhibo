import type { DiceProfile, Quality } from '@interactive-story/chapter-schema';

/**
 * Map a final value to a Quality via the profile's threshold ranges. Returns
 * the first threshold whose `min <= finalValue <= max` matches (overlap is
 * possible in theory but prevented at compile time; first-match is the
 * defensive rule per T007 #1). A value landing in a gap — or a profile with
 * no covering threshold — returns `undefined`, never throws.
 *
 * Known gap, recorded in DECISIONS.md D4: coverage/overlap of the threshold
 * ranges over the actual dice range is not compile-time validated anywhere;
 * this node only defends at runtime.
 */
export function resolveQuality(profile: DiceProfile, finalValue: number): Quality | undefined {
  for (const threshold of profile.qualityThresholds) {
    if (finalValue >= threshold.min && finalValue <= threshold.max) {
      return threshold.quality;
    }
  }
  return undefined;
}
