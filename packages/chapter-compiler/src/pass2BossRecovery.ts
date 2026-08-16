import type { SchemaValidationResult } from './pass1Schema.js';
import type { ReferenceIssue } from './types.js';

export function runBossChecks(schemaResult: SchemaValidationResult): ReferenceIssue[] {
  const issues: ReferenceIssue[] = [];

  for (const entry of schemaResult.boss.passed) {
    for (const phase of entry.value.phases) {
      const interaction = schemaResult.interactions.passed.find(
        (i) => i.value.id === phase.interactionId,
      );
      if (interaction === undefined) {
        issues.push({
          category: 'boss.interactionId',
          severity: 'BLOCKING',
          message: `BossPhase "${phase.id}" of BossNode "${entry.value.id}" interactionId "${phase.interactionId}" is not declared in interactions/`,
          file: entry.file,
        });
        continue;
      }
      const allowedTargets = new Set([entry.value.id, entry.value.onDefeat, entry.value.onFailure]);
      if (!allowedTargets.has(interaction.value.nextScene)) {
        issues.push({
          category: 'boss.interactionNextScene',
          severity: 'ADVISORY',
          message: `InteractionNode "${interaction.value.id}" of BossNode "${entry.value.id}" nextScene "${interaction.value.nextScene}" should point back to the boss node or one of its onDefeat/onFailure targets`,
          file: interaction.file,
        });
      }
    }
  }

  return issues;
}
