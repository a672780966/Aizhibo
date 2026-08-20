import type {
  LoadIssue,
  RawChapterPack,
  ReferenceIssue,
  GraphIssue,
  StateIssue,
  HiddenInfoIssue,
  RuleCoverageIssue,
} from './types.js';
import { loadChapterPack } from './loader.js';
import {
  countSchemaFailures,
  runSchemaValidation,
  type SchemaValidationResult,
} from './pass1Schema.js';
import { checkIdUniqueness, type UniquenessIssue } from './pass1Uniqueness.js';
import { buildReferenceIndex } from './referenceIndex.js';
import { runStoryGraphChecks } from './pass2StoryGraph.js';
import { runActionChainChecks } from './pass2ActionChain.js';
import { runNpcVisualsChecks } from './pass2NpcVisuals.js';
import { runBossChecks } from './pass2BossRecovery.js';
import { buildStoryGraphModel, type StoryGraphModel } from './pass3GraphModel.js';
import { computeReachability, type Pass3ReachabilityResult } from './pass3Reachability.js';
import { detectTrapCycles, type TrapCycle } from './pass3Cycles.js';
import { buildReachableStateModel, type ReachableStateModel } from './pass5ReachableState.js';
import {
  checkEndingSatisfiability,
  checkRecoverySatisfiability,
  type UnsatisfiableFinding,
} from './pass5Satisfiability.js';
import { checkFlagExhaustiveness, checkSceneCoverage } from './pass6Exhaustiveness.js';
import { checkIsolation } from './pass6Isolation.js';
import { checkDisclosureSafety } from './pass6Disclosure.js';
import { buildForbiddenLexicon, type ForbiddenLexicon } from './pass6ForbiddenLexicon.js';
import { checkRuleCoverage } from './pass4RuleCoverage.js';

export interface Pass1Result {
  schemaResult: SchemaValidationResult;
  uniquenessIssues: UniquenessIssue[];
}

export interface Pass2Result {
  referenceIssues: ReferenceIssue[];
}

export interface CompileResult {
  loadIssues: LoadIssue[];
  schemaResult: SchemaValidationResult;
  uniquenessIssues: UniquenessIssue[];
  referenceIssues: ReferenceIssue[];
  graphIssues: GraphIssue[];
  stateIssues: StateIssue[];
  hiddenInfoIssues: HiddenInfoIssue[];
  ruleCoverageIssues: RuleCoverageIssue[];
  passed: boolean;
}

export function runPass1(raw: RawChapterPack): Pass1Result {
  const schemaResult = runSchemaValidation(raw);
  return { schemaResult, uniquenessIssues: checkIdUniqueness(schemaResult) };
}

export function runPass2(raw: RawChapterPack, pass1: Pass1Result): Pass2Result {
  const index = buildReferenceIndex(pass1.schemaResult);
  return {
    referenceIssues: [
      ...runStoryGraphChecks(pass1.schemaResult, index),
      ...runActionChainChecks(pass1.schemaResult, index),
      ...runNpcVisualsChecks(pass1.schemaResult, index),
      ...runBossChecks(pass1.schemaResult),
    ],
  };
}

export function compile(rootDir: string): CompileResult {
  const { raw, issues } = loadChapterPack(rootDir);
  const pass1 = runPass1(raw);
  const pass2 = runPass2(raw, pass1);
  const pass3 = runPass3(pass1.schemaResult);
  const pass5 = runPass5(pass1.schemaResult, pass3);
  const pass6 = runPass6(pass1.schemaResult, pass3);
  const ruleCoverageIssues = runPass4(pass1.schemaResult, pass3);
  const graphIssues = buildGraphIssues(pass3, pass1.schemaResult);
  const stateIssues = buildStateIssues(pass5, pass1.schemaResult);
  const hiddenInfoIssues = pass6.issues;
  const passed =
    issues.length === 0 &&
    countSchemaFailures(pass1.schemaResult) === 0 &&
    pass1.uniquenessIssues.length === 0 &&
    pass2.referenceIssues.length === 0 &&
    graphIssues.length === 0 &&
    stateIssues.length === 0 &&
    hiddenInfoIssues.length === 0 &&
    ruleCoverageIssues.length === 0;
  return {
    loadIssues: issues,
    schemaResult: pass1.schemaResult,
    uniquenessIssues: pass1.uniquenessIssues,
    referenceIssues: pass2.referenceIssues,
    graphIssues,
    stateIssues,
    hiddenInfoIssues,
    ruleCoverageIssues,
    passed,
  };
}

export function runPass4(
  schemaResult: SchemaValidationResult,
  pass3: Pass3Result,
): RuleCoverageIssue[] {
  return checkRuleCoverage(schemaResult, pass3);
}

