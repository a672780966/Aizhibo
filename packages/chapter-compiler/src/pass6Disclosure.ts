import type { SchemaValidationResult } from './pass1Schema.js';
import type { StoryGraphModel } from './pass3GraphModel.js';
import { computeAncestors } from './pass6Ancestors.js';
import { buildReachableStateModel } from './pass5ReachableState.js';
import type { HiddenInfoIssue } from './types.js';

/**
 * Judgments 2+3 (whitelist + timing, ADDENDUM §A15): each fact in a reachable
 * scene's `knownFactIds` must (a) have a declared dependency list and (b) every
 * dependency key must be marked PUBLIC AND already established in the state
 * model of the scene's ANcestors — i.e. knowable no later than when the scene
 * happens. Default-reject: an undeclared dependency or an unestablished flag
 * is BLOCKING. Scenes missing from sceneDisclosures are skipped here — that is
 * judgment 1b's (checkSceneCoverage) responsibility, not repeated.
 */
export function checkDisclosureSafety(
  schemaResult: SchemaValidationResult,
  graph: StoryGraphModel,
  globalReachable: Set<string>,
): HiddenInfoIssue[] {
  const host = schemaResult.hostPublic.passed;
  if (host === null) {
    return [
      {
        category: 'FACT_DEPENDENCY_NOT_DECLARED',
        severity: 'BLOCKING',
        message: 'host.public.json failed PASS 1; disclosure safety cannot be verified',
        file: 'host.public.json',
      },
    ];
  }

  const issues: HiddenInfoIssue[] = [];
  for (const [sceneId, kind] of graph.nodes) {
    if (kind !== 'SCENE' || !globalReachable.has(sceneId)) continue;
    const disclosure = host.sceneDisclosures[sceneId];
    if (disclosure === undefined) continue; // scene coverage's job (T004)

    const ancestors = computeAncestors(graph, sceneId, globalReachable);
    const ancestorState = buildReachableStateModel(schemaResult, ancestors);
    const dependencyOf = disclosure.knownFactDependencies ?? {};

    for (const factId of disclosure.knownFactIds) {
      const dependencies = dependencyOf[factId];
      if (dependencies === undefined) {
        issues.push({
          category: 'FACT_DEPENDENCY_NOT_DECLARED',
          severity: 'BLOCKING',
          message: `fact "${factId}" of scene "${sceneId}" has no declared entry in knownFactDependencies (undeclared dependencies are refused)`,
          file: 'host.public.json',
        });
        continue;
      }
      for (const key of dependencies) {
        if (host.flagVisibility[key] !== 'PUBLIC') {
          issues.push({
            category: 'FACT_FUTURE_LEAK',
            severity: 'BLOCKING',
            message: `fact "${factId}" of scene "${sceneId}" depends on "${key}" which is not marked PUBLIC in flagVisibility`,
            file: 'host.public.json',
          });
        } else if (!ancestorState.keys.has(key)) {
          issues.push({
            category: 'FACT_FUTURE_LEAK',
            severity: 'BLOCKING',
            message: `fact "${factId}" of scene "${sceneId}" depends on "${key}" which is not established by any scene ancestor of "${sceneId}" (future leak)`,
            file: 'host.public.json',
          });
        }
      }
    }
  }
  return issues;
}
