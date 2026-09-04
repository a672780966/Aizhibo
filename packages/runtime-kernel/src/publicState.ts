import type { WorldState, HostPublicSpec } from '@interactive-story/chapter-schema';
import type { RuntimeActor } from './machine.js';
import { getRuntimeSnapshot, getEventLog, getCurrentChoiceIds } from './machine.js';
import { getStoryPhase, getInteractionPhase, unwrapSnapshot } from './snapshot.js';

export interface PublicChoice {
  id: string;
}

export interface PublicDiceResult {
  diceType: string;
  finalValue: number;
  quality: string | undefined;
}

export interface PublicRuntimeState {
  currentLocation: string;
  knownFacts: string[];
  currentChoices?: PublicChoice[];
  publishedDice?: PublicDiceResult[];
  currentTension: string;
  storyPhase: string;
  interactionPhase: string;
}

function resolveWorldStateKey(world: WorldState, key: string): unknown {
  const parts = key.split('.');
  const [container, ...rest] = parts;
  if (container === 'flags') {
    return world.flags[rest.join('.')];
  }
  if (container === 'chapterVariables') {
    return world.chapterVariables[rest.join('.')];
  }
  if (container === 'npc') {
    const [npcId, field, ...flagRest] = rest;
    const npc = npcId !== undefined ? world.npc[npcId] : undefined;
    if (npc === undefined) return undefined;
    if (field === 'present') return npc.present;
    if (field === 'alive') return npc.alive;
    if (field === 'disposition') return npc.disposition;
    if (field === 'flags') return npc.flags[flagRest.join('.')];
    return undefined;
  }
  if (container === 'danger') {
    if (rest[0] === 'level') return world.danger.level;
    if (rest[0] === 'tensionKey') return world.danger.tensionKey;
    return undefined;
  }
  return undefined;
}

export function isFactSafeToDisclose(
  dependencies: string[] | undefined,
  flagVisibility: Record<string, 'PUBLIC' | 'HIDDEN'>,
  world: WorldState,
): boolean {
  if (dependencies === undefined) return false;
  for (const key of dependencies) {
    if (flagVisibility[key] !== 'PUBLIC') return false;
    if (resolveWorldStateKey(world, key) === undefined) return false;
  }
  return true;
}

export function getPublicState(
  actor: RuntimeActor,
  hostPublicSpec: HostPublicSpec,
): PublicRuntimeState {
  const snapshot = getRuntimeSnapshot(actor);
  const internal = unwrapSnapshot(snapshot);
  const world = internal.world;
  const sceneId = world.sceneId;
  const interactionPhase = internal.interactionPhase;

  const disclosure = hostPublicSpec.sceneDisclosures[sceneId];
  const currentLocation = disclosure?.locationLabel ?? '';

  const knownFactIds = disclosure?.knownFactIds ?? [];
  const dependencyOf = disclosure?.knownFactDependencies ?? {};
  const knownFacts = knownFactIds.filter((factId) =>
    isFactSafeToDisclose(dependencyOf[factId], hostPublicSpec.flagVisibility, world),
  );

  const choiceIds = interactionPhase === 'OPEN' ? getCurrentChoiceIds(actor) : [];
  const currentChoices = choiceIds.length > 0 ? choiceIds.map((id) => ({ id })) : undefined;

  // Dice only publish when an interaction resolves (LOCK -> RESOLVED). While
  // the interaction is still open / story is still playing, no roll has
  // resolved yet, so surface no dice results (A14: 非互动时 undefined).
  const publishedDiceEntries =
    interactionPhase !== 'OPEN' && interactionPhase !== 'CLOSED'
      ? getEventLog(actor).filter(
          (entry) => entry.type === 'DICE.PUBLISHED' && entry.visibility === 'PUBLIC',
        )
      : [];
  const publishedDice =
    publishedDiceEntries.length > 0
      ? publishedDiceEntries.map((entry) => {
          const payload = entry.payload as {
            diceType: string;
            finalValue: number;
            quality: string | undefined;
          };
          return {
            diceType: payload.diceType,
            finalValue: payload.finalValue,
            quality: payload.quality,
          };
        })
      : undefined;

  const currentTension = hostPublicSpec.tensionLabels[world.danger.tensionKey] ?? '';

  return {
    currentLocation,
    knownFacts,
    ...(currentChoices !== undefined ? { currentChoices } : {}),
    ...(publishedDice !== undefined ? { publishedDice } : {}),
    currentTension,
    storyPhase: getStoryPhase(snapshot),
    interactionPhase: getInteractionPhase(snapshot),
  };
}
