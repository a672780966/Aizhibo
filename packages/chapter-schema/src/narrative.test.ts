import { describe, expect, it } from 'vitest';
import { NarrativeBlockSchema, ResultNarrativeSchema } from './narrative.js';

describe('NarrativeBlock', () => {
  it('parses blocks in every slot', () => {
    for (const slot of ['PREFIX', 'SUPPORT', 'PRIMARY', 'URGENCY', 'TRANSITION']) {
      expect(NarrativeBlockSchema.safeParse({ id: `b-${slot}`, slot, text: 'text' }).success).toBe(
        true,
      );
    }
  });

  it('rejects a block with a slot outside the five', () => {
    expect(NarrativeBlockSchema.safeParse({ id: 'b-x', slot: 'EPILOGUE', text: 't' }).success).toBe(
      false,
    );
  });

  it('parses a block with a when condition', () => {
    const block = {
      id: 'b-1',
      slot: 'PRIMARY',
      text: 'The gate opens.',
      when: { path: { container: 'flags', key: 'gateOpen' }, op: 'EQ', value: true },
    };
    expect(NarrativeBlockSchema.parse(block).tone).toBeUndefined();
  });
});

describe('ResultNarrative', () => {
  it('parses a valid result narrative', () => {
    const narrative = {
      id: 'narr-open-gate',
      primaryBlockId: 'b-primary',
      supportBlockIds: ['b-support-1'],
      urgencyBlockId: 'b-urgency',
      transitionBlockId: 'b-transition',
      prefixBlockId: 'b-prefix',
      focus: { priority: 10, category: 'PROGRESS', urgency: 'MEDIUM' },
    };
    expect(ResultNarrativeSchema.parse(narrative).focus.category).toBe('PROGRESS');
  });

  it('rejects focus.urgency outside the four levels', () => {
    const narrative = {
      id: 'narr-x',
      primaryBlockId: 'b-p',
      focus: { priority: 1, category: 'C', urgency: 'CRITICAL' },
    };
    expect(ResultNarrativeSchema.safeParse(narrative).success).toBe(false);
  });
});
