import { describe, expect, it } from 'vitest';
import { DangerStateSchema, NPCStateSchema, WorldStateSchema } from './worldState.js';

const validWorldState = {
  chapterId: 'ch-001',
  sceneId: 'scene-opening',
  flags: { torchLit: true, foundKey: true },
  npc: {
    'npc-guard': { present: true, alive: true, disposition: 'NEUTRAL', flags: { patrol: true } },
  },
  danger: { level: 0, tensionKey: 'tension-calm' },
  discovered: ['room-1'],
  activeThreats: [],
  chapterVariables: { bossHp: 100, phase: 'p1' },
};

describe('WorldState', () => {
  it('parses a valid world state', () => {
    expect(WorldStateSchema.parse(validWorldState).flags.torchLit).toBe(true);
  });

  it('rejects a world state missing danger', () => {
    const bad = {
      chapterId: 'ch-001',
      sceneId: 'scene-opening',
      flags: { torchLit: true },
      npc: {},
      discovered: [],
      activeThreats: [],
      chapterVariables: {},
    };
    expect(WorldStateSchema.safeParse(bad).success).toBe(false);
  });
});

describe('DangerState', () => {
  it('parses level 0', () => {
    expect(DangerStateSchema.parse({ level: 0, tensionKey: 'calm' }).level).toBe(0);
  });

  it('rejects a negative level', () => {
    expect(DangerStateSchema.safeParse({ level: -1, tensionKey: 'calm' }).success).toBe(false);
  });
});

describe('NPCState', () => {
  it('parses a valid npc state', () => {
    expect(
      NPCStateSchema.parse({ present: true, alive: false, disposition: 'HOSTILE', flags: {} })
        .alive,
    ).toBe(false);
  });

  it('rejects an unknown disposition', () => {
    expect(
      NPCStateSchema.safeParse({ present: true, alive: true, disposition: 'SHY', flags: {} })
        .success,
    ).toBe(false);
  });
});
