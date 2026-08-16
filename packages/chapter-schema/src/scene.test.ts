import { describe, expect, it } from 'vitest';
import { CharacterPlacementSchema, HostPolicySchema, SceneNodeSchema } from './scene.js';

const validScene = {
  id: 'scene-opening',
  visualSceneId: 'vs-opening',
  narration: ['The wind howls.'],
  characters: [{ characterId: 'npc-guard', slot: 'CENTER', visible: true }],
  bgm: 'bgm-main',
  ambience: ['amb-wind'],
  interactionId: 'int-gate',
  next: 'scene-hall',
  guards: [
    {
      when: { path: { container: 'flags', key: 'foundKey' }, op: 'EQ', value: true },
      goto: 'scene-secret',
      priority: 1,
    },
  ],
  hostPolicy: 'ALLOWED',
};

describe('SceneNode', () => {
  it('parses a valid scene', () => {
    expect(SceneNodeSchema.parse(validScene).hostPolicy).toBe('ALLOWED');
  });

  it('rejects a scene with an invalid slot', () => {
    const bad = {
      ...validScene,
      characters: [{ characterId: 'npc-guard', slot: 'FRONT', visible: true }],
    };
    expect(SceneNodeSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a scene missing hostPolicy', () => {
    const bad = {
      id: 'scene-opening',
      visualSceneId: 'vs-opening',
      characters: [{ characterId: 'npc-guard', slot: 'CENTER', visible: true }],
      next: 'scene-hall',
    };
    expect(SceneNodeSchema.safeParse(bad).success).toBe(false);
  });
});

describe('CharacterPlacement', () => {
  it('parses each of the five fixed slots', () => {
    for (const slot of ['LEFT', 'CENTER_LEFT', 'CENTER', 'CENTER_RIGHT', 'RIGHT']) {
      expect(
        CharacterPlacementSchema.safeParse({ characterId: 'c', slot, visible: true }).success,
      ).toBe(true);
    }
  });

  it('rejects a slot outside the five', () => {
    expect(
      CharacterPlacementSchema.safeParse({ characterId: 'c', slot: 'BACK', visible: true }).success,
    ).toBe(false);
  });
});

describe('HostPolicy', () => {
  it('parses all three policies', () => {
    for (const p of ['ALLOWED', 'LIMITED', 'MUTED']) {
      expect(HostPolicySchema.safeParse(p).success).toBe(true);
    }
  });
});
