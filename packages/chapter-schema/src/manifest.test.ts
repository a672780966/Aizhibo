import { describe, expect, it } from 'vitest';
import {
  ChapterManifestSchema,
  NoParticipationPolicySchema,
  StoryGraphSchema,
  WorldRulesSchema,
} from './manifest.js';

const validManifest = {
  schemaVersion: '1.0.0',
  chapterId: 'ch-001',
  chapterVersion: '1.2.0',
  title: 'The Lighthouse',
  entryNodeId: 'scene-opening',
  language: 'zh-CN',
  authoring: {
    generatedBy: 'GPT-5.6 Sol',
    auditedBy: 'Fable 5',
    createdAt: '2026-08-16',
  },
};

describe('ChapterManifest', () => {
  it('parses a valid manifest', () => {
    expect(ChapterManifestSchema.parse(validManifest).chapterId).toBe('ch-001');
  });

  it('rejects a manifest missing entryNodeId', () => {
    const bad = {
      schemaVersion: '1.0.0',
      chapterId: 'ch-001',
      chapterVersion: '1.2.0',
      title: 'The Lighthouse',
      language: 'zh-CN',
      authoring: { createdAt: '2026-08-16' },
    };
    expect(ChapterManifestSchema.safeParse(bad).success).toBe(false);
  });
});

describe('StoryGraph', () => {
  it('parses a graph with SCENE / BOSS / ENDING nodes', () => {
    const graph = {
      nodes: [
        { id: 'scene-opening', kind: 'SCENE', file: 'scenes/opening.json' },
        { id: 'boss-final', kind: 'BOSS', file: 'boss/final.json' },
        { id: 'ending-good', kind: 'ENDING', file: 'endings/good.json' },
      ],
    };
    expect(StoryGraphSchema.parse(graph).nodes).toHaveLength(3);
  });

  it('rejects a node with an unknown kind', () => {
    expect(
      StoryGraphSchema.safeParse({
        nodes: [{ id: 'x', kind: 'CUTSCENE', file: 'scenes/x.json' }],
      }).success,
    ).toBe(false);
  });
});

describe('WorldRules', () => {
  const validRules = {
    viewerDefaults: { hp: 3, life: 2 },
    downedPolicy: 'AUTO_SPEND_LIFE',
    defaultScaleBands: [
      { scale: 'SOLO', minParticipants: 1, maxParticipants: 1 },
      { scale: 'SMALL', minParticipants: 2, maxParticipants: 5 },
      { scale: 'MEDIUM', minParticipants: 6, maxParticipants: 20 },
      { scale: 'LARGE', minParticipants: 21, maxParticipants: 100 },
      { scale: 'MASS', minParticipants: 101, maxParticipants: null },
    ],
    defaultDiceProfileId: 'dice-standard',
    interactionDefaults: {
      openDurationMs: 30000,
      noParticipationPolicy: { kind: 'DEFAULT_CHOICE', choiceId: 'A' },
    },
    diceBuffer: { minDiceMs: 3500, targetDiceMs: 6000, maxDiceMs: 12000 },
  };

  it('parses valid world rules', () => {
    expect(WorldRulesSchema.parse(validRules).downedPolicy).toBe('AUTO_SPEND_LIFE');
  });

  it('rejects diceBuffer violating min <= target <= max', () => {
    const bad = {
      ...validRules,
      diceBuffer: { minDiceMs: 12000, targetDiceMs: 6000, maxDiceMs: 3500 },
    };
    expect(WorldRulesSchema.safeParse(bad).success).toBe(false);
  });
});

describe('NoParticipationPolicy', () => {
  it('parses all three kinds', () => {
    for (const policy of [
      { kind: 'DEFAULT_CHOICE', choiceId: 'C' },
      { kind: 'SKIP' },
      { kind: 'HOLD', extendMs: 15000, maxExtensions: 2, thenFallback: { kind: 'SKIP' } },
    ]) {
      expect(NoParticipationPolicySchema.safeParse(policy).success).toBe(true);
    }
  });

  it('rejects an unknown kind', () => {
    expect(NoParticipationPolicySchema.safeParse({ kind: 'WAIT_FOREVER' }).success).toBe(false);
  });
});
