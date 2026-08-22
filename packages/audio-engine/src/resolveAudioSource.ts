/**
 * CR-018 unified audio resolution chain: PREGENERATED → CACHE → RUNTIME_TTS →
 * SUBTITLE_ONLY. Pure decision function — the injected ports answer "can this
 * source serve the request right now?", this function only decides which link
 * in the chain wins (first hit stops; no "best pick").
 *
 * Serves SPEECH (narration / settlement voice-over) only. BGM/SFX/AMBIENCE are
 * fully resolved by DEV-027's `resolveSceneAudio` in runtime-kernel.
 *
 * Default ports (`noopAudioResolutionPorts`) all report "unavailable" — the
 * honest current state: no pregenerated directory, no cache, no TTS provider.
 * Future nodes (DEV-034/035/036) supply real port implementations by
 * composition, without needing a CR against this file.
 */

export type AudioResolutionSource = 'PREGENERATED' | 'CACHE' | 'RUNTIME_TTS' | 'SUBTITLE_ONLY';

export interface AudioResolutionRequest {
  /** Usually a NarrativeBlock id. */
  contentId: string;
  /** Text to be voiced (needed as CACHE key and TTS input). */
  text: string;
  voiceId: string;
  voiceSettings: Record<string, number | string>;
}

export interface AudioResolutionResult {
  source: AudioResolutionSource;
  /** File path when PREGENERATED/CACHE hit. */
  file?: string;
}

export interface AudioResolutionPorts {
  findPregenerated(request: AudioResolutionRequest): string | undefined;
  findCached(request: AudioResolutionRequest): string | undefined;
  hasTtsProvider(request: AudioResolutionRequest): boolean;
}

export const noopAudioResolutionPorts: AudioResolutionPorts = {
  findPregenerated: () => undefined,
  findCached: () => undefined,
  hasTtsProvider: () => false,
};

export function resolveAudioSource(
  request: AudioResolutionRequest,
  ports: AudioResolutionPorts,
): AudioResolutionResult {
  const pregenerated = ports.findPregenerated(request);
  if (pregenerated !== undefined) {
    return { source: 'PREGENERATED', file: pregenerated };
  }

  const cached = ports.findCached(request);
  if (cached !== undefined) {
    return { source: 'CACHE', file: cached };
  }

  if (ports.hasTtsProvider(request)) {
    // Decision only — actually calling TTS is DEV-034/035's job.
    return { source: 'RUNTIME_TTS' };
  }

  return { source: 'SUBTITLE_ONLY' };
}
