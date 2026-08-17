import type { StateEffect, StatePath, WorldState } from '@interactive-story/chapter-schema';
import type { SchemaValidationResult } from './pass1Schema.js';

export type ReachableValue = string | number | boolean;

/**
 * Sentinel stored in a key's value set to denote "this key may hold any value".
 * Used when a key is touched only by effects whose exact value cannot be
 * statically inferred (INC/DEC/PUSH/REMOVE), or whose declared value type is
 * open (chapterVariables). Satisfiability treats a set containing ANY_VALUE as
 * satisfying any EQ/IN target — the conservative over-approximation the task
 * package mandates (T005 #4): never kill content we cannot prove dead.
 */
export const ANY_VALUE = '\u0000*any*';

export interface ReachableStateModel {
  keys: Map<string, Set<ReachableValue>>;
}

/** Render a StatePath as `container.key` or `container.key.field`. */
export function pathKey(path: StatePath): string {
  return path.field === undefined
    ? `${path.container}.${path.key}`
    : `${path.container}.${path.key}.${path.field}`;
}

export function buildReachableStateModel(
  schemaResult: SchemaValidationResult,
  reachableNodeIds: Set<string>,
): ReachableStateModel {
  const keys = new Map<string, Set<ReachableValue>>();

  const add = (key: string, value?: ReachableValue, unknown = false): void => {
    const values = keys.get(key) ?? new Set<ReachableValue>();
    if (unknown) {
      values.add(ANY_VALUE);
    } else if (value !== undefined) {
      values.add(value);
    }
    keys.set(key, values);
  };
  const applyEffect = (effect: StateEffect): void => {
    const key = pathKey(effect.path);
    if (effect.op === 'SET' && effect.value !== undefined) {
      add(key, effect.value);
    } else {
      // INC/DEC/PUSH/REMOVE (or a valueless SET): register existence only,
      // value unknown — conservative over-approximation.
      add(key, undefined, true);
    }
  };

  seedWorldState(schemaResult.initialState.passed, add);

  for (const effect of collectReachableEffects(schemaResult, reachableNodeIds)) {
    applyEffect(effect);
  }

  for (const entry of schemaResult.boss.passed) {
    if (!reachableNodeIds.has(entry.value.id)) continue;
    // BossNode.variables are injected into chapterVariables (ADDENDUM §A11).
    for (const [variableKey, value] of Object.entries(entry.value.variables)) {
      add(`chapterVariables.${variableKey}`, value);
    }
    const ruleSet = schemaResult.stateRules.passed.find(
      (r) => r.value.id === entry.value.stateRuleSetId,
    );
    if (ruleSet !== undefined) {
      for (const rule of ruleSet.value.rules) {
        for (const effect of rule.effects) {
          applyEffect(effect);
        }
      }
    }
  }

  return { keys };
}

/** All keys declared by initial.state.json: flags, chapterVariables, npc.*, danger.*. */
function seedWorldState(
  state: WorldState | null,
  add: (key: string, value?: ReachableValue, unknown?: boolean) => void,
): void {
  if (state === null) return;
  for (const [key, value] of Object.entries(state.flags)) {
    add(`flags.${key}`, value);
  }
  for (const key of Object.keys(state.chapterVariables)) {
    // chapterVariables values are schema-open (unknown) — existence only.
    add(`chapterVariables.${key}`, undefined, true);
  }
  for (const [npcId, npcState] of Object.entries(state.npc)) {
    add(`npc.${npcId}.present`, npcState.present);
    add(`npc.${npcId}.alive`, npcState.alive);
    add(`npc.${npcId}.disposition`, npcState.disposition);
    for (const [flagKey, flagValue] of Object.entries(npcState.flags)) {
      add(`npc.${npcId}.flags.${flagKey}`, flagValue);
    }
  }
  add('danger.level', state.danger.level);
  add('danger.tensionKey', state.danger.tensionKey);
}

/**
 * World effects that can possibly happen: only those of ResultDictionaries
 * reachable through the chain `reachable scene/boss interaction → Choice.ruleId
 * → ActionDefinition → resultSetId`, plus reachable bosses' StateRuleSet
 * effects. Unreachable nodes' contributions are excluded (A13).
 */
function collectReachableEffects(
  schemaResult: SchemaValidationResult,
  reachableNodeIds: Set<string>,
): StateEffect[] {
  const effects: StateEffect[] = [];
  const seenDicts = new Set<string>();
  const collectDict = (resultSetId: string): void => {
    if (seenDicts.has(resultSetId)) return;
    seenDicts.add(resultSetId);
    for (const dict of schemaResult.results.passed) {
      if (dict.value.id !== resultSetId) continue;
      for (const entry of dict.value.entries) {
        if ('worldEffects' in entry) {
          effects.push(...entry.worldEffects);
        }
      }
    }
  };
  const collectInteraction = (interactionId: string | undefined): void => {
    if (interactionId === undefined) return;
    const interaction = schemaResult.interactions.passed.find((i) => i.value.id === interactionId);
    if (interaction === undefined) return;
    for (const choice of interaction.value.choices) {
      const action = schemaResult.actions.passed.find((a) => a.value.id === choice.ruleId);
      if (action !== undefined) {
        collectDict(action.value.resultSetId);
      }
    }
  };

  for (const entry of schemaResult.scenes.passed) {
    if (!reachableNodeIds.has(entry.value.id)) continue;
    collectInteraction(entry.value.interactionId);
  }
  for (const entry of schemaResult.boss.passed) {
    if (!reachableNodeIds.has(entry.value.id)) continue;
    for (const phase of entry.value.phases) {
      collectInteraction(phase.interactionId);
    }
  }

  return effects;
}

/**
 * Action ids referenced by choices of interactions on reachable nodes — used
 * by PASS 5 satisfiability to judge RESULT_QUALITY recovery triggers.
 */
export function reachableInteractionActionIds(
  schemaResult: SchemaValidationResult,
  reachableNodeIds: Set<string>,
): Set<string> {
  const actionIds = new Set<string>();
  const collectInteraction = (interactionId: string | undefined): void => {
    if (interactionId === undefined) return;
    const interaction = schemaResult.interactions.passed.find((i) => i.value.id === interactionId);
    if (interaction === undefined) return;
    for (const choice of interaction.value.choices) {
      if (schemaResult.actions.passed.some((a) => a.value.id === choice.ruleId)) {
        actionIds.add(choice.ruleId);
      }
    }
  };
  for (const entry of schemaResult.scenes.passed) {
    if (!reachableNodeIds.has(entry.value.id)) continue;
    collectInteraction(entry.value.interactionId);
  }
  for (const entry of schemaResult.boss.passed) {
    if (!reachableNodeIds.has(entry.value.id)) continue;
    for (const phase of entry.value.phases) {
      collectInteraction(phase.interactionId);
    }
  }
  return actionIds;
}
