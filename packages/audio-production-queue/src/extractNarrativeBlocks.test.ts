import { describe, expect, it } from 'vitest';
import type { SchemaValidationResult } from '@interactive-story/chapter-compiler';
import { extractNarrativeBlocks } from './extractNarrativeBlocks.js';

/**
 * Hand-built minimal SchemaValidationResult: only the `narrative` collection
 * is populated realistically; every other section is an empty placeholder
 * that satisfies the type. Per A07/A08/A09:
 * - `narrative.passed` mixes NarrativeBlocks (with `text`) and ResultNarrative
 *   index records (with `primaryBlockId`, no `text`),
 * - the block entries are inserted in reverse id order (`block-zulu` first,
 *   `block-mike` in the middle, `block-alpha` last) so a buggy non-sorting
 *   implementation fails the order assertion,
 * - `narrative.failed` carries one validation-failure entry.
 */
function buildSchemaResult(): SchemaValidationResult {
  return {
    manifest: { passed: null, failed: [] },
    storyGraph: { passed: null, failed: [] },
    initialState: { passed: null, failed: [] },
    worldRules: { passed: null, failed: [] },
    hostPublic: { passed: null, failed: [] },
    scenes: { passed: [], failed: [] },
    interactions: { passed: [], failed: [] },
    actions: { passed: [], failed: [] },
    dice: { passed: [], failed: [] },
    results: { passed: [], failed: [] },
    stateRules: { passed: [], failed: [] },
    npc: { passed: [], failed: [] },
    recovery: { passed: [], failed: [] },
    boss: { passed: [], failed: [] },
    endings: { passed: [], failed: [] },
    visuals: { passed: [], failed: [] },
    audio: { passed: [], failed: [] },
    metadata: { passed: [], failed: [] },
    narrative: {
      passed: [
        // A ResultNarrative index record inserted first: no `text`, must be skipped.
        {
          file: 'narrative/narr-zulu.json',
          value: {
            id: 'narr-zulu',
            primaryBlockId: 'block-zulu',
            supportBlockIds: [],
            focus: { priority: 2, category: 'follow', urgency: 'NONE' },
          },
        },
        {
          file: 'narrative/block-zulu.json',
          value: { id: 'block-zulu', slot: 'PRIMARY', text: 'zulu text' },
        },
        {
          file: 'narrative/block-mike.json',
          value: { id: 'block-mike', slot: 'SUPPORT', text: 'mike text', tone: 'calm' },
        },
        // Another ResultNarrative in the middle: must be skipped too.
        {
          file: 'narrative/narr-alpha.json',
          value: {
            id: 'narr-alpha',
            primaryBlockId: 'block-alpha',
            supportBlockIds: [],
            focus: { priority: 1, category: 'follow', urgency: 'LOW' },
          },
        },
        {
          file: 'narrative/block-alpha.json',
          value: { id: 'block-alpha', slot: 'PREFIX', text: 'alpha text' },
        },
      ],
      failed: [{ file: 'narrative/broken-block.json', issues: [] }],
    },
  };
}

describe('extractNarrativeBlocks', () => {
  it('A07: returns exactly the NarrativeBlock entries — ResultNarrative index records are skipped', () => {
    const result = extractNarrativeBlocks(buildSchemaResult());
    expect(result).toEqual([
      { id: 'block-alpha', slot: 'PREFIX', text: 'alpha text' },
      { id: 'block-mike', slot: 'SUPPORT', text: 'mike text' },
      { id: 'block-zulu', slot: 'PRIMARY', text: 'zulu text' },
    ]);
  });

  it('A08: failed validation entries are silently ignored — no crash, no output from them', () => {
    // buildSchemaResult() already carries one narrative.failed entry.
    expect(() => extractNarrativeBlocks(buildSchemaResult())).not.toThrow();
    const result = extractNarrativeBlocks(buildSchemaResult());
    expect(result.some((block) => block.id.includes('broken'))).toBe(false);
  });

  it('A09: output is sorted by id in lexicographic order', () => {
    const result = extractNarrativeBlocks(buildSchemaResult());
    const ids = result.map((block) => block.id);
    expect(ids).toEqual([...ids].sort());
    expect(ids).toEqual(['block-alpha', 'block-mike', 'block-zulu']);
  });
});
