import { describe, expect, it } from 'vitest';
import type { NoParticipationPolicy } from './manifest.js';
import { ChoiceSchema, InteractionNodeSchema } from './interaction.js';

const validInteraction = {
  id: 'int-gate',
  promptAudioId: 'audio-prompt',
  openDurationMs: 30000,
  choices: [
    { id: 'A', label: 'Open the gate', actionType: 'LIFT', ruleId: 'rule-lift' },
    {
      id: 'B',
      label: 'Knock',
      actionType: 'SEARCH',
      ruleId: 'rule-search',
      visibleIf: [{ path: { container: 'flags', key: 'foundKey' }, op: 'EQ', value: true }],
    },
  ],
  diceMode: 'PER_ACTION_GROUP',
  resultPolicy: 'majority',
  nextScene: 'scene-hall',
  noParticipationPolicy: { kind: 'DEFAULT_CHOICE', choiceId: 'A' },
};

describe('InteractionNode', () => {
  it('parses a valid interaction', () => {
    expect(InteractionNodeSchema.parse(validInteraction).diceMode).toBe('PER_ACTION_GROUP');
  });

  it('rejects an interaction missing noParticipationPolicy', () => {
    const bad = {
      id: 'int-gate',
      openDurationMs: 30000,
      choices: [{ id: 'A', label: 'Open the gate', actionType: 'LIFT', ruleId: 'rule-lift' }],
      diceMode: 'PER_ACTION_GROUP',
      resultPolicy: 'majority',
      nextScene: 'scene-hall',
    };
    expect(InteractionNodeSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an interaction with an invalid choice id', () => {
    const bad = {
      ...validInteraction,
      choices: [{ id: 'E', label: 'x', actionType: 'SEARCH', ruleId: 'r' }],
    };
    expect(InteractionNodeSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a thenFallback whose kind is HOLD at runtime', () => {
    const bad = {
      ...validInteraction,
      noParticipationPolicy: {
        kind: 'HOLD',
        extendMs: 15000,
        maxExtensions: 2,
        thenFallback: {
          kind: 'HOLD',
          extendMs: 5000,
          maxExtensions: 1,
          thenFallback: { kind: 'SKIP' },
        },
      },
    };
    expect(InteractionNodeSchema.safeParse(bad).success).toBe(false);
  });

  it('forbids thenFallback.kind = HOLD at the type level', () => {
    const invalid: NoParticipationPolicy = {
      kind: 'HOLD',
      extendMs: 15000,
      maxExtensions: 2,
      // @ts-expect-error thenFallback must not allow kind HOLD
      thenFallback: { kind: 'HOLD' },
    };
    expect(
      InteractionNodeSchema.safeParse({ ...validInteraction, noParticipationPolicy: invalid })
        .success,
    ).toBe(false);
  });
});

describe('Choice', () => {
  it('parses a choice with visibleIf conditions', () => {
    const choice = {
      id: 'A',
      label: 'Search',
      actionType: 'SEARCH',
      ruleId: 'rule-search',
      visibleIf: [{ any: [{ path: { container: 'flags', key: 'a' }, op: 'EXISTS' }] }],
    };
    expect(ChoiceSchema.parse(choice).id).toBe('A');
  });
});
