import type { ActionScale, ScaleBand } from '@interactive-story/chapter-schema';

/**
 * Resolve a participant count to an action scale band. Scans `bands` in array
 * order and returns the first band whose range contains `participantCount`
 * (`minParticipants <= count` and (`maxParticipants === null` or
 * `count <= maxParticipants`)).
 *
 * Defensive fallback (constraint 4, task T003 #3): a well-formed WorldRules
 * should cover every non-negative count with non-overlapping bands (DEV-002
 * T008 validated this), but if nothing matches we still return a usable scale
 * instead of throwing — the `maxParticipants === null` band if present,
 * otherwise the literal `"MASS"`. See DECISIONS.md D3.
 */
export function resolveScale(participantCount: number, bands: ScaleBand[]): ActionScale {
  for (const band of bands) {
    if (
      participantCount >= band.minParticipants &&
      (band.maxParticipants === null || participantCount <= band.maxParticipants)
    ) {
      return band.scale;
    }
  }
  const openEnded = bands.find((band) => band.maxParticipants === null);
  return openEnded?.scale ?? 'MASS';
}
