import { describe, expect, it } from 'vitest';
import type {
  Pass3ReachabilityResult,
  SchemaValidationResult,
  StoryGraphModel,
} from '@interactive-story/chapter-compiler';
import { computeReachableNarrativeBlockIds } from './computeReachableNarrativeBlockIds.js';

const COND = { path: { container: 'flags', key: 'gateOpen' }, op: 'EXISTS' } as const;
const FOCUS = { priority: 1, category: 'follow', urgency: 'LOW' } as const;

const fullEntry = (resultId: string, narrativeId: string) => ({
  resultId,
  worldEffects: [],
  playerEffects: [],
  narrativeId,
  visibility: 'PUBLIC' as const,
});

/** Every collection empty, every root null — the shared placeholder base. */
function baseSchemaResult(): SchemaValidationResult {
  return {
    manifest: { passed: null, failed: [] },
    storyGraph: { passed: null, failed: [] },
    initialState: { passed: null, failed: [] },
    worldRules: { passed: null, failed: [] },
    hostPublic: { passed: null, failed: [] },
    scenes: { passed: [], failed: [] },
    interactions: { passed: [], failed: [] },
    actions: { passed: [], failed: [] },
    dice: { passed: [], failed: [] },
    results: { passed: [], failed: [] },
    stateRules: { passed: [], failed: [] },
    narrative: { passed: [], failed: [] },
    npc: { passed: [], failed: [] },
    recovery: { passed: [], failed: [] },
    boss: { passed: [], failed: [] },
    endings: { passed: [], failed: [] },
    visuals: { passed: [], failed: [] },
    audio: { passed: [], failed: [] },
    metadata: { passed: [], failed: [] },
  };
}

/**
 * Rich hand-built fixture (A10/A11/A12). Graph: scene-a (SCENE, reachable),
 * boss-b (BOSS, reachable), ending-e (ENDING, reachable); scene-z / boss-z /
 * ending-z all in the graph but OUTSIDE reachability.reachable (A12).
 *
 * Path A reachable chains:
 * - scene-a.interactionId inter-1 → action-x → dict-1, whose entries carry a
 *   mapsTo hop (DISASTER→FAILURE), a full FAILURE→narr-alpha (all five block
 *   fields), a full COSTLY_SUCCESS→narr-beta and an unreachable SPECIAL;
 * - boss-b phase-1.interactionId inter-2 → action-y → dict-2, whose
 *   DISASTER mapsTo hops onto the unreachable SPECIAL entry (dead hop),
 *   and whose SUCCESS→narr-alpha duplicates the alpha family;
 * - boss-b phase-2.interactionId inter-3 → ruleId action-ghost which is NOT
 *   in actions — Path A dies silently; phase-2 still carries
 *   narrationBlockIds (Path B, A11 chain-independence).
 * Path B: boss-b phase-2.narrationBlockIds and ending-e.narrationBlockIds.
 */
