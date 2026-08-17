import { describe, expect, it } from 'vitest';
import { HostPublicSpecSchema, SceneDisclosureSchema } from './hostPublic.js';

const validSpec = {
  flagVisibility: { torchLit: 'PUBLIC', foundKey: 'HIDDEN' },
  sceneDisclosures: {
    'scene-opening': {
      locationLabel: 'The Cliff',
      knownFactIds: ['fact-lighthouse'],
      tensionKey: 'tension-calm',
    },
  },
  tensionLabels: { 'tension-calm': '平静' },
  forbiddenTopics: ['结局', 'Boss 秘密'],
};

describe('HostPublicSpec', () => {
  it('parses a valid spec', () => {
    expect(HostPublicSpecSchema.parse(validSpec).flagVisibility.torchLit).toBe('PUBLIC');
  });

  it('rejects a flagVisibility value outside PUBLIC | HIDDEN', () => {
    const bad = { ...validSpec, flagVisibility: { torchLit: 'SECRET' } };
    expect(HostPublicSpecSchema.safeParse(bad).success).toBe(false);
  });
});

describe('SceneDisclosure', () => {
  it('parses a disclosure with knownFactIds and tensionKey', () => {
    const d = {
      locationLabel: 'The Hall',
      knownFactIds: ['fact-key'],
      tensionKey: 'tension-watchful',
    };
    expect(SceneDisclosureSchema.parse(d).tensionKey).toBe('tension-watchful');
  });

  it('accepts a disclosure without knownFactDependencies (optional field)', () => {
    const d = {
      locationLabel: 'The Hall',
      knownFactIds: ['fact-key'],
      tensionKey: 'tension-watchful',
    };
    const parsed = SceneDisclosureSchema.parse(d);
    expect(parsed.knownFactDependencies).toBeUndefined();
    expect(
      HostPublicSpecSchema.safeParse({ ...validSpec, sceneDisclosures: { s: d } }).success,
    ).toBe(true);
  });

  it('parses knownFactDependencies and rejects a non-array value', () => {
    const d = {
      locationLabel: 'The Hall',
      knownFactIds: ['fact-key'],
      tensionKey: 'tension-watchful',
      knownFactDependencies: { 'fact-key': ['flags.torchLit', 'danger.level'] },
    };
    expect(SceneDisclosureSchema.parse(d).knownFactDependencies).toEqual({
      'fact-key': ['flags.torchLit', 'danger.level'],
    });
    const bad = { ...d, knownFactDependencies: { 'fact-key': 'not-an-array' } };
    expect(SceneDisclosureSchema.safeParse(bad).success).toBe(false);
  });
});
