import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compile, runPass1, runPass2 } from './compile.js';
import { loadChapterPack } from './loader.js';
import type { RawChapterPack } from './types.js';

const fixtureRoot = fileURLToPath(new URL('../test-fixtures', import.meta.url));

describe('compile', () => {
  it('returns passed: true for the valid fixture', () => {
    const result = compile(`${fixtureRoot}/valid-minimal`);
    expect(result.loadIssues).toEqual([]);
    expect(result.uniquenessIssues).toEqual([]);
    expect(result.referenceIssues).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('returns passed: false with all four issue classes non-empty for the composite broken fixture', () => {
    const result = compile(`${fixtureRoot}/broken-composite`);
    expect(result.passed).toBe(false);
    expect(result.loadIssues.length).toBeGreaterThan(0);
    expect(result.schemaResult.scenes.failed.length).toBeGreaterThan(0);
    expect(result.uniquenessIssues.length).toBeGreaterThan(0);
    expect(result.referenceIssues.length).toBeGreaterThan(0);
  });

  it('produces exactly one load issue for the composite broken fixture', () => {
    const result = compile(`${fixtureRoot}/broken-composite`);
    expect(result.loadIssues).toHaveLength(1);
    expect(result.loadIssues[0]!.kind).toBe('JSON_SYNTAX_ERROR');
    expect(result.loadIssues[0]!.path).toBe('metadata/meta-broken.json');
  });

  it('reports both the uniqueness and the dangling reference issue in the composite fixture', () => {
    const result = compile(`${fixtureRoot}/broken-composite`);
    expect(result.uniquenessIssues.map((i) => i.id)).toContain('shared-id');
    expect(result.referenceIssues.map((i) => i.category)).toContain('storyGraph.sceneNext');
    expect(result.referenceIssues.map((i) => i.category)).toContain('storyGraph.orphanFile');
  });
});

describe('runPass1 / runPass2', () => {
  it('chains pass1 and pass2 over a raw pack', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/valid-minimal`);
    const pass1 = runPass1(raw);
    const pass2 = runPass2(raw, pass1);
    expect(pass1.uniquenessIssues).toEqual([]);
    expect(pass2.referenceIssues).toEqual([]);
  });

  it('does not cascade reference errors from PASS1-failed entries', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/valid-minimal`);
    const corruptedRaw: RawChapterPack = {
      ...raw,
      recovery: raw.recovery.map((e) =>
        e.file === 'recovery/recovery-1.json'
          ? {
              ...e,
              content: {
                id: 'recovery-1',
                when: {
                  kind: 'RESULT_QUALITY',
                  actionId: 'ghost-action',
                  minQuality: 'GREAT_SUCCESS',
                },
                scope: 'ALL_EVERYONE',
                effects: [],
              },
            }
          : e,
      ),
    };
    const pass1 = runPass1(corruptedRaw);
    const pass2 = runPass2(corruptedRaw, pass1);
    expect(pass1.schemaResult.recovery.failed).toHaveLength(1);
    expect(
      pass2.referenceIssues.filter((i) => i.category === 'actionChain.recoveryActionId'),
    ).toEqual([]);
    expect(pass2.referenceIssues).toEqual([]);
  });

  it('accepts a raw pack built programmatically', () => {
    const raw: RawChapterPack = {
      manifest: {
        schemaVersion: '1.0',
        chapterId: 'c',
        chapterVersion: 'v',
        title: 't',
        entryNodeId: 's1',
        language: 'zh',
        authoring: { createdAt: '2026-08-17' },
      },
      storyGraph: { nodes: [{ id: 's1', kind: 'SCENE', file: 'scenes/s1.json' }] },
      initialState: {
        chapterId: 'c',
        sceneId: 's1',
        flags: {},
        npc: {},
        danger: { level: 0, tensionKey: 'calm' },
        discovered: [],
        activeThreats: [],
        chapterVariables: {},
      },
      worldRules: {
        viewerDefaults: { hp: 3, life: 2 },
        downedPolicy: 'AUTO_SPEND_LIFE',
        defaultScaleBands: [],
        defaultDiceProfileId: 'd1',
        interactionDefaults: {
          openDurationMs: 15000,
          noParticipationPolicy: { kind: 'SKIP' },
        },
        diceBuffer: { minDiceMs: 3000, targetDiceMs: 6000, maxDiceMs: 12000 },
      },
      hostPublic: { flagVisibility: {}, sceneDisclosures: {}, tensionLabels: {} },
      scenes: [
        {
          file: 'scenes/s1.json',
          content: {
            id: 's1',
            visualSceneId: 'v1',
            characters: [],
            interactionId: 'i1',
            hostPolicy: 'ALLOWED',
          },
        },
      ],
      interactions: [
        {
          file: 'interactions/i1.json',
          content: {
            id: 'i1',
            openDurationMs: 15000,
            choices: [],
            diceMode: 'PER_ACTION_GROUP',
            resultPolicy: 'p',
            nextScene: 's1',
            noParticipationPolicy: { kind: 'SKIP' },
          },
        },
      ],
      actions: [],
      dice: [],
      results: [],
      stateRules: [],
      narrative: [],
      npc: [],
      recovery: [],
      boss: [],
      endings: [],
      visuals: [],
      audio: [],
      metadata: [],
    };
    const pass1 = runPass1(raw);
    const pass2 = runPass2(raw, pass1);
    expect(pass1.uniquenessIssues).toEqual([]);
    expect(pass2.referenceIssues).toEqual([]);
  });
});
