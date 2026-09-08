import type {
  Pass3ReachabilityResult,
  SchemaValidationResult,
  StoryGraphModel,
} from '@interactive-story/chapter-compiler';

type ResultDictionaryValue = SchemaValidationResult['results']['passed'][number]['value'];

/** The ResultNarrative member of the narrative mixed union. */
type ResultNarrativeValue = Extract<
  SchemaValidationResult['narrative']['passed'][number]['value'],
  { primaryBlockId: string }
>;

function indexById<T extends { id: string }>(entries: { value: T }[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const entry of entries) {
    map.set(entry.value.id, entry.value);
  }
  return map;
}

/**
 * Collect every NarrativeBlock id referenced by one ResultDictionary.
 *
 * The `mapsTo` semantics are reused verbatim from pass2ActionChain.ts: a
 * `{quality, mapsTo}` entry resolves by hopping exactly one step to the
 * entry with that `quality` in the SAME `entries` array (chained mapsTo is
 * forbidden there and contributes nothing here); `{quality, unreachable:
 * true}` entries contribute nothing. A resolved full entry then yields its
 * ResultNarrative's five block fields.
 */
function collectFromResultDict(
  dict: ResultDictionaryValue,
  narrativeIndex: Map<string, ResultNarrativeValue>,
  blockIds: Set<string>,
): void {
  for (const entry of dict.entries) {
    if ('unreachable' in entry) continue;
    const resolved =
      'mapsTo' in entry ? dict.entries.find((e) => e.quality === entry.mapsTo) : entry;
    if (resolved === undefined || !('narrativeId' in resolved)) continue;
    const narrative = narrativeIndex.get(resolved.narrativeId);
    if (narrative === undefined) continue;
    blockIds.add(narrative.primaryBlockId);
    for (const blockId of narrative.supportBlockIds ?? []) blockIds.add(blockId);
    if (narrative.urgencyBlockId !== undefined) blockIds.add(narrative.urgencyBlockId);
    if (narrative.transitionBlockId !== undefined) blockIds.add(narrative.transitionBlockId);
    if (narrative.prefixBlockId !== undefined) blockIds.add(narrative.prefixBlockId);
  }
}

/**
 * CR-018 §4.4 (specs/audit/CR-RESOLUTIONS-001.md): every REACHABLE
 * NarrativeBlock must have a corresponding audio file. This computes the
 * reachable NarrativeBlock id set from the PASS 3 reachability result, via
 * two independent paths that both only apply to ids in
 * `reachability.reachable`:
 *
 * - Path A (interaction chain): reachable SCENE nodes' optional
 *   `SceneNode.interactionId` and reachable BOSS nodes' required
 *   `BossPhase.interactionId` → `InteractionNode.choices[].ruleId` →
 *   `ActionDefinition.resultSetId` → ResultDictionary (collectFromResultDict).
 * - Path B (direct fields, bypassing the chain): reachable BOSS nodes'
 *   optional `BossPhase.narrationBlockIds` and reachable ENDING nodes'
 *   required `EndingNode.narrationBlockIds`.
 *
 * BossPhase has both paths (interactionId required, narrationBlockIds
 * optional but collected when present); EndingNode has only Path B (it is a
 * terminal node, no interactionId/choices).
 */
export function computeReachableNarrativeBlockIds(
  schemaResult: SchemaValidationResult,
  graphModel: StoryGraphModel,
  reachability: Pass3ReachabilityResult,
): Set<string> {
  const blockIds = new Set<string>();

  const narrativeIndex = new Map<string, ResultNarrativeValue>();
  for (const entry of schemaResult.narrative.passed) {
    if ('primaryBlockId' in entry.value) {
      narrativeIndex.set(entry.value.id, entry.value);
    }
  }

  const interactionById = indexById(schemaResult.interactions.passed);
  const actionById = indexById(schemaResult.actions.passed);
  const resultDictById = indexById(schemaResult.results.passed);

  // Path A: follow one SceneNode/BossPhase interaction through the chain.
  const walkPathA = (interactionId: string): void => {
    const interaction = interactionById.get(interactionId);
    if (interaction === undefined) return;
    for (const choice of interaction.choices) {
      const action = actionById.get(choice.ruleId);
      if (action === undefined) continue;
      const dict = resultDictById.get(action.resultSetId);
      if (dict === undefined) continue;
      collectFromResultDict(dict, narrativeIndex, blockIds);
    }
  };

  for (const nodeId of reachability.reachable) {
    const kind = graphModel.nodes.get(nodeId);
    if (kind === 'SCENE') {
      const scene = schemaResult.scenes.passed.find((e) => e.value.id === nodeId)?.value;
      if (scene?.interactionId !== undefined) {
        walkPathA(scene.interactionId);
      }
    } else if (kind === 'BOSS') {
      const boss = schemaResult.boss.passed.find((e) => e.value.id === nodeId)?.value;
      if (boss === undefined) continue;
      for (const phase of boss.phases) {
        walkPathA(phase.interactionId);
        for (const blockId of phase.narrationBlockIds ?? []) {
          blockIds.add(blockId);
        }
      }
    } else if (kind === 'ENDING') {
      const ending = schemaResult.endings.passed.find((e) => e.value.id === nodeId)?.value;
      if (ending === undefined) continue;
      for (const blockId of ending.narrationBlockIds) {
        blockIds.add(blockId);
      }
    }
  }

  return blockIds;
}
