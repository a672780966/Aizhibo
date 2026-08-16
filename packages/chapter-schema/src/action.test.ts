import { describe, expect, it } from 'vitest';
import { ActionDefinitionSchema } from './action.js';

const validAction = {
  id: 'act-lift-gate',
  actionType: 'LIFT',
  scaleBands: [
    { scale: 'SOLO', minParticipants: 1, maxParticipants: 1 },
    { scale: 'MASS', minParticipants: 2, maxParticipants: null },
  ],
  scaleSemantics: {
    SOLO: 'single person lifts',
    SMALL: 'a few lift',
    MEDIUM: 'a group lifts',
    LARGE: 'many lift',
    MASS: 'crowd lifts together',
  },
  diceProfileId: 'dice-standard',
  resultSetId: 'rs-lift-gate',
};

describe('ActionDefinition', () => {
  it('parses a valid action definition', () => {
    expect(ActionDefinitionSchema.parse(validAction).actionType).toBe('LIFT');
  });

  it('parses an action without scaleBands (falls back to world rules)', () => {
    const minimal = {
      id: 'act-lift-gate',
      actionType: 'LIFT',
      scaleSemantics: {
        SOLO: 's',
        SMALL: 's',
        MEDIUM: 's',
        LARGE: 's',
        MASS: 's',
      },
      diceProfileId: 'dice-standard',
      resultSetId: 'rs-lift-gate',
    };
    expect(ActionDefinitionSchema.safeParse(minimal).success).toBe(true);
  });

  it('rejects an action missing resultSetId', () => {
    const bad = {
      id: 'act-lift-gate',
      actionType: 'LIFT',
      diceProfileId: 'dice-standard',
    };
    expect(ActionDefinitionSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects scaleSemantics keyed outside the five scales', () => {
    const bad = { ...validAction, scaleSemantics: { GIGANTIC: 'nope' } };
    expect(ActionDefinitionSchema.safeParse(bad).success).toBe(false);
  });
});
