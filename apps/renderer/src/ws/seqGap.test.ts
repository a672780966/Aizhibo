import { describe, expect, it } from 'vitest';
import { detectSeqGap } from './seqGap.js';

describe('detectSeqGap', () => {
  it('首条消息（lastSeq 为 undefined）永远不算跳空', () => {
    expect(detectSeqGap(undefined, 1)).toBe(false);
    expect(detectSeqGap(undefined, 999)).toBe(false);
  });

  it('newSeq === lastSeq + 1 视为连续，不算跳空', () => {
    expect(detectSeqGap(1, 2)).toBe(false);
    expect(detectSeqGap(5, 6)).toBe(false);
  });

  it('跳号（跳过中间序号）判定为跳空', () => {
    expect(detectSeqGap(1, 3)).toBe(true);
    expect(detectSeqGap(5, 10)).toBe(true);
  });

  it('重复序号判定为跳空', () => {
    expect(detectSeqGap(3, 3)).toBe(true);
  });

  it('乱序（序号回退）判定为跳空', () => {
    expect(detectSeqGap(3, 2)).toBe(true);
  });
});
