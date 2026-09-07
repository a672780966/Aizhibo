import { describe, expect, it } from 'vitest';
import { noopHostLLMProvider } from './hostLLMProvider.js';
import type { HostLLMProvider } from './hostLLMProvider.js';

describe('noopHostLLMProvider.generateReply — 诚实占位，恒定拒绝与输入无关', () => {
  it('returns the honest ok:false result for any prompt', async () => {
    await expect(noopHostLLMProvider.generateReply('hello')).resolves.toEqual({
      ok: false,
      reason: 'no Host LLM provider configured',
    });
  });

  it('returns the same ok:false result for an empty-string prompt (返回值与 prompt 内容无关)', async () => {
    await expect(noopHostLLMProvider.generateReply('')).resolves.toEqual({
      ok: false,
      reason: 'no Host LLM provider configured',
    });
  });
});

describe('noopHostLLMProvider.getHealth', () => {
  it('reports DOWN with the honest no-provider error', async () => {
    await expect(noopHostLLMProvider.getHealth()).resolves.toEqual({
      status: 'DOWN',
      error: 'no Host LLM provider configured',
    });
  });
});

describe('HostLLMProvider 类型契约 — 手写满足接口的实现可正常赋值并调用', () => {
  it('a hand-written mock typed as HostLLMProvider satisfies the interface contract', async () => {
    const mockHostLLMProvider: HostLLMProvider = {
      generateReply: async () => ({ ok: true, text: 'mock reply' }),
      getHealth: async () => ({ status: 'OK' as const }),
    };

    await expect(mockHostLLMProvider.generateReply('anything')).resolves.toEqual({
      ok: true,
      text: 'mock reply',
    });
  });
});
