import type { PresentationCommand } from '@interactive-story/runtime-kernel';
import { describe, expect, it } from 'vitest';
import { WS_URL, appendCommand } from './App.js';

describe('App 纯逻辑（不渲染 DOM，Task Package T006）', () => {
  it('WS_URL 是合法的 ws:// 地址', () => {
    expect(WS_URL.startsWith('ws://')).toBe(true);
  });

  it('appendCommand 追加信封并保持不可变', () => {
    const first: PresentationCommand = { commandSeq: 1, command: { kind: 'PRES_READY' } };
    const second: PresentationCommand = { commandSeq: 2, command: { kind: 'PRES_READY' } };
    const commands = appendCommand([first], second);
    expect(commands).toEqual([first, second]);
  });
});
