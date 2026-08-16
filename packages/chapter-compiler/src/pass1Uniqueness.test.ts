import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadChapterPack } from './loader.js';
import { runSchemaValidation } from './pass1Schema.js';
import { checkIdUniqueness } from './pass1Uniqueness.js';

const fixtureRoot = fileURLToPath(new URL('../test-fixtures', import.meta.url));

function uniquenessOf(fixture: string) {
  const { raw } = loadChapterPack(`${fixtureRoot}/${fixture}`);
  return checkIdUniqueness(runSchemaValidation(raw));
}

describe('checkIdUniqueness', () => {
  it('reports nothing for the valid pack', () => {
    expect(uniquenessOf('valid-minimal')).toEqual([]);
  });

  it('rejects duplicate ids within the scenes collection', () => {
    const issues = uniquenessOf('broken-id-duplicate');
    const sceneIssue = issues.find((i) => i.category === 'scenes');
    expect(sceneIssue).toBeDefined();
    expect(sceneIssue!.id).toBe('shared-id');
    expect(sceneIssue!.conflictingFiles).toEqual(['scenes/scene-a.json', 'scenes/scene-b.json']);
  });

  it('rejects cross-kind id conflicts between scenes and boss files', () => {
    const issues = uniquenessOf('broken-id-cross-kind');
    const crossKind = issues.find((i) => i.category === 'storyGraph.crossKind');
    expect(crossKind).toBeDefined();
    expect(crossKind!.id).toBe('cross-id');
    expect(crossKind!.conflictingFiles).toEqual(['scenes/scene-x.json', 'boss/boss-x.json']);
  });

  it('rejects duplicate ids inside story.graph.json nodes (registry namespace)', () => {
    const issues = uniquenessOf('broken-id-cross-kind');
    const registry = issues.find((i) => i.category === 'storyGraph.nodes');
    expect(registry).toBeDefined();
    expect(registry!.id).toBe('dup-node');
    expect(registry!.conflictingFiles).toEqual(['story.graph.json', 'story.graph.json']);
  });

  it('does not mix the cross-kind check with the within-collection check', () => {
    const issues = uniquenessOf('broken-id-cross-kind');
    const categories = issues.map((i) => i.category);
    expect(categories).toContain('storyGraph.crossKind');
    expect(categories).toContain('storyGraph.nodes');
    expect(categories).not.toContain('scenes');
    expect(categories).not.toContain('bossNodes');
  });
});