function buildRichSchemaResult(): SchemaValidationResult {
  const schemaResult = baseSchemaResult();
  schemaResult.scenes.passed = [
    {
      file: 'scenes/scene-a.json',
      value: {
        id: 'scene-a',
        visualSceneId: 'vs-a',
        characters: [],
        hostPolicy: 'ALLOWED',
        interactionId: 'inter-1',
      },
    },
    {
      file: 'scenes/scene-z.json',
      value: {
        id: 'scene-z',
        visualSceneId: 'vs-z',
        characters: [],
        hostPolicy: 'ALLOWED',
        interactionId: 'inter-z',
      },
    },
  ];
  schemaResult.interactions.passed = [
    {
      file: 'interactions/inter-1.json',
      value: {
        id: 'inter-1',
        openDurationMs: 1000,
        choices: [{ id: 'A', label: 'a', actionType: 'TALK', ruleId: 'action-x' }],
        diceMode: 'PER_ACTION_GROUP',
        resultPolicy: 'policy-1',
        nextScene: 'boss-b',
        noParticipationPolicy: { kind: 'SKIP' },
      },
    },
    {
      file: 'interactions/inter-2.json',
      value: {
        id: 'inter-2',
        openDurationMs: 1000,
        choices: [{ id: 'A', label: 'a', actionType: 'FIGHT', ruleId: 'action-y' }],
        diceMode: 'PER_ACTION_GROUP',
        resultPolicy: 'policy-2',
        nextScene: 'ending-e',
        noParticipationPolicy: { kind: 'SKIP' },
      },
    },
    {
      file: 'interactions/inter-3.json',
      value: {
        id: 'inter-3',
        openDurationMs: 1000,
        choices: [{ id: 'A', label: 'a', actionType: 'SHOUT', ruleId: 'action-ghost' }],
        diceMode: 'PER_ACTION_GROUP',
        resultPolicy: 'policy-3',
        nextScene: 'ending-e',
        noParticipationPolicy: { kind: 'SKIP' },
      },
    },
    {
      file: 'interactions/inter-z.json',
      value: {
        id: 'inter-z',
        openDurationMs: 1000,
        choices: [{ id: 'A', label: 'a', actionType: 'FLEE', ruleId: 'action-z' }],
        diceMode: 'PER_ACTION_GROUP',
        resultPolicy: 'policy-z',
        nextScene: 'ending-e',
        noParticipationPolicy: { kind: 'SKIP' },
      },
    },
  ];
  schemaResult.actions.passed = [
    {
      file: 'actions/action-x.json',
      value: { id: 'action-x', actionType: 'TALK', diceProfileId: 'dice-1', resultSetId: 'dict-1' },
    },
    {
      file: 'actions/action-y.json',
      value: {
        id: 'action-y',
        actionType: 'FIGHT',
        diceProfileId: 'dice-1',
        resultSetId: 'dict-2',
      },
    },
    {
      file: 'actions/action-z.json',
      value: { id: 'action-z', actionType: 'FLEE', diceProfileId: 'dice-1', resultSetId: 'dict-z' },
    },
  ];
  schemaResult.results.passed = [
    {
      file: 'results/dict-1.json',
      value: {
        id: 'dict-1',
        entries: [
          { quality: 'DISASTER', mapsTo: 'FAILURE' },
          { quality: 'FAILURE', ...fullEntry('res-1', 'narr-alpha') },
          { quality: 'COSTLY_SUCCESS', ...fullEntry('res-2', 'narr-beta') },
          { quality: 'SPECIAL', unreachable: true },
        ],
      },
    },
    {
      file: 'results/dict-2.json',
      value: {
        id: 'dict-2',
        entries: [
          { quality: 'DISASTER', mapsTo: 'SPECIAL' },
          { quality: 'SPECIAL', unreachable: true },
          { quality: 'SUCCESS', ...fullEntry('res-b1', 'narr-alpha') },
        ],
      },
    },
    {
      file: 'results/dict-z.json',
      value: {
        id: 'dict-z',
        entries: [{ quality: 'SUCCESS', ...fullEntry('res-z', 'narr-gamma') }],
      },
    },
  ];
  schemaResult.narrative.passed = [
    {
      file: 'narrative/narr-alpha.json',
      value: {
        id: 'narr-alpha',
        primaryBlockId: 'blk-a-prim',
        supportBlockIds: ['blk-a-sup1', 'blk-a-sup2'],
        urgencyBlockId: 'blk-a-urg',
        transitionBlockId: 'blk-a-trans',
        prefixBlockId: 'blk-a-pre',
        focus: FOCUS,
      },
    },
    {
      file: 'narrative/narr-beta.json',
      value: {
        id: 'narr-beta',
        primaryBlockId: 'blk-b-prim',
        supportBlockIds: [],
        focus: FOCUS,
      },
    },
    {
      file: 'narrative/narr-gamma.json',
      value: { id: 'narr-gamma', primaryBlockId: 'blk-g-prim', focus: FOCUS },
    },
  ];
  schemaResult.boss.passed = [
    {
      file: 'boss/boss-b.json',
      value: {
        id: 'boss-b',
        displayName: 'Boss B',
        visualSceneId: 'vs-b',
        phases: [
          {
            id: 'phase-1',
            order: 1,
            enterWhen: COND,
            interactionId: 'inter-2',
            hostPolicy: 'MUTED',
          },
          {
            id: 'phase-2',
            order: 2,
            enterWhen: COND,
            interactionId: 'inter-3',
            narrationBlockIds: ['blk-b-direct1', 'blk-b-direct2'],
            hostPolicy: 'MUTED',
          },
        ],
        variables: { hp: 3 },
        stateRuleSetId: 'rules-b',
        onDefeat: 'ending-e',
        onFailure: 'ending-e',
      },
    },
    {
      file: 'boss/boss-z.json',
      value: {
        id: 'boss-z',
        displayName: 'Boss Z',
        visualSceneId: 'vs-z',
        phases: [
          {
            id: 'phase-z1',
            order: 1,
            enterWhen: COND,
            interactionId: 'inter-z',
            narrationBlockIds: ['blk-gboss-direct'],
            hostPolicy: 'MUTED',
          },
        ],
        variables: {},
        stateRuleSetId: 'rules-z',
        onDefeat: 'ending-e',
        onFailure: 'ending-e',
      },
    },
  ];
  schemaResult.endings.passed = [
    {
      file: 'endings/ending-e.json',
      value: {
        id: 'ending-e',
        title: 'E',
        when: null,
        priority: 1,
        isFallback: true,
        visualSceneId: 'vs-e',
        narrationBlockIds: ['blk-e-direct1', 'blk-e-direct2'],
      },
    },
    {
      file: 'endings/ending-z.json',
      value: {
        id: 'ending-z',
        title: 'Z',
        when: null,
        priority: 1,
        isFallback: true,
        visualSceneId: 'vs-z',
        narrationBlockIds: ['blk-ge-direct'],
      },
    },
  ];
  return schemaResult;
}

