import { describe, expect, it } from 'vitest';
import { noopHostTtsProvider } from './hostTtsProvider.js';
import type { HostTtsProvider } from './hostTtsProvider.js';

describe('noopHostTtsProvider.synthesizeSpeech — 诚实占位，恒定拒绝与输入无关', () => {
  it('returns the honest ok:false result for any text', async () => {
    await expect(noopHostTtsProvider.synthesizeSpeech('hello')).resolves.toEqual({
      ok: false,
      reason: 'no Host TTS provider configured',
    });
  });

  it('returns the same ok:false result for an empty-string text (返回值与 text 内容无关)', async () => {
    await expect(noopHostTtsProvider.synthesizeSpeech('')).resolves.toEqual({
      ok: false,
      reason: 'no Host TTS provider configured',
    });
  });
});

describe('noopHostTtsProvider.getHealth', () => {
  it('reports DOWN with the honest no-provider error', async () => {
    await expect(noopHostTtsProvider.getHealth()).resolves.toEqual({
      status: 'DOWN',
      error: 'no Host TTS provider configured',
    });
  });
});

describe('HostTtsProvider 类型契约 — 手写满足接口的实现可正常赋值并 for await 遍历', () => {
  it('a hand-written mock typed as HostTtsProvider satisfies the interface and streams chunks', async () => {
    const expectedChunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])];

    async function* mockAudioChunks(): AsyncGenerator<Uint8Array> {
      yield new Uint8Array([1, 2, 3]);
      yield new Uint8Array([4, 5, 6]);
    }

    const mockHostTtsProvider: HostTtsProvider = {
      synthesizeSpeech: async () => ({ ok: true, audioChunks: mockAudioChunks() }),
      getHealth: async () => ({ status: 'OK' as const }),
    };

    const result = await mockHostTtsProvider.synthesizeSpeech('anything');

    // 类型收窄：result.ok 为 true 才能访问 audioChunks
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const collected: Uint8Array[] = [];
    for await (const chunk of result.audioChunks) {
      collected.push(chunk);
    }

    expect(collected).toHaveLength(2);
    // noUncheckedIndexedAccess 下 collected[i] 可能为 undefined，整体转换后一次 toEqual 比较
    expect(collected.map((c) => Array.from(c))).toEqual(expectedChunks.map((c) => Array.from(c)));
  });
});
