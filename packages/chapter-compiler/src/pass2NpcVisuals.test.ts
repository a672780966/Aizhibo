import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadChapterPack } from './loader.js';
import { runSchemaValidation } from './pass1Schema.js';
import { buildReferenceIndex } from './referenceIndex.js';
import { runNpcVisualsChecks } from './pass2NpcVisuals.js';

const fixtureRoot = fileURLToPath(new URL('../test-fixtures', import.meta.url));

function npcVisualsIssuesOf(fixture: string) {
  const { raw } = loadChapterPack(`${fixtureRoot}/${fixture}`);
  const schemaResult = runSchemaValidation(raw);
  return runNpcVisualsChecks(schemaResult, buildReferenceIndex(schemaResult));
}

describe('runNpcVisualsChecks', () => {
  it('produces no issues for the valid pack (positive examples)', () => {
    expect(npcVisualsIssuesOf('valid-minimal')).toEqual([]);
  });

  it('flags NPCDefinition.characterAssetId that is not a declared CharacterAsset (negative)', () => {
    const issues = npcVisualsIssuesOf('broken-dangling-refs');
    const asset = issues.filter((i) => i.category === 'npcVisuals.characterAssetId');
    expect(asset).toHaveLength(1);
    expect(asset[0]!.message).toContain('ghost-char');
  });

  it('flags CharacterPlacement.characterId that is not declared in npc/ (negative)', () => {
    const issues = npcVisualsIssuesOf('broken-dangling-refs');
    const character = issues.filter((i) => i.category === 'npcVisuals.characterId');
    expect(character).toHaveLength(1);
    expect(character[0]!.message).toContain('ghost-npc');
  });

  it('flags a placement expression that is not a key of the CharacterAsset expressions (negative)', () => {
    const issues = npcVisualsIssuesOf('broken-dangling-refs');
    const expression = issues.filter((i) => i.category === 'npcVisuals.expression');
    expect(expression).toHaveLength(1);
    expect(expression[0]!.message).toContain('laugh');
    expect(expression[0]!.message).toContain('char-guide');
  });

  it('does not double-report expression errors when the characterId root cause already failed (no cascade)', () => {
    const issues = npcVisualsIssuesOf('broken-dangling-refs');
    const character = issues.filter((i) => i.category === 'npcVisuals.characterId');
    const expression = issues.filter((i) => i.category === 'npcVisuals.expression');
    expect(character).toHaveLength(1);
    expect(expression).toHaveLength(1);
    expect(character[0]!.file).toBe('scenes/scene-start.json');
    expect(expression[0]!.file).toBe('scenes/scene-2.json');
  });

  it('does not double-report expression errors when the asset root cause already failed (no cascade)', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/valid-minimal`);
    const schemaResult = runSchemaValidation(raw);
    schemaResult.npc.passed[0]!.value.characterAssetId = 'ghost-char';
    const issues = runNpcVisualsChecks(schemaResult, buildReferenceIndex(schemaResult));
    const asset = issues.filter((i) => i.category === 'npcVisuals.characterAssetId');
    const expression = issues.filter((i) => i.category === 'npcVisuals.expression');
    expect(asset).toHaveLength(1);
    expect(expression).toHaveLength(0);
  });
});
