import type { PresentationPort } from './ports.js';

export interface PresentationCommand {
  commandSeq: number;
  command: unknown;
}

export interface PresentationState {
  phase: 'LOADING' | 'READY' | 'FAILOVER';
  currentSceneId?: string;
  lastResultText?: string;
}

export interface SequencedPresentationPort extends PresentationPort {
  getState(): PresentationState;
}

function kindOf(command: unknown): string | undefined {
  if (typeof command !== 'object' || command === null || !('kind' in command)) return undefined;
  const kind = (command as { kind: unknown }).kind;
  return typeof kind === 'string' ? kind : undefined;
}

function foldState(commands: readonly unknown[]): PresentationState {
  const state: PresentationState = { phase: 'LOADING' };
  for (const command of commands) {
    if (typeof command !== 'object' || command === null) continue;
    const value = command as { kind?: unknown; sceneId?: unknown; text?: unknown };
    switch (kindOf(value)) {
      case 'PRES_LOADING':
        state.phase = 'LOADING';
        break;
      case 'PRES_READY':
        state.phase = 'READY';
        break;
      case 'PRES_FAILOVER':
        state.phase = 'FAILOVER';
        break;
      case 'SCENE_ENTER':
        if (typeof value.sceneId === 'string') state.currentSceneId = value.sceneId;
        break;
      case 'RESULT_PLAYING':
        if (typeof value.text === 'string') state.lastResultText = value.text;
        break;
      default:
        break;
    }
  }
  return state;
}

export function wrapPresentationPort(inner: PresentationPort): SequencedPresentationPort {
  let nextCommandSeq = 1;
  const commands: unknown[] = [];

  const wrapped: SequencedPresentationPort = {
    send(command) {
      const envelope: PresentationCommand = { commandSeq: nextCommandSeq++, command };
      commands.push(command);
      inner.send(envelope);
    },
    getState: () => foldState(commands),
  };

  inner.onRendererHello?.(() => {
    wrapped.send({ kind: 'PRESENTATION_RESYNC', state: wrapped.getState() });
  });

  return wrapped;
}
