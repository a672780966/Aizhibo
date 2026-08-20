import { describe, expect, it } from 'vitest';
import type { ScaleBand } from '@interactive-story/chapter-schema';
import { resolveScale } from './actionScale.js';

const bands: ScaleBand[] = [
  { scale: 'SOLO', minParticipants: 1, maxParticipants: 1 },
  { scale: 'SMALL', minParticipants: 2, maxParticipants: 3 },
  { scale: 'MEDIUM', minParticipants: 4, maxParticipants: 6 },
  { scale: 'LARGE', minParticipants: 7, maxParticipants: 10 },
  { scale: 'MASS', minParticipants: 11, maxParticipants: null },
];

describe('resolveScale (T003)', () => {
  it('matches the exact min boundary of each band', () => {
    expect(resolveScale(1, bands)).toBe('SOLO');
    expect(resolveScale(2, bands)).toBe('SMALL');
    expect(resolveScale(4, bands)).toBe('MEDIUM');
    expect(resolveScale(7, bands)).toBe('LARGE');
    expect(resolveScale(11, bands)).toBe('MASS');
  });

  it('matches the exact max boundary of each band', () => {
    expect(resolveScale(1, bands)).toBe('SOLO');
    expect(resolveScale(3, bands)).toBe('SMALL');
    expect(resolveScale(6, bands)).toBe('MEDIUM');
    expect(resolveScale(10, bands)).toBe('LARGE');
  });

  it('open-ended MASS band covers every count above its min', () => {
    expect(resolveScale(12, bands)).toBe('MASS');
    expect(resolveScale(1000, bands)).toBe('MASS');
  });

  it('falls back to the maxParticipants === null band when nothing matches', () => {
    const closedOnly: ScaleBand[] = [
      { scale: 'SOLO', minParticipants: 1, maxParticipants: 1 },
      { scale: 'SMALL', minParticipants: 2, maxParticipants: 4 },
    ];
    // 1000 exceeds every band; open-ended absent -> literal MASS fallback
    expect(resolveScale(1000, closedOnly)).toBe('MASS');
    // with an open-ended band present, fall back to it
    const withOpen: ScaleBand[] = [
      { scale: 'SOLO', minParticipants: 1, maxParticipants: 1 },
      { scale: 'MASS', minParticipants: 2, maxParticipants: null },
    ];
    expect(resolveScale(50, withOpen)).toBe('MASS');
  });

  it('first matching band wins when bands are out of order or overlapping', () => {
    const overlapping: ScaleBand[] = [
      { scale: 'SMALL', minParticipants: 1, maxParticipants: 5 },
      { scale: 'SOLO', minParticipants: 1, maxParticipants: 1 },
    ];
    expect(resolveScale(3, overlapping)).toBe('SMALL');
  });

  it('defensive: non-negative counts below the first min still fall back', () => {
    // with SOLO at 1..1, a 1 still matches; force a gap by using a min> count set
    const gap: ScaleBand[] = [{ scale: 'LARGE', minParticipants: 5, maxParticipants: 10 }];
    expect(resolveScale(2, gap)).toBe('MASS'); // no band covers 2, no open-ended -> MASS
  });
});
