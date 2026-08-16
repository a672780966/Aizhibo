import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadChapterPack } from './loader.js';
import { runSchemaValidation } from './pass1Schema.js';
import { buildReferenceIndex } from './referenceIndex.js';
import { runStoryGraphChecks } from './pass2StoryGraph.js';

const fixtureRoot = fileURLToPath(new URL('../test-fixtures', import.meta.url));

function storyGraphIssuesOf(fixture: string) {
  const { raw } = loadChapterPack(`${fixtureRoot}/${fixture}`);
  const schemaResult = runSchemaValidation(raw);
  return runStoryGraphChecks(schemaResult, buildReferenceIndex(schemaResult));
}

describe('runStoryGraphChecks', () => {
  it('produces no issues for the valid pack (positive examples)', () => {
    expect(storyGraphIssuesOf('valid-minimal')).toEqual([]);
  });

  it('flags an entryNodeId that is not registered (negative)', () => {
    const issues = storyGraphIssuesOf('broken-dangling-refs');
    const entry = issues.filter((i) => i.category === 'storyGraph.entryNodeId');
    expect(entry).toHaveLength(1);
    expect(entry[0]!.message).toContain('ghost-entry');
    expect(entry[0]!.severity).toBe('BLOCKING');
  });

  it('flags story graph node files that are missing (negative)', () => {
    const issues = storyGraphIssuesOf('broken-dangling-refs');
    const missing = issues.filter((i) => i.category === 'storyGraph.nodeFileMissing');
    expect(missing).toHaveLength(1);
    expect(missing[0]!.message).toContain('scenes/not-there.json');
  });

  it('flags story graph node files whose id mismatches the registry (negative)', () => {
    const issues = storyGraphIssuesOf('broken-dangling-refs');
    const mismatched = issues.filter((i) => i.category === 'storyGraph.nodeIdMismatch');
    expect(mismatched).toHaveLength(1);
    expect(mismatched[0]!.message).toContain('reg-id');
    expect(mismatched[0]!.message).toContain('scene-start');
  });

  it('flags unregistered scene/boss/ending files as orphans (negative)', () => {
    const issues = storyGraphIssuesOf('broken-dangling-refs');
    const orphans = issues.filter((i) => i.category === 'storyGraph.orphanFile');
    expect(orphans).toHaveLength(1);
    expect(orphans[0]!.message).toContain('scenes/orphan-scene.json');
  });

  it('flags SceneNode.next pointing at an unregistered node (negative)', () => {
    const issues = storyGraphIssuesOf('broken-dangling-refs');
    const next = issues.filter((i) => i.category === 'storyGraph.sceneNext');
    expect(next).toHaveLength(1);
    expect(next[0]!.message).toContain('ghost-next');
  });

  it('flags SceneGuard.goto pointing at an unregistered node (negative)', () => {
    const issues = storyGraphIssuesOf('broken-dangling-refs');
    const goto = issues.filter((i) => i.category === 'storyGraph.guardGoto');
    expect(goto).toHaveLength(1);
    expect(goto[0]!.message).toContain('ghost-goto');
  });

  it('flags SceneNode.interactionId pointing at an undeclared interaction (negative)', () => {
    const issues = storyGraphIssuesOf('broken-dangling-refs');
    const interaction = issues.filter((i) => i.category === 'storyGraph.sceneInteractionId');
    expect(interaction).toHaveLength(1);
    expect(interaction[0]!.message).toContain('ghost-interaction');
  });

  it('flags InteractionNode.nextScene pointing at an unregistered node (negative)', () => {
    const issues = storyGraphIssuesOf('broken-dangling-refs');
    const nextScene = issues.filter((i) => i.category === 'storyGraph.interactionNextScene');
    expect(nextScene).toHaveLength(2);
    expect(nextScene.map((i) => i.message).some((m) => m.includes('ghost-next'))).toBe(true);
    expect(nextScene.map((i) => i.message).some((m) => m.includes('somewhere-else'))).toBe(true);
  });

  it('flags BossNode.onDefeat/onFailure pointing at unregistered nodes (negative)', () => {
    const issues = storyGraphIssuesOf('broken-dangling-refs');
    const outgoing = issues.filter((i) => i.category === 'storyGraph.bossOutgoing');
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0]!.message).toContain('ghost-node');
  });

  it('skips all story graph checks when story.graph.json failed PASS 1 (no cascade)', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/broken-roots`);
    const schemaResult = runSchemaValidation(raw);
    const issues = runStoryGraphChecks(schemaResult, buildReferenceIndex(schemaResult));
    expect(issues).toEqual([]);
  });
});
