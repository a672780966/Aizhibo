import type {
  InteractionNode,
  Quality,
  ResultEntry,
  SceneNode,
} from '@interactive-story/chapter-schema';
import type { SchemaValidationResult } from './pass1Schema.js';
import type { Pass3Result } from './compile.js';
import type { RuleCoverageIssue } from './types.js';

/**
 * PASS 4 — Rule Coverage. For every reachable, deduplicated ActionDefinition,
 * checks that every Quality the action's DiceProfile can actually roll has a
 * legitimate (non-unreachable) result in its ResultDictionary.
 *
 * Spec §24 / task T005 #2: a rollable quality whose entry is `unreachable:
 * true`, or whose `mapsTo` fails to resolve to a full result within one hop,
 * is reported. "Rollable but marked impossible" is a genuine content
 * contradiction (PASS4's raison d'être); dead content the dice cannot reach is
 * deliberately NOT checked (task Non-goals — that is waste, not a bug).
 */
export function checkRuleCoverage(
  schemaResult: SchemaValidationResult,
  pass3: Pass3Result,
): RuleCoverageIssue[] {
  const issues: RuleCoverageIssue[] = [];

  const actionById = new Map(schemaResult.actions.passed.map((entry) => [entry.value.id, entry]));
  const diceById = new Map(schemaResult.dice.passed.map((entry) => [entry.value.id, entry.value]));
  const resultById = new Map(
    schemaResult.results.passed.map((entry) => [entry.value.id, entry.value]),
  );
  const sceneById = new Map(
    schemaResult.scenes.passed.map((entry) => [entry.value.id, entry.value]),
  );
  const interactionById = new Map(
    schemaResult.interactions.passed.map((entry) => [entry.value.id, entry.value]),
  );

  for (const actionId of reachableActionIds(schemaResult, pass3, sceneById, interactionById)) {
    const actionEntry = actionById.get(actionId);
    // PASS 2 already reports dangling action references; skip defensively here.
    if (actionEntry === undefined) continue;
    const action = actionEntry.value;

    const diceProfile = diceById.get(action.diceProfileId);
    // PASS 2 already reports a missing dice profile; skip defensively.
    if (diceProfile === undefined) continue;
    const resultDict = resultById.get(action.resultSetId);
    if (resultDict === undefined) continue;

    const rollableQualities = new Set<Quality>(
      diceProfile.qualityThresholds.map((threshold) => threshold.quality),
    );
    for (const quality of rollableQualities) {
      const entry = resultDict.entries.find((e) => e.quality === quality);
      if (entry === undefined) {
        // No entry for the rolled quality. The chapter-schema guarantees six
        // qualities are covered, so this should not occur; it is outside the
        // two cases PASS4 is specified to report (unreachable / mapsTo-illegal),
        // so it is skipped rather than flagged here.
        continue;
      }
      if (classifyUnreachable(entry)) {
        issues.push({
          category: 'UNREACHABLE_BUT_ROLLABLE',
          severity: 'BLOCKING',
          message: `action "${action.id}" can roll quality "${quality}" (via diceProfile "${action.diceProfileId}") but result "${resultDict.id}" marks it unreachable`,
          file: actionEntry.file,
        });
        continue;
      }
      if (classifyMapsTo(entry, resultDict.entries)) {
        issues.push({
          category: 'UNREACHABLE_BUT_ROLLABLE',
          severity: 'BLOCKING',
          message: `action "${action.id}" can roll quality "${quality}" (via diceProfile "${action.diceProfileId}") but result "${resultDict.id}" mapsTo a non-resolvable target`,
          file: actionEntry.file,
        });
      }
    }
  }

  return issues;
}

function classifyUnreachable(entry: ResultEntry): boolean {
  return 'unreachable' in entry && entry.unreachable === true;
}

/**
 * For a mapsTo entry, decide whether its single hop resolves to a FULL result
 * within the same dictionary (legal) or not (a chain, an unreachable target,
 * or an absent target — all illegal; PASS4 reports it).
 */
function classifyMapsTo(entry: ResultEntry, entries: ResultEntry[]): boolean {
  if (!('mapsTo' in entry)) return false;
  const target = entries.find((e) => e.quality === entry.mapsTo);
  if (target === undefined) return true;
  if ('unreachable' in target) return true;
  // a mapsTo target that is itself a mapsTo entry is a forbidden chain
  return 'mapsTo' in target;
}

/**
 * The set of action ids referenced by at least one choice of an interaction
 * attached to a reachable scene.
 */
function reachableActionIds(
  schemaResult: SchemaValidationResult,
  pass3: Pass3Result,
  sceneById: Map<string, SceneNode>,
  interactionById: Map<string, InteractionNode>,
): Set<string> {
  const actionIds = new Set<string>();
  for (const nodeId of pass3.reachability.reachable) {
    const scene = sceneById.get(nodeId);
    if (scene === undefined || scene.interactionId === undefined) continue;
    const interaction = interactionById.get(scene.interactionId);
    if (interaction === undefined) continue;
    for (const choice of interaction.choices) {
      actionIds.add(choice.ruleId);
    }
  }
  return actionIds;
}
