import { describe, expect, it } from 'vitest';
import { drawDie, rollRaw } from './roll.js';

describe('drawDie (T005)', () => {
  it('returns values in [1, sides]', () => {
    for (const sides of [2, 6, 20]) {
      for (let i = 0; i < 50; i++) {
        const v = drawDie('seed-x', 0, i, sides);
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(sides);
      }
    }
  });

  it('is deterministic for the same (seed, rollIndex, drawIndex)', () => {
    for (let i = 0; i < 20; i++) {
      expect(drawDie('seed-abc', 3, i, 20)).toBe(drawDie('seed-abc', 3, i, 20));
    }
  });

  it('different drawIndex usually gives different faces (2d6 is not a doubled single value)', () => {
    const draws = new Set<number>();
    for (let i = 0; i < 12; i++) {
      draws.add(drawDie('seed-diff', 0, i, 6));
    }
    expect(draws.size).toBeGreaterThan(1);
    // specifically for a 2d6 roll, the two particles are not always equal
    const seed = 'seed-pair';
    expect(drawDie(seed, 0, 0, 6)).not.toBe(drawDie(seed, 0, 1, 6));
  });

  it('different (seed, rollIndex) usually gives different faces', () => {
    const values = new Set<number>();
    for (let i = 0; i < 40; i++) {
      values.add(drawDie(`seed-${i}`, 0, 0, 20));
    }
    expect(values.size).toBeGreaterThan(1);
  });

  it('degenerate sides < 1 defensively draws 1', () => {
    expect(drawDie('seed', 0, 0, 0)).toBe(1);
    expect(drawDie('seed', 0, 0, -5)).toBe(1);
  });

  it('unknown diceType degrades through parseDiceNotation to a constant 1 (rollRaw path)', () => {
    expect(rollRaw('abc', 'seed', 0)).toBe(1); // { 1, 1 } -> one draw of [1,1]
  });
});

describe('rollRaw (T005)', () => {
  it('is deterministic for the same (seed, rollIndex)', () => {
    for (let i = 0; i < 10; i++) {
      expect(rollRaw('2d6', 'seed-abc', i)).toBe(rollRaw('2d6', 'seed-abc', i));
    }
  });

  it('different rollIndex usually gives different results', () => {
    const results = new Set<number>();
    for (let i = 0; i < 25; i++) {
      results.add(rollRaw('2d6', 'seed-abc', i));
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it('sanity: d20 range and 2d6 range stay within bounds', () => {
    for (let i = 0; i < 30; i++) {
      expect(rollRaw('d20', 'seed-r', i)).toBeGreaterThanOrEqual(1);
      expect(rollRaw('d20', 'seed-r', i)).toBeLessThanOrEqual(20);
      expect(rollRaw('2d6', 'seed-r', i)).toBeGreaterThanOrEqual(2);
      expect(rollRaw('2d6', 'seed-r', i)).toBeLessThanOrEqual(12);
    }
  });

  it('seeded: two different seeds on same rollIndex usually differ somewhere', () => {
    const diffsA = [];
    const diffsB = [];
    for (let i = 0; i < 8; i++) {
      diffsA.push(rollRaw('2d20', 'seed-a', i));
      diffsB.push(rollRaw('2d20', 'seed-b', i));
    }
    expect(new Set([...diffsA, ...diffsB]).size).toBeGreaterThan(1);
  });
});
