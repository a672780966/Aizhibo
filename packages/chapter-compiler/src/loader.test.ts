import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadChapterPack } from './loader.js';

const fixtureRoot = fileURLToPath(new URL('../test-fixtures', import.meta.url));

describe('loadChapterPack', () => {
  it('loads a valid pack with zero issues and all 19 categories present', () => {
    const { raw, issues } = loadChapterPack(`${fixtureRoot}/valid-minimal`);
    expect(issues).toEqual([]);
    expect(raw.manifest).toEqual(expect.objectContaining({ chapterId: 'ch-minimal' }));
    expect(raw.storyGraph).toEqual(expect.objectContaining({ nodes: expect.any(Array) }));
    expect(raw.initialState).toEqual(expect.objectContaining({ chapterId: 'ch-minimal' }));
    expect(raw.worldRules).toEqual(expect.objectContaining({ downedPolicy: 'AUTO_SPEND_LIFE' }));
    expect(raw.hostPublic).toEqual(expect.objectContaining({ tensionLabels: { calm: '平静' } }));
    expect(raw.scenes).toHaveLength(1);
    expect(raw.scenes[0]).toEqual({ file: 'scenes/scene-start.json', content: expect.any(Object) });
    expect(raw.interactions).toHaveLength(2);
    expect(raw.actions).toHaveLength(2);
    expect(raw.dice).toHaveLength(1);
    expect(raw.results).toHaveLength(2);
    expect(raw.stateRules).toHaveLength(1);
    expect(raw.narrative).toHaveLength(4);
    expect(raw.npc).toHaveLength(1);
    expect(raw.recovery).toHaveLength(1);
    expect(raw.boss).toHaveLength(1);
    expect(raw.endings).toHaveLength(1);
    expect(raw.visuals).toHaveLength(7);
    expect(raw.audio).toHaveLength(3);
    expect(raw.metadata).toHaveLength(1);
  });

  it('does not throw on a fixture with one JSON syntax error, and reports exactly that issue', () => {
    const { raw, issues } = loadChapterPack(`${fixtureRoot}/broken-json-syntax`);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ kind: 'JSON_SYNTAX_ERROR', path: 'manifest.json' });
    expect(raw.manifest).toBeUndefined();
    expect(raw.scenes).toHaveLength(1);
    expect(raw.scenes[0]!.content).toEqual(expect.objectContaining({ id: 'scene-ok' }));
    expect(raw.storyGraph).toEqual(expect.objectContaining({ nodes: [] }));
  });

  it('records FILE_READ_ERROR for a missing root file without throwing', () => {
    const { raw, issues } = loadChapterPack(`${fixtureRoot}/broken-missing-root`);
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: 'FILE_READ_ERROR', path: 'manifest.json' }),
    );
    expect(raw.manifest).toBeUndefined();
    expect(raw.storyGraph).toEqual(expect.objectContaining({ nodes: [] }));
  });

  it('records FILE_READ_ERROR for every missing subdirectory', () => {
    const { issues } = loadChapterPack(`${fixtureRoot}/broken-missing-root`);
    const readErrors = issues.filter((i) => i.kind === 'FILE_READ_ERROR');
    expect(readErrors.map((i) => i.path)).toContain('scenes');
    expect(readErrors.map((i) => i.path)).toContain('audio');
    expect(readErrors.map((i) => i.path)).toContain('metadata');
  });

  it('ignores non-json files inside subdirectories', () => {
    const { raw, issues } = loadChapterPack(`${fixtureRoot}/broken-json-syntax`);
    expect(issues).toHaveLength(1);
    expect(raw.audio).toHaveLength(0);
    expect(raw.boss).toHaveLength(0);
  });
});
