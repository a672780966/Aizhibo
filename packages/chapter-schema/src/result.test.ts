import { describe, expect, it } from 'vitest';
import {
  PlayerEffectSchema,
  ResultDictionarySchema,
  ResultEntrySchema,
  ViewerScopeSchema,
} from './result.js';

const fullEntry = {
  quality: 'SUCCESS',
  resultId: 'res-open-gate',
  worldEffects: [{ path: { container: 'flags', key: 'gateOpen' }, op: 'SET', value: true }],
  playerEffects: [{ scope: 'THIS_ACTION_GROUP', op: 'HEAL', amount: 1 }],
  narrativeId: 'narr-open-gate',
  visibility: 'PUBLIC',
};

const mapsToEntry = { quality: 'DISASTER', mapsTo: 'FAILURE' };
const unreachableEntry = { quality: 'SPECIAL', unreachable: true };

describe('ResultEntry', () => {
  it('parses a full result entry', () => {
    expect(ResultEntrySchema.parse(fullEntry).quality).toBe('SUCCESS');
  });

  it('parses mapsTo and unreachable entries', () => {
    expect(ResultEntrySchema.safeParse(mapsToEntry).success).toBe(true);
    expect(ResultEntrySchema.safeParse(unreachableEntry).success).toBe(true);
  });

  it('rejects an entry carrying both resultId and mapsTo', () => {
    const bad = { quality: 'SUCCESS', resultId: 'res-x', mapsTo: 'FAILURE' };
    expect(ResultEntrySchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an entry with an unknown quality', () => {
    expect(ResultEntrySchema.safeParse({ ...fullEntry, quality: 'EPIC' }).success).toBe(false);
  });
});

describe('ResultDictionary', () => {
  it('parses a dictionary with a mix of entry kinds', () => {
    const dict = { id: 'rs-open-gate', entries: [fullEntry, mapsToEntry, unreachableEntry] };
    expect(ResultDictionarySchema.parse(dict).entries).toHaveLength(3);
  });
});

describe('ViewerScope / PlayerEffect', () => {
  it('parses every scope', () => {
    for (const scope of [
      'THIS_ACTION_GROUP',
      'OTHER_ACTION_GROUPS',
      'ALL_ACTIVE',
      'ALL_DOWNED',
      'ALL_SPECTATORS',
      'ALL_VIEWERS',
    ]) {
      expect(ViewerScopeSchema.safeParse(scope).success).toBe(true);
    }
  });

  it('parses a REVIVE effect without amount', () => {
    expect(PlayerEffectSchema.parse({ scope: 'ALL_DOWNED', op: 'REVIVE' }).op).toBe('REVIVE');
  });
});
