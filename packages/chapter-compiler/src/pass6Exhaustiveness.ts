import type { SchemaValidationResult } from './pass1Schema.js';
import type { ReachableStateModel } from './pass5ReachableState.js';
import { buildStoryGraphModel } from './pass3GraphModel.js';
import { computeReachability } from './pass3Reachability.js';
import type { HiddenInfoIssue } from './types.js';

/**
 * Judgment 1 (exhaustiveness, ADDENDUM §A15): every key of the global reachable
 * state model must be declared in `flagVisibility`. Undeclared = violating —
 * a whitelist, not a blacklist: a silently-added flag must not default to
 * PUBLIC. Default-reject principle (DEV-002A task package §2).
 */
export function checkFlagExhaustiveness(
  schemaResult: SchemaValidationResult,
  stateModel: ReachableStateModel,
): HiddenInfoIssue[] {
  const host = schemaResult.hostPublic.passed;
  if (host === null) {
    return [
      {
        category: 'FLAG_NOT_DECLARED',
        severity: 'BLOCKING',
        message: 'host.public.json failed PASS 1; flagVisibility cannot be verified',
        file: 'host.public.json',
      },
    ];
  }
  const issues: HiddenInfoIssue[] = [];
  for (const key of stateModel.keys.keys()) {
    if (!(key in host.flagVisibility)) {
      issues.push({
        category: 'FLAG_NOT_DECLARED',
        severity: 'BLOCKING',
        message: `reachable state key "${key}" is not declared in host.public.json flagVisibility (undeclared keys are treated as leaks)`,
        file: 'host.public.json',
      });
    }
  }
  return issues;
}

/**
 * Judgment 1b (scene coverage): every REACHABLE SCENE node must have an entry
 * in `sceneDisclosures`. The reachable set is recomputed here (the signature
 * is fixed by the task package; input is identical to PASS 3's, so the result
 * is identical by construction).
 */
export function checkSceneCoverage(schemaResult: SchemaValidationResult): HiddenInfoIssue[] {
  const host = schemaResult.hostPublic.passed;
  if (host === null) {
    return [
      {
        category: 'SCENE_NOT_COVERED',
        severity: 'BLOCKING',
        message: 'host.public.json failed PASS 1; sceneDisclosures cannot be verified',
        file: 'host.public.json',
      },
    ];
  }
  const graph = buildStoryGraphModel(schemaResult);
  const reachable = computeReachability(graph, schemaResult.manifest.passed?.entryNodeId ?? '');
  const issues: HiddenInfoIssue[] = [];
  for (const [nodeId, kind] of graph.nodes) {
    if (kind !== 'SCENE' || !reachable.reachable.has(nodeId)) continue;
    if (!(nodeId in host.sceneDisclosures)) {
      issues.push({
        category: 'SCENE_NOT_COVERED',
        severity: 'BLOCKING',
        message: `reachable SCENE "${nodeId}" has no entry in host.public.json sceneDisclosures`,
        file: 'host.public.json',
      });
    }
  }
  return issues;
}
