import type { ResolveResult } from '@interactive-story/rule-engine';
import type { AudioResolutionPorts, AudioResolutionResult } from '@interactive-story/audio-engine';
import { resolveAudioSource } from '@interactive-story/audio-engine';

/**
 * DEV-031: resolve the audio source for one Result narration. Pure function on
 * top of DEV-030's frozen `resolveAudioSource` chain — no re-implementation,
 * the result is passed through verbatim.
 *
 * No narration to voice (`resolved` empty or empty text) → `undefined` without
 * consulting the ports: asking "which voice reads it" is meaningless when there
 * is nothing to read.
 *
 * `contentId` joins `narrativeId`s in `resolved`'s original order, unsorted:
 * `composeResultSetNarration` concatenates in this exact order, so A+B and B+A
 * are two different synthesized texts and must not share a cache key.
 */
export function resolveResultAudio(
  resolved: readonly ResolveResult[],
  text: string,
  ports: AudioResolutionPorts,
): AudioResolutionResult | undefined {
  if (resolved.length === 0 || text === '') return undefined;

  const contentId = resolved.map((r) => r.narrativeId).join('+');
  return resolveAudioSource(
    // voiceId/voiceSettings are deliberate placeholders (DECISIONS D2) until
    // real per-role voicing / TTS provider nodes replace them via CR.
    { contentId, text, voiceId: 'narrator-default', voiceSettings: {} },
    ports,
  );
}
