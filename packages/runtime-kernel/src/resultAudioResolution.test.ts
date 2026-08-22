import { describe, expect, it } from 'vitest';
import type { ResolveResult } from '@interactive-story/rule-engine';
import type { AudioResolutionPorts } from '@interactive-story/audio-engine';
import { noopAudioResolutionPorts } from '@interactive-story/audio-engine';
import { resolveResultAudio } from './resultAudioResolution.js';

function res(narrativeId: string): ResolveResult {
  return {
    actionId: `act-${narrativeId}`,
    scale: 'MEDIUM',
    quality: 'SUCCESS',
    resultId: 'r1',
    worldEffects: [],
    playerEffects: [],
    narrativeId,
    visibility: 'PUBLIC',
  };
}

/** Port that only hits when contentId is exactly the given value — proves order. */
function orderSensitivePort(expectedContentId: string, file: string): AudioResolutionPorts {
  return {
    findPregenerated: (request) => (request.contentId === expectedContentId ? file : undefined),
    findCached: () => undefined,
    hasTtsProvider: () => false,
  };
}

describe('resolveResultAudio (DEV-031)', () => {
  it('A07: empty resolved → undefined, ports never consulted', () => {
    expect(resolveResultAudio([], 'any text', noopAudioResolutionPorts)).toBeUndefined();
  });

  it('A08: non-empty resolved but empty text → undefined', () => {
    expect(resolveResultAudio([res('a')], '', noopAudioResolutionPorts)).toBeUndefined();
  });

  it('A09: non-empty resolved + text + all-noop ports → SUBTITLE_ONLY', () => {
    expect(resolveResultAudio([res('a')], 'text', noopAudioResolutionPorts)).toEqual({
      source: 'SUBTITLE_ONLY',
    });
  });

  it('A10: contentId preserves resolved order, unsorted (a+b, not b+a)', () => {
    const ports = orderSensitivePort('a+b', 'assets/a+b.mp3');
    // a then b hits; b then a would miss (contentId b+a ≠ a+b)
    expect(resolveResultAudio([res('a'), res('b')], 'text', ports)).toEqual({
      source: 'PREGENERATED',
      file: 'assets/a+b.mp3',
    });
    expect(resolveResultAudio([res('b'), res('a')], 'text', ports)).toEqual({
      source: 'SUBTITLE_ONLY',
    });
  });

  it('PREGENERATED hit passes resolveAudioSource result through verbatim', () => {
    const ports = orderSensitivePort('solo', 'file.ogg');
    expect(resolveResultAudio([res('solo')], 'text', ports)).toEqual({
      source: 'PREGENERATED',
      file: 'file.ogg',
    });
  });
});
