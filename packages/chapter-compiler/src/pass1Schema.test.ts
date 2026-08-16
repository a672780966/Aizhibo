import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadChapterPack } from './loader.js';
import { countSchemaFailures, runSchemaValidation } from './pass1Schema.js';

const fixtureRoot = fileURLToPath(new URL('../test-fixtures', import.meta.url));

describe('runSchemaValidation — valid-minimal', () => {
  it('passes all 19 content categories with zero failures', () => {
    const { raw, issues } = loadChapterPack(`${fixtureRoot}/valid-minimal`);
    expect(issues).toEqual([]);
    const result = runSchemaValidation(raw);

    expect(result.manifest.passed).not.toBeNull();
    expect(result.storyGraph.passed).not.toBeNull();
    expect(result.initialState.passed).not.toBeNull();
    expect(result.worldRules.passed).not.toBeNull();
    expect(result.hostPublic.passed).not.toBeNull();

    expect(result.scenes.passed).toHaveLength(1);
    expect(result.interactions.passed).toHaveLength(2);
    expect(result.actions.passed).toHaveLength(2);
    expect(result.dice.passed).toHaveLength(1);
    expect(result.results.passed).toHaveLength(2);
    expect(result.stateRules.passed).toHaveLength(1);
    expect(result.narrative.passed).toHaveLength(4);
    expect(result.npc.passed).toHaveLength(1);
    expect(result.recovery.passed).toHaveLength(1);
    expect(result.boss.passed).toHaveLength(1);
    expect(result.endings.passed).toHaveLength(1);
    expect(result.visuals.passed).toHaveLength(7);
    expect(result.audio.passed).toHaveLength(3);
    expect(result.metadata.passed).toHaveLength(1);

    expect(countSchemaFailures(result)).toBe(0);
  });

  it('classifies narrative files into result narratives and blocks', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/valid-minimal`);
    const result = runSchemaValidation(raw);
    const resultNarratives = result.narrative.passed.filter((e) => 'focus' in e.value);
    const blocks = result.narrative.passed.filter((e) => 'slot' in e.value);
    expect(resultNarratives.map((e) => e.value.id).sort()).toEqual([
      'narr-follow-failure',
      'narr-follow-success',
    ]);
    expect(blocks.map((e) => e.value.id).sort()).toEqual([
      'block-follow-failure',
      'block-follow-success',
    ]);
  });
});

describe('runSchemaValidation — broken-schema', () => {
  it('reports a failure with non-empty ZodIssue[] for each of the 14 subdirectory categories', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/broken-schema`);
    const result = runSchemaValidation(raw);

    const expectFailure = (failed: { file: string; issues: unknown[] }[], file: string) => {
      const failure = failed.find((f) => f.file.endsWith(file));
      expect(failure, `expected failure for ${file}`).toBeDefined();
      expect(failure!.issues.length).toBeGreaterThan(0);
    };

    expectFailure(result.scenes.failed, 'scenes/scene-bad.json');
    expectFailure(result.interactions.failed, 'interactions/interaction-bad.json');
    expectFailure(result.actions.failed, 'actions/action-bad.json');
    expectFailure(result.dice.failed, 'dice/dice-bad.json');
    expectFailure(result.results.failed, 'results/result-bad.json');
    expectFailure(result.stateRules.failed, 'state-rules/rules-bad.json');
    expectFailure(result.narrative.failed, 'narrative/narr-bad.json');
    expectFailure(result.npc.failed, 'npc/npc-bad.json');
    expectFailure(result.recovery.failed, 'recovery/recovery-bad.json');
    expectFailure(result.boss.failed, 'boss/boss-bad.json');
    expectFailure(result.endings.failed, 'endings/ending-bad.json');
    expectFailure(result.visuals.failed, 'visuals/vs-bad.json');
    expectFailure(result.audio.failed, 'audio/audio-bad.json');
    expectFailure(result.metadata.failed, 'metadata/meta-bad.json');
  });

  it('keeps valid entries passing alongside failed ones', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/broken-schema`);
    const result = runSchemaValidation(raw);

    expect(result.scenes.passed.map((e) => e.value.id)).toContain('scene-ok');
    expect(result.interactions.passed.map((e) => e.value.id)).toContain('interaction-ok');
    expect(result.actions.passed.map((e) => e.value.id)).toContain('action-ok');
    expect(result.dice.passed.map((e) => e.value.id)).toContain('dice-ok');
    expect(result.results.passed.map((e) => e.value.id)).toContain('result-ok');
    expect(result.stateRules.passed.map((e) => e.value.id)).toContain('rules-ok');
    expect(result.narrative.passed.map((e) => e.value.id)).toContain('narr-ok');
    expect(result.npc.passed.map((e) => e.value.id)).toContain('npc-ok');
    expect(result.recovery.passed.map((e) => e.value.id)).toContain('recovery-ok');
    expect(result.boss.passed.map((e) => e.value.id)).toContain('boss-ok');
    expect(result.endings.passed.map((e) => e.value.id)).toContain('ending-ok');
    expect(result.visuals.passed.map((e) => e.value.id)).toContain('vs-ok');
    expect(result.audio.passed.map((e) => e.value.id)).toContain('audio-ok');
    expect(result.metadata.passed.map((e) => e.file)).toContain('metadata/meta-ok.json');
  });

  it('preserves raw ZodIssue structure (path/message/code)', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/broken-schema`);
    const result = runSchemaValidation(raw);
    const sceneFailure = result.scenes.failed.find((f) => f.file.endsWith('scene-bad.json'))!;
    const issue = sceneFailure.issues[0]!;
    expect(issue).toHaveProperty('path');
    expect(issue).toHaveProperty('message');
    expect(issue).toHaveProperty('code');
    expect(sceneFailure.issues.some((i) => i.path.join('.') === 'id')).toBe(true);
  });
});

describe('runSchemaValidation — broken-roots', () => {
  it('reports failures for all five root files', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/broken-roots`);
    const result = runSchemaValidation(raw);

    expect(result.manifest.failed).toHaveLength(1);
    expect(result.storyGraph.failed).toHaveLength(1);
    expect(result.initialState.failed).toHaveLength(1);
    expect(result.worldRules.failed).toHaveLength(1);
    expect(result.hostPublic.failed).toHaveLength(1);

    expect(result.manifest.passed).toBeNull();
    expect(result.storyGraph.passed).toBeNull();
    expect(countSchemaFailures(result)).toBe(5);
  });
});
