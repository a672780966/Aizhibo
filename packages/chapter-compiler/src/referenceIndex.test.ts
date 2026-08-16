import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadChapterPack } from './loader.js';
import { runSchemaValidation } from './pass1Schema.js';
import { buildReferenceIndex } from './referenceIndex.js';

const fixtureRoot = fileURLToPath(new URL('../test-fixtures', import.meta.url));

function indexOf(fixture: string) {
  const { raw } = loadChapterPack(`${fixtureRoot}/${fixture}`);
  return buildReferenceIndex(runSchemaValidation(raw));
}

describe('buildReferenceIndex', () => {
  it('indexes exactly the PASS1-passed entries (set sizes match)', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/valid-minimal`);
    const schemaResult = runSchemaValidation(raw);
    const index = buildReferenceIndex(schemaResult);

    expect(index.scenes.size).toBe(schemaResult.scenes.passed.length);
    expect(index.interactions.size).toBe(schemaResult.interactions.passed.length);
    expect(index.actions.size).toBe(schemaResult.actions.passed.length);
    expect(index.diceProfiles.size).toBe(schemaResult.dice.passed.length);
    expect(index.resultDictionaries.size).toBe(schemaResult.results.passed.length);
    expect(index.npcDefinitions.size).toBe(schemaResult.npc.passed.length);
    expect(index.recoveryRules.size).toBe(schemaResult.recovery.passed.length);
    expect(index.bossNodes.size).toBe(schemaResult.boss.passed.length);
    expect(index.endings.size).toBe(schemaResult.endings.passed.length);
    expect(index.audioAssets.size).toBe(schemaResult.audio.passed.length);

    const narrativeResults = schemaResult.narrative.passed.filter((e) => 'focus' in e.value);
    const narrativeBlocks = schemaResult.narrative.passed.filter((e) => 'slot' in e.value);
    expect(index.resultNarratives.size).toBe(narrativeResults.length);
    expect(index.narrativeBlocks.size).toBe(narrativeBlocks.length);

    const visuals = schemaResult.visuals.passed;
    expect(index.visualScenes.size).toBe(visuals.filter((e) => 'layers' in e.value).length);
    expect(index.characterAssets.size).toBe(visuals.filter((e) => 'expressions' in e.value).length);
    expect(index.imageAssets.size).toBe(visuals.filter((e) => 'file' in e.value).length);

    expect(index.storyGraphNodes.size).toBe(3);
    expect(index.nodeFileToId.size).toBe(3);
  });

  it('records expression key sets per CharacterAsset', () => {
    const index = indexOf('valid-minimal');
    const expressions = index.characterAssets.get('char-guide');
    expect(expressions).toEqual(new Set(['smile', 'neutral']));
  });

  it('does not index entries that failed PASS 1', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/broken-schema`);
    const schemaResult = runSchemaValidation(raw);
    const index = buildReferenceIndex(schemaResult);

    expect(index.scenes.has('scene-ok')).toBe(true);
    expect(index.scenes.has('scene-bad')).toBe(false);
    expect(index.interactions.has('interaction-bad')).toBe(false);
    expect(index.actions.has('action-bad')).toBe(false);
    expect(index.diceProfiles.has('dice-bad')).toBe(false);
    expect(index.resultDictionaries.has('result-bad')).toBe(false);
    expect(index.npcDefinitions.has('npc-bad')).toBe(false);
    expect(index.bossNodes.has('boss-bad')).toBe(false);
    expect(index.endings.has('ending-bad')).toBe(false);
    expect(index.visualScenes.has('vs-bad')).toBe(false);
    expect(index.audioAssets.has('audio-bad')).toBe(false);
  });
});
