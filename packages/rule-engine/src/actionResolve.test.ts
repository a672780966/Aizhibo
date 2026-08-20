import { describe, expect, it } from 'vitest';
import type {
  ActionDefinition,
  Quality,
  ResultDictionary,
  WorldRules,
  WorldState,
} from '@interactive-story/chapter-schema';
import { resolveAction } from './actionResolve.js';

const worldRules: WorldRules = {
  viewerDefaults: { hp: 3, life: 2 },
  downedPolicy: 'AUTO_SPEND_LIFE',
  defaultScaleBands: [
    { scale: 'SOLO', minParticipants: 1, maxParticipants: 1 },
    { scale: 'SMALL', minParticipants: 2, maxParticipants: 3 },
    { scale: 'MEDIUM', minParticipants: 4, maxParticipants: 6 },
    { scale: 'LARGE', minParticipants: 7, maxParticipants: 10 },
    { scale: 'MASS', minParticipants: 11, maxParticipants: null },
  ],
  defaultDiceProfileId: 'dice-standard',
  interactionDefaults: {
    openDurationMs: 15000,
    noParticipationPolicy: { kind: 'SKIP' },
  },
  diceBuffer: { minDiceMs: 3000, targetDiceMs: 6000, maxDiceMs: 12000 },
};

function worldState(): WorldState {
  return {
    chapterId: 'c',
    sceneId: 's1',
    flags: {},
    npc: {},
    danger: { level: 0, tensionKey: 'calm' },
    discovered: [],
    activeThreats: [],
    chapterVariables: {},
  };
}

const action: ActionDefinition = {
  id: 'action-fight',
  actionType: 'FIGHT',
  diceProfileId: 'dice-standard',
  resultSetId: 'result-fight',
};

function dice(quality: Quality | undefined): {
  seed: string;
  rollIndex: number;
  diceType: string;
  rawValue: number;
  modifier: number;
  finalValue: number;
  quality: Quality | undefined;
  appliedModifiers: { amount: number; reason: string }[];
} {
  return {
    seed: 's',
    rollIndex: 0,
    diceType: 'd20',
    rawValue: 15,
    modifier: 0,
    finalValue: 15,
    quality,
    appliedModifiers: [],
  };
}

// Covers DISASTER (mapsTo FAILURE), FAILURE..GREAT_SUCCESS (full), SPECIAL (unreachable)
const resultDict: ResultDictionary = {
  id: 'result-fight',
  entries: [
    { quality: 'DISASTER', mapsTo: 'FAILURE' },
    {
      quality: 'FAILURE',
      resultId: 'res-failure',
      worldEffects: [],
      playerEffects: [],
      narrativeId: 'narr-failure',
      visibility: 'PUBLIC',
    },
    {
      quality: 'COSTLY_SUCCESS',
      resultId: 'res-costly',
      worldEffects: [],
      playerEffects: [],
      narrativeId: 'narr-costly',
      visibility: 'DEFERRED',
    },
    { quality: 'SPECIAL', unreachable: true },
  ],
};

describe('resolveAction (T004)', () => {
  it('full result: returns the entry directly with the matched quality', () => {
    const result = resolveAction(
      {
        chapterId: 'c',
        sceneId: 's',
        interactionId: 'i',
        actionId: 'action-fight',
        participantCount: 2,
        dice: dice('COSTLY_SUCCESS'),
        worldState: worldState(),
      },
      action,
      worldRules,
      resultDict,
    );
    expect(result).toEqual({
      actionId: 'action-fight',
      scale: 'SMALL', // 2 participants (uses worldRules.defaultScaleBands)
      quality: 'COSTLY_SUCCESS',
      resultId: 'res-costly',
      worldEffects: [],
      playerEffects: [],
      narrativeId: 'narr-costly',
      visibility: 'DEFERRED',
    });
  });

  it('mapsTo single hop: resolves to the target full entry', () => {
    const result = resolveAction(
      {
        chapterId: 'c',
        sceneId: 's',
        interactionId: 'i',
        actionId: 'action-fight',
        participantCount: 1,
        dice: dice('DISASTER'),
        worldState: worldState(),
      },
      action,
      worldRules,
      resultDict,
    );
    expect(result?.quality).toBe('FAILURE');
    expect(result?.resultId).toBe('res-failure');
    expect(result?.scale).toBe('SOLO');
  });

  it('unreachable target: returns undefined', () => {
    const result = resolveAction(
      {
        chapterId: 'c',
        sceneId: 's',
        interactionId: 'i',
        actionId: 'action-fight',
        participantCount: 2,
        dice: dice('SPECIAL'),
        worldState: worldState(),
      },
      action,
      worldRules,
      resultDict,
    );
    expect(result).toBeUndefined();
  });

  it('undefined rolled quality: returns undefined', () => {
    const result = resolveAction(
      {
        chapterId: 'c',
        sceneId: 's',
        interactionId: 'i',
        actionId: 'action-fight',
        participantCount: 2,
        dice: dice(undefined),
        worldState: worldState(),
      },
      action,
      worldRules,
      resultDict,
    );
    expect(result).toBeUndefined();
  });

  it('no entry for the rolled quality: returns undefined', () => {
    const sparse: ResultDictionary = {
      id: 'r',
      entries: [
        {
          quality: 'SUCCESS',
          resultId: 'x',
          worldEffects: [],
          playerEffects: [],
          narrativeId: 'n',
          visibility: 'PUBLIC',
        },
      ],
    };
    const result = resolveAction(
      {
        chapterId: 'c',
        sceneId: 's',
        interactionId: 'i',
        actionId: 'action-fight',
        participantCount: 2,
        dice: dice('FAILURE'),
        worldState: worldState(),
      },
      action,
      worldRules,
      sparse,
    );
    expect(result).toBeUndefined();
  });

  it('malformed mapsTo->mapsTo chain: returns undefined, does not throw or loop', () => {
    const chained: ResultDictionary = {
      id: 'r',
      entries: [
        { quality: 'DISASTER', mapsTo: 'FAILURE' },
        { quality: 'FAILURE', mapsTo: 'DISASTER' },
        {
          quality: 'SUCCESS',
          resultId: 'x',
          worldEffects: [],
          playerEffects: [],
          narrativeId: 'n',
          visibility: 'PUBLIC',
        },
      ],
    };
    const result = resolveAction(
      {
        chapterId: 'c',
        sceneId: 's',
        interactionId: 'i',
        actionId: 'action-fight',
        participantCount: 2,
        dice: dice('DISASTER'),
        worldState: worldState(),
      },
      action,
      worldRules,
      chained,
    );
    expect(result).toBeUndefined();
  });

  it('uses action.scaleBands when provided (overrides worldRules default)', () => {
    const actionWithBands: ActionDefinition = {
      ...action,
      scaleBands: [{ scale: 'LARGE', minParticipants: 1, maxParticipants: 2 }],
    };
    const result = resolveAction(
      {
        chapterId: 'c',
        sceneId: 's',
        interactionId: 'i',
        actionId: 'action-fight',
        participantCount: 1,
        dice: dice('SUCCESS'),
        worldState: worldState(),
      },
      actionWithBands,
      worldRules,
      {
        id: 'r',
        entries: [
          {
            quality: 'SUCCESS',
            resultId: 'x',
            worldEffects: [],
            playerEffects: [],
            narrativeId: 'n',
            visibility: 'PUBLIC',
          },
        ],
      },
    );
    expect(result?.scale).toBe('LARGE');
  });
});
