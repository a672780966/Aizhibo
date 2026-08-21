import { describe, expect, it } from 'vitest';
import { clampLineIndex, nextLineIndex } from './lineIndex.js';

describe('clampLineIndex（T004 / A11）', () => {
  it('空数组返回 0', () => {
    expect(clampLineIndex(0, [])).toBe(0);
    expect(clampLineIndex(5, [])).toBe(0);
    expect(clampLineIndex(-1, [])).toBe(0);
  });

  it('负下标夹到 0', () => {
    expect(clampLineIndex(-1, ['a', 'b'])).toBe(0);
    expect(clampLineIndex(-5, ['a', 'b'])).toBe(0);
  });

  it('越界正下标夹到最后一行的下标', () => {
    expect(clampLineIndex(2, ['a', 'b'])).toBe(1);
    expect(clampLineIndex(99, ['a', 'b'])).toBe(1);
  });

  it('合法下标原样返回', () => {
    expect(clampLineIndex(1, ['a', 'b', 'c'])).toBe(1);
    expect(clampLineIndex(0, ['a'])).toBe(0);
  });
});

describe('nextLineIndex（T004 / A11）', () => {
  it('空数组返回 0', () => {
    expect(nextLineIndex(0, [])).toBe(0);
  });

  it('顺序推进', () => {
    const lines = ['a', 'b', 'c'];
    expect(nextLineIndex(0, lines)).toBe(1);
    expect(nextLineIndex(1, lines)).toBe(2);
  });

  it('已在最后一行时不再前进', () => {
    const lines = ['a', 'b', 'c'];
    expect(nextLineIndex(2, lines)).toBe(2);
    expect(nextLineIndex(99, lines)).toBe(2);
  });
});