export interface Pass6Result {
  issues: HiddenInfoIssue[];
  forbiddenLexicon: ForbiddenLexicon;
}

export function runPass6(schemaResult: SchemaValidationResult, pass3: Pass3Result): Pass6Result {
  const globalStateModel = buildReachableStateModel(schemaResult, pass3.reachability.reachable);
  const issues = [
    ...checkFlagExhaustiveness(schemaResult, globalStateModel),
    ...checkSceneCoverage(schemaResult),
    ...checkIsolation(schemaResult),
    ...checkDisclosureSafety(schemaResult, pass3.graphModel, pass3.reachability.reachable),
  ];
  const forbiddenLexicon = buildForbiddenLexicon(
    schemaResult,
    pass3.graphModel,
    pass3.reachability.reachable,
  );
  return { issues, forbiddenLexicon };
}

export interface Pass3Result {
  graphModel: StoryGraphModel;
  reachability: Pass3ReachabilityResult;
  trapCycles: TrapCycle[];
}

export interface Pass5Result {
  stateModel: ReachableStateModel;
  unsatisfiable: UnsatisfiableFinding[];
}

export function runPass3(schemaResult: SchemaValidationResult): Pass3Result {
  const graphModel = buildStoryGraphModel(schemaResult);
  const reachability = computeReachability(
    graphModel,
    schemaResult.manifest.passed?.entryNodeId ?? '',
  );
  const trapCycles = detectTrapCycles(graphModel, reachability.reachable);
  return { graphModel, reachability, trapCycles };
}

export function runPass5(schemaResult: SchemaValidationResult, pass3: Pass3Result): Pass5Result {
  const stateModel = buildReachableStateModel(schemaResult, pass3.reachability.reachable);
  const unsatisfiable = [
    ...checkEndingSatisfiability(schemaResult, stateModel, pass3.reachability.reachable),
    ...checkRecoverySatisfiability(schemaResult, stateModel),
  ];
  return { stateModel, unsatisfiable };
}

function buildGraphIssues(pass3: Pass3Result, schemaResult: SchemaValidationResult): GraphIssue[] {
  const fileOf = new Map<string, string>();
  for (const node of schemaResult.storyGraph.passed?.nodes ?? []) {
    fileOf.set(node.id, node.file);
  }
  const nodeFile = (id: string): string => fileOf.get(id) ?? 'story.graph.json';

  const issues: GraphIssue[] = [];
  for (const id of pass3.reachability.deadEnds) {
    issues.push({
      category: 'DEAD_END',
      severity: 'BLOCKING',
      message: `reachable non-ENDING node "${id}" has no outgoing edge`,
      file: nodeFile(id),
    });
  }
  for (const id of pass3.reachability.unreachableNodes) {
    issues.push({
      category: 'UNREACHABLE_NODE',
      severity: 'BLOCKING',
      message: `node "${id}" is not reachable from the entry node`,
      file: nodeFile(id),
    });
  }
  for (const id of pass3.reachability.unreachableEndings) {
    issues.push({
      category: 'UNREACHABLE_ENDING',
      severity: 'BLOCKING',
      message: `ending "${id}" is not reachable from the entry node`,
      file: nodeFile(id),
    });
  }
  for (const id of pass3.reachability.unreachableBosses) {
    issues.push({
      category: 'UNREACHABLE_BOSS',
      severity: 'BLOCKING',
      message: `boss "${id}" is not reachable from the entry node`,
      file: nodeFile(id),
    });
  }
  for (const cycle of pass3.trapCycles) {
    issues.push({
      category: 'TRAP_CYCLE',
      severity: 'BLOCKING',
      message: `trap cycle detected with no escaping edge: ${cycle.members.join(' -> ')}`,
      file: 'story.graph.json',
    });
  }
  return issues;
}

function buildStateIssues(pass5: Pass5Result, schemaResult: SchemaValidationResult): StateIssue[] {
  const endingFile = new Map(schemaResult.endings.passed.map((e) => [e.value.id, e.file]));
  const issues: StateIssue[] = [];
  for (const finding of pass5.unsatisfiable) {
    const file = endingFile.get(finding.targetId);
    if (file !== undefined) {
      issues.push({
        category: 'UNSATISFIABLE_ENDING',
        severity: 'BLOCKING',
        message: finding.reason,
        file,
      });
    } else {
      issues.push({
        category: 'UNSATISFIABLE_RECOVERY',
        severity: 'BLOCKING',
        message: finding.reason,
        file: 'world.rules.json',
      });
    }
  }
  return issues;
}
