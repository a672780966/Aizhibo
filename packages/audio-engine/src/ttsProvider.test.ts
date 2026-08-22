import { describe, expect, it } from 'vitest';
import {
  noopTtsProviderPort,
  type TtsSynthesisRequest,
  type TtsSynthesisResult,
} from './ttsProvider.js';

const request: TtsSynthesisRequest = {
  text: '你推开酒馆的门，里面一片死寂。',
  voiceId: 'zh-female-calm',
  voiceSettings: { speed: 1.0, stability: 0.7 },
};

describe('noopTtsProviderPort', () => {
  it('A07: always resolves to {ok:false, reason:string}, never throws', async () => {
    const result = await noopTtsProviderPort.synthesize(request);
    expect(result).toEqual({ ok: false, reason: 'no TTS provider configured' });

    // Any legal input gets the same honest failure.
    const empty = await noopTtsProviderPort.synthesize({
      text: '',
      voiceId: '',
      voiceSettings: {},
    });
    expect(empty).toEqual({ ok: false, reason: 'no TTS provider configured' });
  });

  it('A08: discriminated-union narrowing works on both branches (typecheck-verified)', async () => {
    const success: TtsSynthesisResult = { ok: true, file: 'audio/nb-001.mp3' };
    if (success.ok) {
      // ok:true branch narrows to { ok: true; file: string }.
      expect(success.file.length).toBeGreaterThan(0);
    }

    const failure: TtsSynthesisResult = await noopTtsProviderPort.synthesize(request);
    expect(failure.ok).toBe(false);
    if (!failure.ok) {
      // ok:false branch narrows to { ok: false; reason: string }.
      expect(typeof failure.reason).toBe('string');
    }
  });
});