function richGraph(): StoryGraphModel {
  return {
    nodes: new Map<string, 'SCENE' | 'BOSS' | 'ENDING'>([
      ['scene-a', 'SCENE'],
      ['scene-z', 'SCENE'],
      ['boss-b', 'BOSS'],
      ['boss-z', 'BOSS'],
      ['ending-e', 'ENDING'],
      ['ending-z', 'ENDING'],
    ]),
    edges: new Map(),
  };
}

function richReachability(): Pass3ReachabilityResult {
  return {
    reachable: new Set(['scene-a', 'boss-b', 'ending-e']),
    deadEnds: [],
    unreachableNodes: ['scene-z', 'boss-z', 'ending-z'],
    unreachableEndings: ['ending-z'],
    unreachableBosses: ['boss-z'],
  };
}

const EXPECTED_REACHABLE_BLOCK_IDS = [
  'blk-a-pre',
  'blk-a-prim',
  'blk-a-sup1',
  'blk-a-sup2',
  'blk-a-trans',
  'blk-a-urg',
  'blk-b-direct1',
  'blk-b-direct2',
  'blk-b-prim',
  'blk-e-direct1',
  'blk-e-direct2',
];

describe('computeReachableNarrativeBlockIds', () => {
  it('A10: Path A walks the full interaction chain and collects all five ResultNarrative block fields', () => {
    const result = computeReachableNarrativeBlockIds(
      buildRichSchemaResult(),
      richGraph(),
      richReachability(),
    );
    // scene-a → inter-1 → action-x → dict-1: FAILURE→narr-alpha (five-field
    // family) and COSTLY_SUCCESS→narr-beta; boss-b phase-1 → dict-2 →
    // SUCCESS→narr-alpha duplicates the alpha family.
    expect(result).toContain('blk-a-prim');
    expect(result).toContain('blk-a-sup1');
    expect(result).toContain('blk-a-sup2');
    expect(result).toContain('blk-a-urg');
    expect(result).toContain('blk-a-trans');
    expect(result).toContain('blk-a-pre');
    expect(result).toContain('blk-b-prim');
  });

  it('A11: Path B collects BossPhase.narrationBlockIds and EndingNode.narrationBlockIds directly, independent of any interaction chain', () => {
    const rich = computeReachableNarrativeBlockIds(
      buildRichSchemaResult(),
      richGraph(),
      richReachability(),
    );
    expect(rich).toContain('blk-b-direct1');
    expect(rich).toContain('blk-b-direct2');
    expect(rich).toContain('blk-e-direct1');
    expect(rich).toContain('blk-e-direct2');

    // Chain-independence proof: boss-b phase-2's interactionId routes to
    // ruleId `action-ghost`, which is absent from actions — Path A dies
    // there, yet the phase's narrationBlockIds are still collected.
    const chainFree = baseSchemaResult();
    chainFree.boss.passed = [
      {
        file: 'boss/boss-b2.json',
        value: {
          id: 'boss-b2',
          displayName: 'Boss B2',
          visualSceneId: 'vs-b2',
          phases: [
            {
              id: 'phase-1',
              order: 1,
              enterWhen: COND,
              interactionId: 'inter-ghost',
              narrationBlockIds: ['blk-only-direct'],
              hostPolicy: 'MUTED',
            },
          ],
          variables: {},
          stateRuleSetId: 'rules-b2',
          onDefeat: 'ending-e2',
          onFailure: 'ending-e2',
        },
      },
    ];
    chainFree.endings.passed = [
      {
        file: 'endings/ending-e2.json',
        value: {
          id: 'ending-e2',
          title: 'E2',
          when: null,
          priority: 1,
          isFallback: true,
          visualSceneId: 'vs-e2',
          narrationBlockIds: ['blk-end-direct'],
        },
      },
    ];
    const result = computeReachableNarrativeBlockIds(
      chainFree,
      {
        nodes: new Map<string, 'SCENE' | 'BOSS' | 'ENDING'>([
          ['boss-b2', 'BOSS'],
          ['ending-e2', 'ENDING'],
        ]),
        edges: new Map(),
      },
      {
        reachable: new Set(['boss-b2', 'ending-e2']),
        deadEnds: [],
        unreachableNodes: [],
        unreachableEndings: [],
        unreachableBosses: [],
      },
    );
    expect(Array.from(result).sort()).toEqual(['blk-end-direct', 'blk-only-direct']);
  });

  it('A12: block ids associated with nodes outside reachability.reachable are not collected', () => {
    const result = computeReachableNarrativeBlockIds(
      buildRichSchemaResult(),
      richGraph(),
      richReachability(),
    );
    expect(result).not.toContain('blk-g-prim'); // scene-z → inter-z → dict-z → narr-gamma
    expect(result).not.toContain('blk-gboss-direct'); // boss-z Path B
    expect(result).not.toContain('blk-ge-direct'); // ending-z Path B
    expect(Array.from(result).sort()).toEqual(EXPECTED_REACHABLE_BLOCK_IDS);
  });

  it('A13: mapsTo hops exactly one step inside the same dictionary; unreachable entries contribute zero', () => {
    const schemaResult = baseSchemaResult();
    schemaResult.scenes.passed = [
      {
        file: 'scenes/scene-iso.json',
        value: {
          id: 'scene-iso',
          visualSceneId: 'vs-iso',
          characters: [],
          hostPolicy: 'ALLOWED',
          interactionId: 'inter-iso',
        },
      },
    ];
    schemaResult.interactions.passed = [
      {
        file: 'interactions/inter-iso.json',
        value: {
          id: 'inter-iso',
          openDurationMs: 1000,
          choices: [{ id: 'A', label: 'a', actionType: 'TALK', ruleId: 'action-iso' }],
          diceMode: 'PER_ACTION_GROUP',
          resultPolicy: 'policy-iso',
          nextScene: 'ending-iso',
          noParticipationPolicy: { kind: 'SKIP' },
        },
      },
    ];
    schemaResult.actions.passed = [
      {
        file: 'actions/action-iso.json',
        value: {
          id: 'action-iso',
          actionType: 'TALK',
          diceProfileId: 'dice-1',
          resultSetId: 'dict-iso',
        },
      },
    ];
    // DISASTER mapsTo FAILURE: FAILURE exists as a full entry in the SAME
    // dictionary → one-hop resolution reaches narr-iso.
    // GREAT_SUCCESS mapsTo FAILURE-of-another-dictionary quality that does
    // NOT exist here → must contribute zero (no cross-dictionary invention).
    // SPECIAL is unreachable:true → contributes zero.
    schemaResult.results.passed = [
      {
        file: 'results/dict-iso.json',
        value: {
          id: 'dict-iso',
          entries: [
            { quality: 'DISASTER', mapsTo: 'FAILURE' },
            { quality: 'FAILURE', ...fullEntry('res-iso', 'narr-iso') },
            { quality: 'SPECIAL', unreachable: true },
            { quality: 'GREAT_SUCCESS', mapsTo: 'SUCCESS' }, // SUCCESS absent here
          ],
        },
      },
    ];
    schemaResult.narrative.passed = [
      {
        file: 'narrative/narr-iso.json',
        value: {
          id: 'narr-iso',
          primaryBlockId: 'blk-iso-prim',
          supportBlockIds: ['blk-iso-sup'],
          focus: FOCUS,
        },
      },
    ];
    schemaResult.endings.passed = [
      {
        file: 'endings/ending-iso.json',
        value: {
          id: 'ending-iso',
          title: 'ISO',
          when: null,
          priority: 1,
          isFallback: true,
          visualSceneId: 'vs-iso',
          narrationBlockIds: [],
        },
      },
    ];
    const result = computeReachableNarrativeBlockIds(
      schemaResult,
      {
        nodes: new Map<string, 'SCENE' | 'BOSS' | 'ENDING'>([
          ['scene-iso', 'SCENE'],
          ['ending-iso', 'ENDING'],
        ]),
        edges: new Map(),
      },
      {
        reachable: new Set(['scene-iso', 'ending-iso']),
        deadEnds: [],
        unreachableNodes: [],
        unreachableEndings: [],
        unreachableBosses: [],
      },
    );
    // narr-iso reached via the direct FAILURE entry AND via the DISASTER
    // one-hop; the dead GREAT_SUCCESS hop and the unreachable SPECIAL add
    // nothing.
    expect(Array.from(result).sort()).toEqual(['blk-iso-prim', 'blk-iso-sup']);
  });
});
