import type { CompileResult } from '@interactive-story/chapter-compiler';
import type {
  ActionDefinition,
  InteractionNode,
  NarrativeBlock,
  ResultNarrative,
  WorldState,
} from '@interactive-story/chapter-schema';
import type { DiceRollResult } from '@interactive-story/dice-engine';
import { rollDice } from '@interactive-story/dice-engine';
import type { ResolveResult } from '@interactive-story/rule-engine';
import { applyEffect, resolveAction } from '@interactive-story/rule-engine';

export interface ActionGroup {
  choiceId: string;
  actionId: string;
  viewerCount: number;
}

/** The pure INTERACTION resolution, decoupled from XState so it is directly unit-testable. */
export interface ResolutionOutcome {
  resolved: ResolveResult[];
  nextWorld: WorldState;
  diceRecords: DiceRollResult[];
}

/**
 * Group the round's votes by choiceId, in choice order, and resolve each group
 * through the full frozen pipeline: dice-engine roll -> rule-engine
 * resolveAction -> applyEffect accumulation on the world. Pure function.
 *
 * Dice determinism: the seed for a dice-engine call is `<baseSeed>:<groupIndex>`
 * and the rollIndex is the sequence counter + group index (see DECISIONS D5).
 */
export function resolveGroups(
  compiled: CompileResult,
  votes: Record<string, string>,
  world: WorldState,
  baseSeed: string,
  sequence: number,
  interaction: InteractionNode,
): ResolutionOutcome {
  const schema = compiled.schemaResult;

  const actionById = new Map(schema.actions.passed.map((e) => [e.value.id, e.value]));
  const diceById = new Map(schema.dice.passed.map((e) => [e.value.id, e.value]));
  const resultById = new Map(schema.results.passed.map((e) => [e.value.id, e.value]));
  const worldRules = schema.worldRules.passed;

  // derive groups in the choice order of the interaction
  const groups: ActionGroup[] = [];
  for (const choice of interaction.choices) {
    const viewerIds = Object.entries(votes)
      .filter(([, c]) => c === choice.id)
      .map(([viewerId]) => viewerId);
    if (viewerIds.length > 0) {
      groups.push({ choiceId: choice.id, actionId: choice.ruleId, viewerCount: viewerIds.length });
    }
  }

  let currentWorld = world;
  const resolved: ResolveResult[] = [];
  const diceRecords: DiceRollResult[] = [];

  groups.forEach((group, index) => {
    const action: ActionDefinition | undefined = actionById.get(group.actionId);
    if (action === undefined || worldRules === null) return;
    const profile = diceById.get(action.diceProfileId);
    const resultDict = resultById.get(action.resultSetId);
    if (profile === undefined || resultDict === undefined) return;

    const dice = rollDice(profile, `${baseSeed}:${index}`, sequence + index, currentWorld);
    diceRecords.push(dice);

    const result = resolveAction(
      {
        chapterId: world.chapterId,
        sceneId: world.sceneId,
        interactionId: interaction.id,
        actionId: action.id,
        participantCount: group.viewerCount,
        dice,
        worldState: currentWorld,
      },
      action,
      worldRules,
      resultDict,
    );
    if (result === undefined) return;

    resolved.push(result);
    for (const effect of result.worldEffects) {
      currentWorld = applyEffect(effect, currentWorld);
    }
  });

  return { resolved, nextWorld: currentWorld, diceRecords };
}

/** The rule: each viewer has one effective vote; the last submission wins. */
export function applyVote(
  votes: Record<string, string>,
  viewerId: string,
  choiceId: string,
): Record<string, string> {
  return { ...votes, [viewerId]: choiceId };
}

export function buildNarrativeInputs(compiled: CompileResult): {
  resultNarratives: Map<string, ResultNarrative>;
  blocksById: Map<string, NarrativeBlock>;
} {
  const resultNarratives = new Map<string, ResultNarrative>();
  const blocksById = new Map<string, NarrativeBlock>();
  for (const entry of compiled.schemaResult.narrative.passed) {
    const v = entry.value;
    if ('focus' in v && 'primaryBlockId' in v) {
      resultNarratives.set(v.id, v as ResultNarrative);
    } else if ('slot' in v && 'text' in v) {
      blocksById.set(v.id, v as unknown as NarrativeBlock);
    }
  }
  return { resultNarratives, blocksById };
}

/**
 * The INTERACTION region (spec §7, 6 states). It auto-starts once STORY is
 * waiting for an interaction (guard `storyWantsInteraction` sees the shared
 * snapshot's storyPhase), gathers votes in OPEN, and resolves on LOCK.
 *
 *   CLOSED -> ANNOUNCING -> OPEN -> LOCKING -> LOCKED -> RESOLVED
 */
export const interactionRegion = {
  initial: 'CLOSED' as const,
  states: {
    CLOSED: {
      on: { 'INTERACTION.OPEN': { target: 'ANNOUNCING', actions: 'onAnnouncing' } },
    },
    ANNOUNCING: {
      always: { target: 'OPEN', actions: 'onOpen' },
    },
    OPEN: {
      on: {
        VOTE: { actions: 'onVote' },
        LOCK: { target: 'LOCKING', actions: 'onLock' },
      },
    },
    LOCKING: {
      after: {
        DICE_PACING: { target: 'LOCKED', actions: 'onResolve' },
      },
    },
    LOCKED: {
      always: { target: 'RESOLVED', actions: 'onResolved' },
    },
    RESOLVED: { description: 'interaction resolved (effects applied)' },
  },
};
