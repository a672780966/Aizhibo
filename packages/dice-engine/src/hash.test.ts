import { describe, expect, it } from 'vitest';
import { fnv1a32 } from './hash.js';

// Reference vectors cross-checked against the FNV-1a spec (offset basis
// 0x811c9dc5, prime 0x01000193): "", "a", "foobar" match the published
// values; the longer strings are locked in to pin the implementation.
// Recorded in specs/dev/DEV-005/DECISIONS.md D1.
describe('fnv1a32 (T003)', () => {
  it('matches published FNV-1a reference vectors', () => {
    expect(fnv1a32('')).toBe(2166136261); // 0x811c9dc5 (offset basis)
    expect(fnv1a32('a')).toBe(3826002220); // 0xe40c292c
    expect(fnv1a32('foobar')).toBe(3214735720); // 0xbf9cf968
  });

  it('returns unsigned 32-bit values in [0, 2^32)', () => {
    for (const input of ['', 'a', 'chapter1', 'seed-abc:0:0', '你好']) {
      const v = fnv1a32(input);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(4294967296);
    }
  });

  it('is deterministic: same input always returns the same value', () => {
    const inputs = ['chapter1', 'seed-abc:0:0', 'seed-abc:0:1', 'replay-me', '你好世界'];
    for (const input of inputs) {
      const first = fnv1a32(input);
      for (let i = 0; i < 5; i++) {
        expect(fnv1a32(input)).toBe(first);
      }
    }
  });

  it('distributes distinct everyday inputs to distinct values (no obvious mass collisions)', () => {
    const seen = new Set<number>();
    const inputs: string[] = [];
    for (let i = 0; i < 200; i++) {
      inputs.push(`seed:${i}:0`);
    }
    for (const input of inputs) {
      const v = fnv1a32(input);
      expect(seen.has(v)).toBe(false);
      seen.add(v);
    }
    expect(seen.size).toBe(200);
  });

  it('records locked test vectors', () => {
    expect(fnv1a32('chapter1')).toBe(1871303641);
    expect(fnv1a32('seed-abc:0:0')).toBe(888117373);
    expect(fnv1a32('seed-abc:0:1')).toBe(871339754);
    expect(fnv1a32('seed-abc:1:0')).toBe(778168726);
    expect(fnv1a32('replay-me')).toBe(3202568447);
  });
});
