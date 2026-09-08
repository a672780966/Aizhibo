import { describe, expect, it } from 'vitest';
import type { NarrativeBlockAudioResult } from '@interactive-story/audio-production-queue';
import { checkNarrativeBlockAudioCoverage } from './checkNarrativeBlockAudioCoverage.js';

/**
 * Simulated production run results (DEV-074's frozen type): `ok:true` with
 * a produced file, `ok:false` with a reason. `blk-b` failed, `blk-d` was
 * never produced at all, `blk-a` has one successful result plus a
 * duplicate successful entry for a second slot.
 */
const AUDIO_RESULTS: NarrativeBlockAudioResult[] = [
  { ok: true, file: 'audio/blk-a-primary.mp3', blockId: 'blk-a', slot: 'PRIMARY' },
  { ok: false, reason: 'voice unavailable', blockId: 'blk-b', slot: 'PRIMARY' },
  { ok: true, file: 'audio/blk-a-support.mp3', blockId: 'blk-a', slot: 'SUPPORT' },
];

describe('checkNarrativeBlockAudioCoverage', () => {
  it('A14: ok:true match is covered; ok:false or fully absent blocks are uncovered; results are blockId-sorted', () => {
    const reachable = new Set(['blk-a', 'blk-b', 'blk-c', 'blk-d']);
    const result = checkNarrativeBlockAudioCoverage(reachable, AUDIO_RESULTS);
    expect(result).toEqual([
      { blockId: 'blk-a', covered: true },
      { blockId: 'blk-b', covered: false },
      { blockId: 'blk-c', covered: false },
      { blockId: 'blk-d', covered: false },
    ]);
  });

  it('A14b: duplicate audioResults entries do not duplicate coverage rows; output order is deterministic regardless of Set insertion order', () => {
    const result = checkNarrativeBlockAudioCoverage(
      new Set(['blk-d', 'blk-a', 'blk-c']),
      AUDIO_RESULTS,
    );
    expect(result.map((r) => r.blockId)).toEqual(['blk-a', 'blk-c', 'blk-d']);
    expect(result.find((r) => r.blockId === 'blk-a')?.covered).toBe(true);
  });

  it('A14c: an empty reachable set yields an empty coverage report', () => {
    expect(checkNarrativeBlockAudioCoverage(new Set(), AUDIO_RESULTS)).toEqual([]);
  });
});
