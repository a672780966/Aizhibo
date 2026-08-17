import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compile, runPass1, runPass2, runPass3, runPass5, runPass6 } from './compile.js';
import { countSchemaFailures } from './pass1Schema.js';
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

describe('PASS 3 / PASS 5 integration (DEV-003)', () => {
  it('graph-clean: passes with no graph or state issues', () => {
    const result = compile(`${fixtureRoot}/graph-clean`);
    expect(result.loadIssues).toEqual([]);
    expect(result.uniquenessIssues).toEqual([]);
    expect(result.referenceIssues).toEqual([]);
    expect(result.graphIssues).toEqual([]);
    expect(result.stateIssues).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('graph-dead-end: DEAD_END issue blocks passed', () => {
    const result = compile(`${fixtureRoot}/graph-dead-end`);
    expect(result.passed).toBe(false);
    expect(result.graphIssues.map((i) => i.category)).toContain('DEAD_END');
    expect(result.stateIssues).toEqual([]);
  });

  it('graph-unreachable-scene: UNREACHABLE_NODE issue blocks passed', () => {
    const result = compile(`${fixtureRoot}/graph-unreachable-scene`);
    expect(result.passed).toBe(false);
    expect(result.graphIssues.map((i) => i.category)).toContain('UNREACHABLE_NODE');
    expect(result.graphIssues.map((i) => i.category)).not.toContain('UNREACHABLE_ENDING');
    expect(result.graphIssues.map((i) => i.category)).not.toContain('UNREACHABLE_BOSS');
  });

  it('graph-unreachable-ending: UNREACHABLE_ENDING issue blocks passed', () => {
    const result = compile(`${fixtureRoot}/graph-unreachable-ending`);
    expect(result.passed).toBe(false);
    expect(result.graphIssues.map((i) => i.category)).toContain('UNREACHABLE_ENDING');
    expect(result.graphIssues.map((i) => i.category)).not.toContain('UNREACHABLE_BOSS');
  });

  it('graph-unreachable-boss: UNREACHABLE_BOSS issue blocks passed', () => {
    const result = compile(`${fixtureRoot}/graph-unreachable-boss`);
    expect(result.passed).toBe(false);
    expect(result.graphIssues.map((i) => i.category)).toContain('UNREACHABLE_BOSS');
    expect(result.graphIssues.map((i) => i.category)).not.toContain('UNREACHABLE_ENDING');
  });

  it('graph-trap-cycle: TRAP_CYCLE issue blocks passed', () => {
    const result = compile(`${fixtureRoot}/graph-trap-cycle`);
    expect(result.passed).toBe(false);
    expect(result.graphIssues.map((i) => i.category)).toContain('TRAP_CYCLE');
  });

  it('state-unsatisfiable-ending: UNSATISFIABLE_ENDING issue, graph stays clean', () => {
    const result = compile(`${fixtureRoot}/state-unsatisfiable-ending`);
    expect(result.passed).toBe(false);
    expect(result.graphIssues).toEqual([]);
    expect(result.stateIssues.map((i) => i.category)).toEqual(['UNSATISFIABLE_ENDING']);
  });

  it('state-unsatisfiable-recovery: UNSATISFIABLE_RECOVERY issue, graph stays clean', () => {
    const result = compile(`${fixtureRoot}/state-unsatisfiable-recovery`);
    expect(result.passed).toBe(false);
    expect(result.graphIssues).toEqual([]);
    expect(result.stateIssues.map((i) => i.category)).toEqual(['UNSATISFIABLE_RECOVERY']);
  });

  it('A19: every new fixture passes PASS1+PASS2 with no load issues', () => {
    for (const fixture of [
      'graph-clean',
      'graph-dead-end',
      'graph-unreachable-scene',
      'graph-unreachable-ending',
      'graph-unreachable-boss',
      'graph-trap-cycle',
      'state-unsatisfiable-ending',
      'state-unsatisfiable-recovery',
    ]) {
      const { raw, issues } = loadChapterPack(`${fixtureRoot}/${fixture}`);
      const pass1 = runPass1(raw);
      const pass2 = runPass2(raw, pass1);
      expect({ fixture, issues }).toEqual({ fixture, issues: [] });
      expect({ fixture, schemaFailures: countSchemaFailures(pass1.schemaResult) }).toEqual({
        fixture,
        schemaFailures: 0,
      });
      expect({ fixture, uniqueness: pass1.uniquenessIssues }).toEqual({
        fixture,
        uniqueness: [],
      });
      expect({ fixture, reference: pass2.referenceIssues }).toEqual({ fixture, reference: [] });
    }
  });
});

describe('PASS 6 hidden information integration (DEV-002A)', () => {
  it('host-clean: passes with no hidden info issues and a well-formed lexicon', () => {
    const result = compile(`${fixtureRoot}/host-clean`);
    expect(result.hiddenInfoIssues).toEqual([]);
    expect(result.passed).toBe(true);
    const { raw } = loadChapterPack(`${fixtureRoot}/host-clean`);
    const pass3 = runPass3(runPass1(raw).schemaResult);
    const pass6 = runPass6(runPass1(raw).schemaResult, pass3);
    // Lexicon is a product, not a gate: passed stays true while it is non-empty.
    expect((pass6.forbiddenLexicon.bySceneId['scene-start'] ?? []).sort()).toEqual([
      '暴君',
      '结局',
    ]);
    expect(pass6.forbiddenLexicon.always.sort()).toEqual(['暴君', '结局']);
  });

  it('host-exhaustive-missing-flag: FLAG_NOT_DECLARED blocks passed', () => {
    const result = compile(`${fixtureRoot}/host-exhaustive-missing-flag`);
    expect(result.passed).toBe(false);
    expect(result.hiddenInfoIssues.map((i) => i.category)).toEqual(['FLAG_NOT_DECLARED']);
  });

  it('host-scene-not-covered: SCENE_NOT_COVERED blocks passed', () => {
    const result = compile(`${fixtureRoot}/host-scene-not-covered`);
    expect(result.passed).toBe(false);
    expect(result.hiddenInfoIssues.map((i) => i.category)).toEqual(['SCENE_NOT_COVERED']);
  });

  it('host-isolation-leak: ISOLATION_LEAK blocks passed', () => {
    const result = compile(`${fixtureRoot}/host-isolation-leak`);
    expect(result.passed).toBe(false);
    expect(result.hiddenInfoIssues.map((i) => i.category)).toEqual(['ISOLATION_LEAK']);
  });

  it('host-fact-undeclared: FACT_DEPENDENCY_NOT_DECLARED blocks passed', () => {
    const result = compile(`${fixtureRoot}/host-fact-undeclared`);
    expect(result.passed).toBe(false);
    expect(result.hiddenInfoIssues.map((i) => i.category)).toEqual([
      'FACT_DEPENDENCY_NOT_DECLARED',
    ]);
  });

  it('host-fact-future-leak: FACT_FUTURE_LEAK blocks passed', () => {
    const result = compile(`${fixtureRoot}/host-fact-future-leak`);
    expect(result.passed).toBe(false);
    expect(result.hiddenInfoIssues.map((i) => i.category)).toEqual(['FACT_FUTURE_LEAK']);
  });

  it('A19: every host-* fixture passes PASS1 through PASS5', () => {
    for (const fixture of [
      'host-exhaustive-missing-flag',
      'host-scene-not-covered',
      'host-isolation-leak',
      'host-fact-undeclared',
      'host-fact-future-leak',
      'host-clean',
    ]) {
      const { raw, issues } = loadChapterPack(`${fixtureRoot}/${fixture}`);
      const pass1 = runPass1(raw);
      const pass2 = runPass2(raw, pass1);
      const pass3 = runPass3(pass1.schemaResult);
      const pass5 = runPass5(pass1.schemaResult, pass3);
      expect({ fixture, issues }).toEqual({ fixture, issues: [] });
      expect({ fixture, schemaFailures: countSchemaFailures(pass1.schemaResult) }).toEqual({
        fixture,
        schemaFailures: 0,
      });
      expect({ fixture, uniqueness: pass1.uniquenessIssues }).toEqual({
        fixture,
        uniqueness: [],
      });
      expect({ fixture, reference: pass2.referenceIssues }).toEqual({ fixture, reference: [] });
      expect({ fixture, graph: pass3.reachability }).toEqual({
        fixture,
        graph: {
          reachable: pass3.reachability.reachable,
          deadEnds: [],
          unreachableNodes: [],
          unreachableEndings: [],
          unreachableBosses: [],
        },
      });
      expect({ fixture, trapCycles: pass3.trapCycles }).toEqual({ fixture, trapCycles: [] });
      expect({ fixture, state: pass5.unsatisfiable }).toEqual({ fixture, state: [] });
    }
  });
});
