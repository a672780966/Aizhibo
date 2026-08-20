import { describe, expect, it } from 'vitest';
import type { Quality } from '@interactive-story/chapter-schema';
import type { RawChapterPack } from './types.js';
import { runSchemaValidation } from './pass1Schema.js';
import { buildStoryGraphModel } from './pass3GraphModel.js';
import { computeReachability } from './pass3Reachability.js';
import { checkRuleCoverage } from './pass4RuleCoverage.js';
import { fileURLToPath } from 'node:url';
import { loadChapterPack } from './loader.js';

const fixtureRoot = fileURLToPath(new URL('../test-fixtures', import.meta.url));

const ALL_QUALITIES: Quality[] = [
  'DISASTER',
  'FAILURE',
  'COSTLY_SUCCESS',
  'SUCCESS',
  'GREAT_SUCCESS',
  'SPECIAL',
];

interface ResultSpec {
  quality: Quality;
  kind: 'FULL' | 'MAPS_TO' | 'UNREACHABLE';
  mapsTo?: Quality;
  resultId?: string;
}

/** Minimal raw pack: one reachable scene -> one interaction -> one action. */
function makePack(results: ResultSpec[], actions = 1, interactions = 1): RawChapterPack {
  const entries = results.map((r) =>
    r.kind === 'FULL'
      ? {
          quality: r.quality,
          resultId: r.resultId ?? `res-${r.quality}`,
          worldEffects: [],
          playerEffects: [],
          narrativeId: 'narr-success',
          visibility: 'PUBLIC',
        }
      : r.kind === 'MAPS_TO'
        ? { quality: r.quality, mapsTo: r.mapsTo }
        : { quality: r.quality, unreachable: true },
  );
  return {
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
      interactionDefaults: { openDurationMs: 15000, noParticipationPolicy: { kind: 'SKIP' } },
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
    interactions: Array.from({ length: interactions }, (_, i) => ({
      file: `interactions/i${i + 1}.json`,
      content: {
        id: `i${i + 1}`,
        openDurationMs: 15000,
        choices: [{ id: 'A', label: 'act', actionType: 'X', ruleId: 'action-1' }],
        diceMode: 'PER_ACTION_GROUP',
        resultPolicy: 'p',
        nextScene: 's1',
        noParticipationPolicy: { kind: 'SKIP' },
      },
    })),
    actions: Array.from({ length: actions }, (_, i) => ({
      file: `actions/action-${i + 1}.json`,
      content: {
        id: `action-${i + 1}`,
        actionType: 'X',
        diceProfileId: `d${i + 1}`,
        resultSetId: 'r1',
      },
    })),
    dice: [
      {
        file: 'dice/d1.json',
        content: {
          id: 'd1',
          diceType: 'd20',
          qualityThresholds: ALL_QUALITIES.map((q, i) => ({ quality: q, min: i + 1, max: i + 1 })),
        },
      },
    ],
    results: [{ file: 'results/r1.json', content: { id: 'r1', entries } }],
    stateRules: [],
    narrative: [
      { file: 'narrative/narr-success.json', content: { id: 'narr-success', text: 'ok' } },
    ],
    npc: [],
    recovery: [],
    boss: [],
    endings: [],
    visuals: [],
    audio: [],
    metadata: [],
  };
}

function coverageFor(raw: RawChapterPack) {
  const schemaResult = runSchemaValidation(raw);
  const graph = buildStoryGraphModel(schemaResult);
  const reachability = computeReachability(graph, schemaResult.manifest.passed?.entryNodeId ?? '');
  return checkRuleCoverage(schemaResult, { graphModel: graph, reachability, trapCycles: [] });
}

