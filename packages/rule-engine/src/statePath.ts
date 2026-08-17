import type { StatePath, WorldState } from '@interactive-story/chapter-schema';

/**
 * Resolve a StatePath against a WorldState instance. The addressing semantics
 * for each container (defined in ADDENDUM-001 §A6 but only now pinned down at
 * runtime) are:
 *   - flags / chapterVariables: state[container][key]
 *   - npc: field must be present/alive/disposition, or "flags.<subkey>"
 *   - danger: field must be "level" | "tensionKey" (danger is a singleton, key unused)
 *   - discovered / activeThreats: boolean — is path.key a member of the array
 * Unsupported / undefined addressing yields `undefined` (never throws).
 */
export function resolveStatePath(state: WorldState, path: StatePath): unknown {
  switch (path.container) {
    case 'flags':
      return state.flags[path.key];
    case 'chapterVariables':
      return state.chapterVariables[path.key];
    case 'npc':
      return resolveNpcField(state, path);
    case 'danger':
      return resolveDangerField(state, path);
    case 'discovered':
      return state.discovered.includes(path.key);
    case 'activeThreats':
      return state.activeThreats.includes(path.key);
  }
}

function resolveNpcField(state: WorldState, path: StatePath): unknown {
  const npcState = state.npc[path.key];
  const field = path.field;
  if (field === undefined) return undefined;
  if (field === 'present' || field === 'alive' || field === 'disposition') {
    return npcState?.[field];
  }
  if (field.startsWith('flags.')) {
    const subkey = field.slice('flags.'.length);
    return npcState?.flags[subkey];
  }
  return undefined;
}

function resolveDangerField(state: WorldState, path: StatePath): unknown {
  if (path.field === 'level' || path.field === 'tensionKey') {
    return state.danger[path.field];
  }
  return undefined;
}

/**
 * Immutable write of a concrete value at a StatePath, for the direct-assignment
 * containers only (flags / chapterVariables / npc.field / danger.field).
 * discovered / activeThreats writes are PUSH/REMOVE concerns handled by the
 * effect layer, not here. Unsupported paths return the unchanged `state`.
 */
export function writeStatePath(state: WorldState, path: StatePath, value: unknown): WorldState {
  switch (path.container) {
    case 'flags':
      return {
        ...state,
        flags: { ...state.flags, [path.key]: value as string | number | boolean },
      };
    case 'chapterVariables':
      return { ...state, chapterVariables: { ...state.chapterVariables, [path.key]: value } };
    case 'npc':
      return writeNpcField(state, path, value);
    case 'danger':
      return writeDangerField(state, path, value);
    default:
      return state;
  }
}

function writeNpcField(state: WorldState, path: StatePath, value: unknown): WorldState {
  const field = path.field;
  const npcState = state.npc[path.key];
  if (field === undefined || npcState === undefined) return state;
  if (field === 'present' || field === 'alive') {
    return {
      ...state,
      npc: { ...state.npc, [path.key]: { ...npcState, [field]: value as boolean } },
    };
  }
  if (field === 'disposition') {
    return {
      ...state,
      npc: {
        ...state.npc,
        [path.key]: {
          ...npcState,
          disposition: value as 'HOSTILE' | 'NEUTRAL' | 'FRIENDLY',
        },
      },
    };
  }
  if (field.startsWith('flags.')) {
    const subkey = field.slice('flags.'.length);
    return {
      ...state,
      npc: {
        ...state.npc,
        [path.key]: {
          ...npcState,
          flags: { ...npcState.flags, [subkey]: value as string | number | boolean },
        },
      },
    };
  }
  return state;
}

function writeDangerField(state: WorldState, path: StatePath, value: unknown): WorldState {
  if (path.field === 'level') {
    return { ...state, danger: { ...state.danger, level: value as number } };
  }
  if (path.field === 'tensionKey') {
    return { ...state, danger: { ...state.danger, tensionKey: value as string } };
  }
  return state;
}
