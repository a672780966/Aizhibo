import { describe, expect, it } from 'vitest';
import type {
  NarrativeBlock,
  ResultNarrative,
  WorldState,
} from '@interactive-story/chapter-schema';
import { composeSingleNarrative } from './composeSingle.js';

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

function block(
  id: string,
  slot: NarrativeBlock['slot'],
  text: string,
  when?: NarrativeBlock['when'],
): [string, NarrativeBlock] {
  return [id, { id, slot, text, when }];
}

const blocks = new Map<string, NarrativeBlock>([
  block('prefix', 'PREFIX', 'prefix-text'),
  block('sup1', 'SUPPORT', 'support-1'),
  block('sup2', 'SUPPORT', 'support-2'),
  block('primary', 'PRIMARY', 'primary-text'),
  block('urgency', 'URGENCY', 'urgency-text'),
  block('transition', 'TRANSITION', 'transition-text'),
]);

const allSlots: ResultNarrative = {
  id: 'n',
  primaryBlockId: 'primary',
  supportBlockIds: ['sup1', 'sup2'],
  urgencyBlockId: 'urgency',
  transitionBlockId: 'transition',
  prefixBlockId: 'prefix',
  focus: { priority: 1, category: 'FIGHT', urgency: 'NONE' },
};

describe('composeSingleNarrative (T003)', () => {
  it('joins all five slots in PREFIX->SUPPORT->PRIMARY->URGENCY->TRANSITION order', () => {
    expect(composeSingleNarrative(allSlots, blocks, state())).toBe(
      'prefix-text support-1 support-2 primary-text urgency-text transition-text',
    );
  });

  it('omits missing optional slots without affecting the rest', () => {
    const noOptional: ResultNarrative = {
      id: 'n',
      primaryBlockId: 'primary',
      supportBlockIds: ['sup1', 'sup2'],
      transitionBlockId: 'transition',
      focus: { priority: 1, category: 'FIGHT', urgency: 'NONE' },
    };
    expect(composeSingleNarrative(noOptional, blocks, state())).toBe(
      'support-1 support-2 primary-text transition-text',
    );
  });

  it('omits blocks whose when condition is unmet, keeping the others', () => {
    const condBlocks = new Map([
      block('primary', 'PRIMARY', 'primary-text', {
        path: { container: 'flags', key: 'torchLit' },
        op: 'EQ',
        value: false,
      }),
      block('prefix', 'PREFIX', 'prefix-text', {
        path: { container: 'flags', key: 'torchLit' },
        op: 'EQ',
        value: true,
      }),
    ]);
    const n: ResultNarrative = {
      id: 'n',
      primaryBlockId: 'primary',
      prefixBlockId: 'prefix',
      focus: { priority: 1, category: 'FIGHT', urgency: 'NONE' },
    };
    expect(composeSingleNarrative(n, condBlocks, state())).toBe('prefix-text');
  });

  it('undefined when is treated as always true', () => {
    const n: ResultNarrative = {
      id: 'n',
      primaryBlockId: 'primary',
      focus: { priority: 1, category: 'FIGHT', urgency: 'NONE' },
    };
    expect(composeSingleNarrative(n, blocks, state())).toBe('primary-text');
  });

  it('missing primary block still returns the other assembled slots', () => {
    const withoutPrimary = new Map([...blocks]);
    withoutPrimary.delete('primary');
    const n: ResultNarrative = {
      id: 'n',
      primaryBlockId: 'primary',
      prefixBlockId: 'prefix',
      focus: { priority: 1, category: 'FIGHT', urgency: 'NONE' },
    };
    expect(composeSingleNarrative(n, withoutPrimary, state())).toBe('prefix-text');
  });

  it('completely absent blocks degrade to an empty string', () => {
    expect(composeSingleNarrative(allSlots, new Map(), state())).toBe('');
  });
});
