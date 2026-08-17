import type { Condition, StatePath } from '@interactive-story/chapter-schema';
import type { SchemaValidationResult } from './pass1Schema.js';
import type { HiddenInfoIssue } from './types.js';
import { pathKey } from './pass5ReachableState.js';

/**
 * Judgment 4 (isolation, ADDENDUM §A15): Ending/Boss-exclusive keys must never
 * be marked PUBLIC in flagVisibility. A key is exclusive when it is referenced
 * by any EndingNode.when condition tree or is a BossNode.variables key (which
 * land in chapterVariables). This judgment is global — nowhere is an ending/
 * boss-secret okay to be public, so no ancestor set is needed.
 */
export function checkIsolation(schemaResult: SchemaValidationResult): HiddenInfoIssue[] {
  const host = schemaResult.hostPublic.passed;
  if (host === null) {
    return [
      {
        category: 'ISOLATION_LEAK',
        severity: 'BLOCKING',
        message: 'host.public.json failed PASS 1; isolation cannot be verified',
        file: 'host.public.json',
      },
    ];
  }

  const exclusiveKeys = new Set<string>();
  for (const entry of schemaResult.endings.passed) {
    if (entry.value.when !== null) {
      for (const path of collectPaths(entry.value.when)) {
        exclusiveKeys.add(pathKey(path));
      }
    }
  }
  for (const entry of schemaResult.boss.passed) {
    for (const variableKey of Object.keys(entry.value.variables)) {
      exclusiveKeys.add(`chapterVariables.${variableKey}`);
    }
  }

  const issues: HiddenInfoIssue[] = [];
  for (const key of exclusiveKeys) {
    if (host.flagVisibility[key] === 'PUBLIC') {
      issues.push({
        category: 'ISOLATION_LEAK',
        severity: 'BLOCKING',
        message: `ending/boss-exclusive key "${key}" is marked PUBLIC in flagVisibility (should be HIDDEN)`,
        file: 'host.public.json',
      });
    }
  }
  return issues;
}

function collectPaths(condition: Condition): StatePath[] {
  if ('op' in condition) {
    return [condition.path];
  }
  if ('all' in condition) {
    return condition.all.flatMap(collectPaths);
  }
  if ('any' in condition) {
    return condition.any.flatMap(collectPaths);
  }
  return collectPaths(condition.not);
}
