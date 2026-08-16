import { describe, expect, it } from 'vitest';
import { ChapterPackSchemas } from './chapterPack.js';
import type { ChapterPackSchemaMap } from './chapterPack.js';

describe('ChapterPackSchemas', () => {
  it('covers all five root file roles', () => {
    for (const role of ['manifest', 'storyGraph', 'initialState', 'worldRules', 'hostPublic']) {
      expect(ChapterPackSchemas).toHaveProperty(role);
    }
  });

  it('covers all fourteen content subdirectories', () => {
    for (const role of [
      'scenes',
      'interactions',
      'actions',
      'dice',
      'results',
      'state-rules',
      'narrative',
      'npc',
      'recovery',
      'boss',
      'endings',
      'visuals',
      'audio',
      'metadata',
    ]) {
      expect(ChapterPackSchemas).toHaveProperty(role);
    }
  });

  it('exposes a schema map type consumable by the compiler', () => {
    const map: ChapterPackSchemaMap = ChapterPackSchemas;
    expect(typeof map.manifest.parse).toBe('function');
  });
});
