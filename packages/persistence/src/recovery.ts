import type { DatabaseSync } from 'node:sqlite';
import {
  restoreRuntimeMachine,
  type Ports,
  type RuntimeActor,
} from '@interactive-story/runtime-kernel';
import { loadLatestSnapshot } from './snapshotStore.js';

export function restoreSession(
  db: DatabaseSync,
  input: {
    sessionId: string;
    chapterRootDir: string;
    seed: string;
    ports?: Partial<Ports>;
  },
): RuntimeActor {
  const snapshot = loadLatestSnapshot(db, input.sessionId);
  if (snapshot === undefined) {
    throw new Error(`No persisted snapshot for session: ${input.sessionId}`);
  }
  const restoreInput: Parameters<typeof restoreRuntimeMachine>[0] = {
    chapterRootDir: input.chapterRootDir,
    seed: input.seed,
    persisted: snapshot.persisted,
  };
  if (input.ports !== undefined) restoreInput.ports = input.ports;
  return restoreRuntimeMachine(restoreInput);
}
