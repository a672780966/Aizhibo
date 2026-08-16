import type { ReferenceIndex } from './referenceIndex.js';
import type { SchemaValidationResult } from './pass1Schema.js';
import type { ReferenceIssue } from './types.js';

export function runStoryGraphChecks(
  schemaResult: SchemaValidationResult,
  index: ReferenceIndex,
): ReferenceIssue[] {
  const issues: ReferenceIssue[] = [];
  const nodes = schemaResult.storyGraph.passed?.nodes ?? [];

  const manifest = schemaResult.manifest.passed;
  if (manifest !== null) {
    const entry = nodes.find((n) => n.id === manifest.entryNodeId);
    if (entry === undefined) {
      issues.push({
        category: 'storyGraph.entryNodeId',
        severity: 'BLOCKING',
        message: `entryNodeId "${manifest.entryNodeId}" is not registered in story.graph.json`,
        file: 'manifest.json',
      });
    } else if (entry.kind !== 'SCENE') {
      issues.push({
        category: 'storyGraph.entryNodeId',
        severity: 'BLOCKING',
        message: `entryNodeId "${manifest.entryNodeId}" must reference a SCENE node, but its kind is ${entry.kind}`,
        file: 'manifest.json',
      });
    }
  }

  for (const node of nodes) {
    const fileId = index.nodeFileToId.get(node.file);
    if (fileId === undefined) {
      issues.push({
        category: 'storyGraph.nodeFileMissing',
        severity: 'BLOCKING',
        message: `story graph node "${node.id}" points to "${node.file}", which is not present among schema-validated scene/boss/ending files`,
        file: 'story.graph.json',
      });
    } else if (fileId !== node.id) {
      issues.push({
        category: 'storyGraph.nodeIdMismatch',
        severity: 'BLOCKING',
        message: `story graph node "${node.id}" points to "${node.file}", but that file declares id "${fileId}"`,
        file: 'story.graph.json',
      });
    }
  }

  const registeredFiles = new Set(nodes.map((n) => n.file));
  for (const entry of [
    ...schemaResult.scenes.passed,
    ...schemaResult.boss.passed,
    ...schemaResult.endings.passed,
  ]) {
    if (!registeredFiles.has(entry.file)) {
      issues.push({
        category: 'storyGraph.orphanFile',
        severity: 'BLOCKING',
        message: `file "${entry.file}" is not registered in story.graph.json`,
        file: entry.file,
      });
    }
  }

  for (const entry of schemaResult.scenes.passed) {
    const scene = entry.value;
    if (scene.next !== undefined && !index.storyGraphNodes.has(scene.next)) {
      issues.push({
        category: 'storyGraph.sceneNext',
        severity: 'BLOCKING',
        message: `SceneNode "${scene.id}" next "${scene.next}" is not a registered story graph node`,
        file: entry.file,
      });
    }
    for (const guard of scene.guards ?? []) {
      if (!index.storyGraphNodes.has(guard.goto)) {
        issues.push({
          category: 'storyGraph.guardGoto',
          severity: 'BLOCKING',
          message: `SceneNode "${scene.id}" guard goto "${guard.goto}" is not a registered story graph node`,
          file: entry.file,
        });
      }
    }
    if (scene.interactionId !== undefined && !index.interactions.has(scene.interactionId)) {
      issues.push({
        category: 'storyGraph.sceneInteractionId',
        severity: 'BLOCKING',
        message: `SceneNode "${scene.id}" interactionId "${scene.interactionId}" is not declared in interactions/`,
        file: entry.file,
      });
    }
  }

  for (const entry of schemaResult.interactions.passed) {
    if (!index.storyGraphNodes.has(entry.value.nextScene)) {
      issues.push({
        category: 'storyGraph.interactionNextScene',
        severity: 'BLOCKING',
        message: `InteractionNode "${entry.value.id}" nextScene "${entry.value.nextScene}" is not a registered story graph node`,
        file: entry.file,
      });
    }
  }

  for (const entry of schemaResult.boss.passed) {
    if (!index.storyGraphNodes.has(entry.value.onDefeat)) {
      issues.push({
        category: 'storyGraph.bossOutgoing',
        severity: 'BLOCKING',
        message: `BossNode "${entry.value.id}" onDefeat "${entry.value.onDefeat}" is not a registered story graph node`,
        file: entry.file,
      });
    }
    if (!index.storyGraphNodes.has(entry.value.onFailure)) {
      issues.push({
        category: 'storyGraph.bossOutgoing',
        severity: 'BLOCKING',
        message: `BossNode "${entry.value.id}" onFailure "${entry.value.onFailure}" is not a registered story graph node`,
        file: entry.file,
      });
    }
  }

  return issues;
}