describe('checkRuleCoverage (T005)', () => {
  it('clean: every rollable quality has a full result -> no issues', () => {
    const raw = makePack(ALL_QUALITIES.map((q) => ({ quality: q, kind: 'FULL' })));
    expect(coverageFor(raw)).toEqual([]);
  });

  it('detects a rollable quality marked unreachable in its result', () => {
    const results: ResultSpec[] = ALL_QUALITIES.map((q) =>
      q === 'SPECIAL' ? { quality: q, kind: 'UNREACHABLE' } : { quality: q, kind: 'FULL' },
    );
    const issues = coverageFor(makePack(results));
    expect(issues).toHaveLength(1);
    expect(issues[0]!.category).toBe('UNREACHABLE_BUT_ROLLABLE');
    expect(issues[0]!.message).toContain('SPECIAL');
  });

  it('treats mapsTo resolving to a full result as legal (no false positive)', () => {
    const results: ResultSpec[] = [
      { quality: 'DISASTER', kind: 'MAPS_TO', mapsTo: 'FAILURE' },
      ...ALL_QUALITIES.filter((q) => q !== 'DISASTER').map((q) => ({
        quality: q,
        kind: 'FULL' as const,
      })),
    ];
    expect(coverageFor(makePack(results))).toEqual([]);
  });

  it('detects a mapsTo chain (mapsTo pointing at another mapsTo) as illegal', () => {
    const results: ResultSpec[] = [
      { quality: 'DISASTER', kind: 'MAPS_TO', mapsTo: 'FAILURE' },
      { quality: 'FAILURE', kind: 'MAPS_TO', mapsTo: 'SUCCESS' },
      ...ALL_QUALITIES.filter((q) => q !== 'DISASTER' && q !== 'FAILURE').map((q) => ({
        quality: q,
        kind: 'FULL' as const,
      })),
    ];
    const issues = coverageFor(makePack(results));
    expect(issues.some((i) => i.message.includes('DISASTER'))).toBe(true);
  });

  it('detects a mapsTo pointing at an unreachable target as illegal', () => {
    const results: ResultSpec[] = [
      { quality: 'FAILURE', kind: 'MAPS_TO', mapsTo: 'SPECIAL' },
      { quality: 'SPECIAL', kind: 'UNREACHABLE' },
      ...ALL_QUALITIES.filter((q) => q !== 'FAILURE' && q !== 'SPECIAL').map((q) => ({
        quality: q,
        kind: 'FULL' as const,
      })),
    ];
    const issues = coverageFor(makePack(results));
    expect(issues.some((i) => i.message.includes('FAILURE'))).toBe(true);
  });

  it('does not check dead (unreachable) actions', () => {
    // action-2 is not referenced by any reachable interaction -> its SPECIAL gap
    // must NOT be reported.
    const raw = {
      ...makePack(ALL_QUALITIES.map((q) => ({ quality: q, kind: 'FULL' }))),
      actions: [
        {
          file: 'actions/action-1.json',
          content: { id: 'action-1', actionType: 'X', diceProfileId: 'd1', resultSetId: 'r1' },
        },
        {
          file: 'actions/action-2.json',
          content: { id: 'action-2', actionType: 'Y', diceProfileId: 'd2', resultSetId: 'r2' },
        },
      ],
      dice: [
        {
          file: 'dice/d1.json',
          content: {
            id: 'd1',
            diceType: 'd20',
            qualityThresholds: ALL_QUALITIES.map((q, i) => ({
              quality: q,
              min: i + 1,
              max: i + 1,
            })),
          },
        },
        {
          file: 'dice/d2.json',
          content: {
            id: 'd2',
            diceType: 'd20',
            qualityThresholds: [{ quality: 'SPECIAL', min: 1, max: 20 }],
          },
        },
      ],
      results: [
        {
          file: 'results/r1.json',
          content: {
            id: 'r1',
            entries: ALL_QUALITIES.map((q) => ({
              quality: q,
              resultId: `res-${q}`,
              worldEffects: [],
              playerEffects: [],
              narrativeId: 'narr-success',
              visibility: 'PUBLIC',
            })),
          },
        },
        {
          file: 'results/r2.json',
          content: { id: 'r2', entries: [{ quality: 'SPECIAL', unreachable: true }] },
        },
      ],
    };
    expect(coverageFor(raw)).toEqual([]);
  });

  it('checks an action referenced by multiple reachable interactions only once (dedupe)', () => {
    const raw = {
      ...makePack(ALL_QUALITIES.map((q) => ({ quality: q, kind: 'FULL' }))),
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
        {
          file: 'scenes/s2.json',
          content: {
            id: 's2',
            visualSceneId: 'v2',
            characters: [],
            interactionId: 'i2',
            hostPolicy: 'ALLOWED',
          },
        },
      ],
      storyGraph: {
        nodes: [
          { id: 's1', kind: 'SCENE', file: 'scenes/s1.json' },
          { id: 's2', kind: 'SCENE', file: 'scenes/s2.json' },
        ],
      },
      interactions: [
        {
          file: 'interactions/i1.json',
          content: {
            id: 'i1',
            openDurationMs: 15000,
            choices: [{ id: 'A', label: 'a', actionType: 'X', ruleId: 'action-1' }],
            diceMode: 'PER_ACTION_GROUP',
            resultPolicy: 'p',
            nextScene: 's2',
            noParticipationPolicy: { kind: 'SKIP' },
          },
        },
        {
          file: 'interactions/i2.json',
          content: {
            id: 'i2',
            openDurationMs: 15000,
            choices: [{ id: 'A', label: 'a', actionType: 'X', ruleId: 'action-1' }],
            diceMode: 'PER_ACTION_GROUP',
            resultPolicy: 'p',
            nextScene: 's1',
            noParticipationPolicy: { kind: 'SKIP' },
          },
        },
      ],
      results: [
        {
          file: 'results/r1.json',
          content: { id: 'r1', entries: [{ quality: 'SPECIAL', unreachable: true }] },
        },
      ],
    };
    // Both i1 and i2 are reachable and reference the same action-1 -> exactly one issue.
    const issues = coverageFor(raw);
    expect(issues.filter((i) => i.message.includes('action-1')).length).toBe(1);
  });

  it('graph-clean (after SCOPE_RULING 0062 fixture fix) reports no coverage issues', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/graph-clean`);
    const schemaResult = runSchemaValidation(raw);
    const graph = buildStoryGraphModel(schemaResult);
    const reachability = computeReachability(
      graph,
      schemaResult.manifest.passed?.entryNodeId ?? '',
    );
    const issues = checkRuleCoverage(schemaResult, {
      graphModel: graph,
      reachability,
      trapCycles: [],
    });
    expect(issues).toEqual([]);
  });
});
