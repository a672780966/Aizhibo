import type { TtsProviderPort, TtsSynthesisResult } from '@interactive-story/audio-engine';

/**
 * One block's synthesis outcome: the TTS provider result verbatim
 * (`{ok: true, file}` or `{ok: false, reason}`), annotated with which block
 * it came from.
 *
 * Note: declared as an intersection type alias rather than
 * `interface NarrativeBlockAudioResult extends TtsSynthesisResult` because
 * `TtsSynthesisResult` is a discriminated union and TypeScript forbids an
 * interface from extending a union type. The intersection is contractually
 * equivalent.
 */
export type NarrativeBlockAudioResult = TtsSynthesisResult & {
  blockId: string;
  slot: string;
};

/**
 * Voice configuration for a whole production run. Purely caller-supplied:
 * the NarrativeBlock schema has no voice-assignment field and the Dev Spec
 * defines none, so this package neither derives nor hardcodes any default
 * voiceId/voiceSettings (same settings apply to every block in the batch).
 */
export interface VoiceConfig {
  voiceId: string;
  voiceSettings: Record<string, number | string>;
}

export interface NarrativeBlockInput {
  id: string;
  slot: string;
  text: string;
}

/**
 * Synthesize one audio file per block through the given TTS provider,
 * running all blocks in parallel via `Promise.all`. Each block's result is
 * the provider's `TtsSynthesisResult` verbatim plus `blockId`/`slot`; a
 * block reporting `{ok: false, reason}` does not affect the others being
 * collected. No retries, no extra logic — the Dev Spec defines no retry
 * policy, so none is invented here.
 *
 * Generated file paths are NOT written back into any Chapter Pack file and
 * no AudioAsset manifest entry is created: no Dev Spec/CR text defines such
 * a manifest schema, so that binding is left to a future node/CR.
 */
export async function runAudioProductionQueue(
  blocks: NarrativeBlockInput[],
  ttsPort: TtsProviderPort,
  voice: VoiceConfig,
): Promise<NarrativeBlockAudioResult[]> {
  return Promise.all(
    blocks.map((block) =>
      ttsPort
        .synthesize({
          text: block.text,
          voiceId: voice.voiceId,
          voiceSettings: voice.voiceSettings,
        })
        .then((result) => ({ ...result, blockId: block.id, slot: block.slot })),
    ),
  );
}
