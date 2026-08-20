import { describe, expect, it } from 'vitest';
import { parseDiceNotation } from './diceNotation.js';

describe('parseDiceNotation (T004)', () => {
  it('parses plain die notation with implicit count 1', () => {
    expect(parseDiceNotation('d20')).toEqual({ count: 1, sides: 20 });
    expect(parseDiceNotation('d6')).toEqual({ count: 1, sides: 6 });
  });

  it('parses multi-dice notation', () => {
    expect(parseDiceNotation('2d6')).toEqual({ count: 2, sides: 6 });
    expect(parseDiceNotation('3d8')).toEqual({ count: 3, sides: 8 });
  });

  it('is case-insensitive and trims surrounding whitespace', () => {
    expect(parseDiceNotation('D20')).toEqual({ count: 1, sides: 20 });
    expect(parseDiceNotation(' 2D6 ')).toEqual({ count: 2, sides: 6 });
  });

  it('degrades invalid inputs to the safe default without throwing', () => {
    for (const bad of ['abc', '', 'd', '20', '2d', 'dd6', '2d6d8', 'd6+1', '2d-6', '  ', 'x20']) {
      expect(parseDiceNotation(bad)).toEqual({ count: 1, sides: 1 });
    }
  });

  it('degrades matched-but-degenerate 0 count/sides to the safe default', () => {
    expect(parseDiceNotation('0d6')).toEqual({ count: 1, sides: 1 });
    expect(parseDiceNotation('d0')).toEqual({ count: 1, sides: 1 });
    expect(parseDiceNotation('0d0')).toEqual({ count: 1, sides: 1 });
  });
});
