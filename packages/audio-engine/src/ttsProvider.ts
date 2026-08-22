/**
 * TTS provider contract (DEV-034). Defines only "what a TTS provider looks
 * like" — no real HTTP/streaming implementation lives here (that is DEV-035's
 * job). Callers hand over text and eventually get a playable file path or an
 * honest failure; HTTP Streaming (Dev Spec §30) is an internal technique a
 * future implementation may use, not something this port exposes.
 *
 * `noopTtsProviderPort` reports failure unconditionally — the honest current
 * state: no real TTS backend exists yet. DEV-035 supplies the real
 * implementation by composition, without needing a CR against this file.
 */

export interface TtsSynthesisRequest {
  text: string;
  voiceId: string;
  voiceSettings: Record<string, number | string>;
}

export type TtsSynthesisResult = { ok: true; file: string } | { ok: false; reason: string };

export interface TtsProviderPort {
  synthesize(request: TtsSynthesisRequest): Promise<TtsSynthesisResult>;
}

export const noopTtsProviderPort: TtsProviderPort = {
  synthesize: async () => ({ ok: false, reason: 'no TTS provider configured' }),
};
