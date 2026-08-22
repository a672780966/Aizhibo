import { describe, expect, it } from 'vitest';
import {
  noopAudioResolutionPorts,
  resolveAudioSource,
  type AudioResolutionPorts,
  type AudioResolutionRequest,
} from './resolveAudioSource.js';

const request: AudioResolutionRequest = {
  contentId: 'nb-001',
  text: '你推开酒馆的门，里面一片死寂。',
  voiceId: 'zh-female-calm',
  voiceSettings: { speed: 1.0, stability: 0.7 },
};

describe('resolveAudioSource', () => {
  it('A07: all-default ports fall through to SUBTITLE_ONLY for any request', () => {
    expect(resolveAudioSource(request, noopAudioResolutionPorts)).toEqual({
      source: 'SUBTITLE_ONLY',
    });
  });

  it('A08a: pregenerated hit → PREGENERATED + file', () => {
    const ports: AudioResolutionPorts = {
      ...noopAudioResolutionPorts,
      findPregenerated: () => 'audio/pregenerated/nb-001.mp3',
    };
    expect(resolveAudioSource(request, ports)).toEqual({
      source: 'PREGENERATED',
      file: 'audio/pregenerated/nb-001.mp3',
    });
  });

  it('A08b: no pregenerated but cache hit → CACHE + file', () => {
    const ports: AudioResolutionPorts = {
      ...noopAudioResolutionPorts,
      findCached: () => 'cache/tts/nb-001.mp3',
    };
    expect(resolveAudioSource(request, ports)).toEqual({
      source: 'CACHE',
      file: 'cache/tts/nb-001.mp3',
    });
  });

  it('A08c: neither hit but tts provider available → RUNTIME_TTS without file', () => {
    const ports: AudioResolutionPorts = {
      ...noopAudioResolutionPorts,
      hasTtsProvider: () => true,
    };
    const result = resolveAudioSource(request, ports);
    expect(result).toEqual({ source: 'RUNTIME_TTS' });
    expect(result.file).toBeUndefined();
  });

  it('A09 priority: pregenerated wins even when every link could hit (first-hit stops)', () => {
    const allHit: AudioResolutionPorts = {
      findPregenerated: () => 'audio/pregenerated/nb-001.mp3',
      findCached: () => 'cache/tts/nb-001.mp3',
      hasTtsProvider: () => true,
    };
    expect(resolveAudioSource(request, allHit).source).toBe('PREGENERATED');
  });

  it('A09 priority: cache wins over RUNTIME_TTS when both available and no pregenerated', () => {
    const ports: AudioResolutionPorts = {
      findPregenerated: () => undefined,
      findCached: () => 'cache/tts/nb-001.mp3',
      hasTtsProvider: () => true,
    };
    expect(resolveAudioSource(request, ports).source).toBe('CACHE');
  });
});
