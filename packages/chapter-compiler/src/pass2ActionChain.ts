import type { ReferenceIndex } from './referenceIndex.js';
import type { SchemaValidationResult } from './pass1Schema.js';
import type { ReferenceIssue } from './types.js';

export function runActionChainChecks(
  schemaResult: SchemaValidationResult,
  index: ReferenceIndex,
): ReferenceIssue[] {
  const issues: ReferenceIssue[] = [];

  for (const entry of schemaResult.interactions.passed) {
    for (const choice of entry.value.choices) {
      if (!index.actions.has(choice.ruleId)) {
        issues.push({
          category: 'actionChain.choiceRuleId',
          severity: 'BLOCKING',
          message: `Choice "${choice.id}" of InteractionNode "${entry.value.id}" ruleId "${choice.ruleId}" is not declared in actions/`,
          file: entry.file,
        });
      }
    }
  }

  for (const entry of schemaResult.actions.passed) {
    if (!index.diceProfiles.has(entry.value.diceProfileId)) {
      issues.push({
        category: 'actionChain.diceProfileId',
        severity: 'BLOCKING',
        message: `ActionDefinition "${entry.value.id}" diceProfileId "${entry.value.diceProfileId}" is not declared in dice/`,
        file: entry.file,
      });
    }
    if (!index.resultDictionaries.has(entry.value.resultSetId)) {
      issues.push({
        category: 'actionChain.resultSetId',
        severity: 'BLOCKING',
        message: `ActionDefinition "${entry.value.id}" resultSetId "${entry.value.resultSetId}" is not declared in results/`,
        file: entry.file,
      });
    }
  }

  for (const entry of schemaResult.results.passed) {
    for (const resultEntry of entry.value.entries) {
      if ('narrativeId' in resultEntry && !index.resultNarratives.has(resultEntry.narrativeId)) {
        issues.push({
          category: 'actionChain.narrativeId',
          severity: 'BLOCKING',
          message: `ResultEntry "${resultEntry.resultId}" of "${entry.value.id}" narrativeId "${resultEntry.narrativeId}" is not declared as a ResultNarrative in narrative/`,
          file: entry.file,
        });
      }
      if ('mapsTo' in resultEntry) {
        const target = entry.value.entries.find((e) => e.quality === resultEntry.mapsTo);
        if (target === undefined) {
          issues.push({
            category: 'actionChain.mapsTo',
            severity: 'BLOCKING',
            message: `ResultEntry quality "${resultEntry.quality}" of "${entry.value.id}" mapsTo "${resultEntry.mapsTo}", but no entry with that quality exists in the same dictionary`,
            file: entry.file,
          });
        } else if ('mapsTo' in target) {
          issues.push({
            category: 'actionChain.mapsTo',
            severity: 'BLOCKING',
            message: `ResultEntry quality "${resultEntry.quality}" of "${entry.value.id}" mapsTo "${resultEntry.mapsTo}", which is itself a mapsTo entry (chained mapsTo is forbidden)`,
            file: entry.file,
          });
        }
      }
    }
  }

  for (const entry of schemaResult.recovery.passed) {
    const trigger = entry.value.when;
    if (trigger.kind === 'RESULT_QUALITY' && !index.actions.has(trigger.actionId)) {
      issues.push({
        category: 'actionChain.recoveryActionId',
        severity: 'BLOCKING',
        message: `RecoveryRule "${entry.value.id}" RESULT_QUALITY actionId "${trigger.actionId}" is not declared in actions/`,
        file: entry.file,
      });
    }
  }

  return issues;
}
