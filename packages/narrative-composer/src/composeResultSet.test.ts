import { describe, expect, it } from 'vitest';
import type {
  NarrativeBlock,
  ResultNarrative,
  WorldState,
} from '@interactive-story/chapter-schema';
import { composeResultSetNarration } from './composeResultSet.js';

function state(): WorldState {
  return {
    chapterId: 'c',
    sceneId: 's1',
    flags: { torchLit: true },
    npc: {},
    danger: { level: 0, tensionKey: 'calm' },
    discovered: [],
    activeThreats: [],
    chapterVariables: {},
  };
}

function block(id: string, slot: NarrativeBlock['slot'], text: string): [string, NarrativeBlock] {
  return [id, { id, slot, text }];
}

const blocks = new Map<string, NarrativeBlock>([
  block('prefix', 'PREFIX', 'prefix-text'),
  block('sup1', 'SUPPORT', 'support-1'),
  block('primary-a', 'PRIMARY', 'primary-a'),
  block('urgency', 'URGENCY', 'urgency-text'),
  block('transition', 'TRANSITION', 'transition-text'),
  block('primary-s', 'PRIMARY', 'brief-s'),
  block('primary-c', 'PRIMARY', 'brief-c'),
]);

function fullNarrative(
  id: string,
  primaryBlockId: string,
  priority: number,
  category: string,
  urgency: ResultNarrative['focus']['urgency'],
): ResultNarrative {
  const focus = { priority, category, urgency };
  if (id === 'a') {
    return {
      id,
      primaryBlockId,
      supportBlockIds: ['sup1'],
      urgencyBlockId: 'urgency',
      transitionBlockId: 'transition',
      prefixBlockId: 'prefix',
      focus,
    };
  }
  return { id, primaryBlockId, focus };
}

describe('composeResultSetNarration (T005)', () => {
  it('single narrative -> full composed text, no deferred ids', () => {
    const a = fullNarrative('a', 'primary-a', 10, 'FIGHT', 'NONE');
    const r = composeResultSetNarration([a], blocks, state());
    expect(r.text).toBe('prefix-text support-1 primary-a urgency-text transition-text');
    expect(r.deferredNarrativeIds).toEqual([]);
  });

  it('multiple narratives -> PRIMARY full + SUPPORT/CONTEXT brief, DEFERRED absent from text but listed', () => {
    const a = fullNarrative('a', 'primary-a', 10, 'FIGHT', 'NONE'); // primary
    const s = fullNarrative('s', 'primary-s', 4, 'FIGHT', 'NONE'); // support
    const c = fullNarrative('c', 'primary-c', 3, 'TALK', 'MEDIUM'); // context
    const d = {
      id: 'd',
      primaryBlockId: 'primary-d',
      focus: { priority: 1, category: 'REACTION', urgency: 'NONE' as const },
    };
    const r = composeResultSetNarration([a, s, c, d], blocks, state());
    // PRIMARY full text present
    expect(r.text).toContain('prefix-text support-1 primary-a urgency-text transition-text');
    // SUPPORT/CONTEXT brief primary-slot sentences present
    expect(r.text).toContain('brief-s');
    expect(r.text).toContain('brief-c');
    // DEFERRED text never appears, but its id is listed
    expect(r.text).not.toContain('primary-d');
    expect(r.deferredNarrativeIds).toEqual(['d']);
    // single-space concatenation across all three segments
    expect(r.text).toBe(
      'prefix-text support-1 primary-a urgency-text transition-text brief-s brief-c',
    );
  });

  it('a support/context entry with a missing or failing primary block is skipped, not an error', () => {
    const a = fullNarrative('a', 'primary-a', 10, 'FIGHT', 'NONE'); // primary
    const sMiss = fullNarrative('s', 'ghost', 4, 'FIGHT', 'NONE'); // support block missing
    const r = composeResultSetNarration([a, sMiss], blocks, state());
    expect(r.text).toBe('prefix-text support-1 primary-a urgency-text transition-text');
    expect(r.deferredNarrativeIds).toEqual([]);
  });
});
