import type { StateEffect, WorldState } from '@interactive-story/chapter-schema';
import { resolveStatePath, writeStatePath } from './statePath.js';

/**
 * Apply one StateEffect to a WorldState, returning a NEW object (the input is
 * never mutated — task package §9 constraint 2). Defensive: unsupported
 * container/op combinations return the unchanged `state` rather than throwing.
 */
export function applyEffect(effect: StateEffect, state: WorldState): WorldState {
  switch (effect.op) {
    case 'SET':
      return writeStatePath(state, effect.path, effect.value);
    case 'INC':
      return applyIncDec(effect, state, 1);
    case 'DEC':
      return applyIncDec(effect, state, -1);
    case 'PUSH':
      return pushRemoveMember(effect, state, true);
    case 'REMOVE':
      return pushRemoveMember(effect, state, false);
  }
}

function applyIncDec(effect: StateEffect, state: WorldState, sign: 1 | -1): WorldState {
  const current = resolveStatePath(state, effect.path);
  const base = typeof current === 'number' ? current : 0; // non-numeric → start at 0
  const delta = typeof effect.value === 'number' ? effect.value : 1;
  return writeStatePath(state, effect.path, base + sign * delta);
}

function pushRemoveMember(effect: StateEffect, state: WorldState, push: boolean): WorldState {
  const container = effect.path.container;
  if (container !== 'discovered' && container !== 'activeThreats') {
    return state;
  }
  const value = String(effect.value ?? '');
  const array = state[container];
  if (push) {
    if (array.includes(value)) return state; // idempotent
    return { ...state, [container]: [...array, value] };
  }
  if (!array.includes(value)) return state;
  return { ...state, [container]: array.filter((x) => x !== value) };
}
