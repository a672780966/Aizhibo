import { describe, expect, it } from 'vitest';
import { AudioAssetSchema } from './audio.js';

const preproduced = {
  id: 'audio-intro',
  kind: 'BGM',
  source: 'PREPRODUCED',
  file: 'audio/intro.mp3',
  loop: true,
};
const pregenerated = {
  id: 'audio-block-1',
  kind: 'SPEECH',
  source: 'PREGENERATED',
  file: 'audio/block-1.mp3',
};
const runtimeTts = {
  id: 'audio-fallback',
  kind: 'SPEECH',
  source: 'RUNTIME_TTS',
  ttsSpec: { voiceId: 'voice-zh-1', voiceSettings: { speed: 1.0, pitch: 'low' } },
};

describe('AudioAsset', () => {
  it('parses PREPRODUCED with file', () => {
    expect(AudioAssetSchema.parse(preproduced).source).toBe('PREPRODUCED');
  });

  it('parses PREGENERATED with file', () => {
    expect(AudioAssetSchema.parse(pregenerated).source).toBe('PREGENERATED');
  });

  it('parses RUNTIME_TTS with ttsSpec', () => {
    expect(AudioAssetSchema.parse(runtimeTts).source).toBe('RUNTIME_TTS');
  });

  it('rejects RUNTIME_TTS without ttsSpec', () => {
    const bad = { id: 'audio-fallback', kind: 'SPEECH', source: 'RUNTIME_TTS' };
    expect(AudioAssetSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects PREPRODUCED without file', () => {
    const bad = { id: 'audio-intro', kind: 'BGM', source: 'PREPRODUCED', loop: true };
    expect(AudioAssetSchema.safeParse(bad).success).toBe(false);
  });
});
