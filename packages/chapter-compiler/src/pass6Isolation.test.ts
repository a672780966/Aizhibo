import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadChapterPack } from './loader.js';
import { runSchemaValidation } from './pass1Schema.js';
import { checkIsolation } from './pass6Isolation.js';

const fixtureRoot = fileURLToPath(new URL('../test-fixtures', import.meta.url));

describe('checkIsolation (T005, judgment 4)', () => {
  it('A12: detects an ending-exclusive flag marked PUBLIC (host-isolation-leak)', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/host-isolation-leak`);
    const schemaResult = runSchemaValidation(raw);
    const issues = checkIsolation(schemaResult);
    expect(issues.map((i) => i.category)).toEqual(['ISOLATION_LEAK']);
    expect(issues[0]!.message).toContain('flags.secretFlag');
  });

  it('A12 positive: no finding when exclusive keys are correctly marked HIDDEN (host-clean)', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/host-clean`);
    const schemaResult = runSchemaValidation(raw);
    expect(checkIsolation(schemaResult)).toEqual([]);
  });

  it('flags boss variables under chapterVariables.<key> when marked PUBLIC', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/host-clean`);
    const schemaResult = runSchemaValidation(raw);
    // host-clean marks chapterVariables.bossHp HIDDEN; flip it to PUBLIC to force the finding.
    schemaResult.hostPublic.passed!.flagVisibility['chapterVariables.bossHp'] = 'PUBLIC';
    const issues = checkIsolation(schemaResult);
    expect(issues.map((i) => i.category)).toEqual(['ISOLATION_LEAK']);
    expect(issues[0]!.message).toContain('chapterVariables.bossHp');
  });

  it('is global: does not require reachability, only the marking', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/host-clean`);
    const schemaResult = runSchemaValidation(raw);
    // Simulate an unreachable ending referencing a key: add a non-registered ending
    // whose when references a PUBLIC-marked key — still a leak.
    schemaResult.endings.passed.push({
      file: 'endings/ghost.json',
      value: {
        id: 'ghost-ending',
        title: 'ghost',
        when: { path: { container: 'flags', key: 'ghostKey' }, op: 'EXISTS' },
        priority: 9,
        isFallback: false,
        visualSceneId: 'v',
        narrationBlockIds: [],
      },
    });
    schemaResult.hostPublic.passed!.flagVisibility['flags.ghostKey'] = 'PUBLIC';
    const issues = checkIsolation(schemaResult);
    expect(issues.map((i) => i.category)).toContain('ISOLATION_LEAK');
    expect(issues.some((i) => i.message.includes('flags.ghostKey'))).toBe(true);
  });
});
