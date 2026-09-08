import { describe, expect, it } from 'vitest';
import type {
  TtsProviderPort,
  TtsSynthesisRequest,
  TtsSynthesisResult,
} from '@interactive-story/audio-engine';
import { runAudioProductionQueue, type VoiceConfig } from './runAudioProductionQueue.js';

const BLOCKS = [
  { id: 'block-a', slot: 'PRIMARY', text: 'text a' },
  { id: 'block-b', slot: 'SUPPORT', text: 'text b' },
  { id: 'block-c', slot: 'URGENCY', text: 'text c' },
];

const VOICE: VoiceConfig = {
  voiceId: 'voice-zh-female',
  voiceSettings: { stability: 0.5, style: 'calm' },
};

/**
 * Hand-written TtsProviderPort test double that records every synthesize
 * request and answers per-text from `outcomes` (defaulting to success with a
 * deterministic file path). No real network code anywhere in this file.
 */
function recordingProvider(outcomes: ReadonlyMap<string, TtsSynthesisResult>): {
  port: TtsProviderPort;
  calls: TtsSynthesisRequest[];
} {
  const calls: TtsSynthesisRequest[] = [];
  const port: TtsProviderPort = {
    synthesize: async (request) => {
      calls.push(request);
      return outcomes.get(request.text) ?? { ok: true, file: `audio/${request.text}.mp3` };
    },
  };
  return { port, calls };
}

describe('runAudioProductionQueue', () => {
  it('A10: synthesize is called once per block with exactly {text, voiceId, voiceSettings}', async () => {
    const { port, calls } = recordingProvider(new Map());
    const results = await runAudioProductionQueue(BLOCKS, port, VOICE);

    expect(calls).toEqual(
      BLOCKS.map((block) => ({
        text: block.text,
        voiceId: VOICE.voiceId,
        voiceSettings: VOICE.voiceSettings,
      })),
    );
    expect(results).toHaveLength(BLOCKS.length);
  });

  it('A11: a block reporting {ok:false, reason} does not affect the other results — no early exit, no throw, length preserved', async () => {
    const { port } = recordingProvider(
      new Map<string, TtsSynthesisResult>([['text b', { ok: false, reason: 'voice unavailable' }]]),
    );

    const results = await runAudioProductionQueue(BLOCKS, port, VOICE);

    expect(results).toHaveLength(BLOCKS.length);
    expect(results[0]).toEqual({
      ok: true,
      file: 'audio/text a.mp3',
      blockId: 'block-a',
      slot: 'PRIMARY',
    });
    expect(results[1]).toEqual({
      ok: false,
      reason: 'voice unavailable',
      blockId: 'block-b',
      slot: 'SUPPORT',
    });
    expect(results[2]).toEqual({
      ok: true,
      file: 'audio/text c.mp3',
      blockId: 'block-c',
      slot: 'URGENCY',
    });
  });

  it('A12: a block returning {ok:true, file} keeps the file verbatim plus its blockId/slot', async () => {
    const { port } = recordingProvider(
      new Map<string, TtsSynthesisResult>([
        ['text b', { ok: true, file: 'assets/audio/custom-b.mp3' }],
      ]),
    );

    const results = await runAudioProductionQueue(BLOCKS, port, VOICE);

    expect(results[1]).toEqual({
      ok: true,
      file: 'assets/audio/custom-b.mp3',
      blockId: 'block-b',
      slot: 'SUPPORT',
    });
  });
});
