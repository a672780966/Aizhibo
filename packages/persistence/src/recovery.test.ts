import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  createRuntimeMachine,
  getEventLog,
  getPersistedSnapshot,
  getRuntimeSnapshot,
  getStoryPhase,
  getInteractionPhase,
} from '@interactive-story/runtime-kernel';
import { appendEvents } from './eventStore.js';
import { openDatabase } from './db.js';
import { createSession } from './sessionStore.js';
import { restoreSession } from './recovery.js';
import { saveSnapshot } from './snapshotStore.js';

const fixture = fileURLToPath(
  new URL('../../chapter-compiler/test-fixtures/valid-minimal', import.meta.url),
);

describe('restoreSession', () => {
  it('restores a crashed actor from the write-through LKG', () => {
    const db = openDatabase(':memory:');
    const sessionId = 'session-recovery';
    createSession(db, { sessionId, chapterId: 'ch-001', seed: 'recovery' });
    const actor = createRuntimeMachine({ chapterRootDir: fixture, seed: 'recovery' });
    let savedEvents = 0;
    const persist = (): void => {
      const events = getEventLog(actor);
      appendEvents(db, sessionId, events.slice(savedEvents));
      savedEvents = events.length;
      const latest = events.at(-1);
      saveSnapshot(db, sessionId, latest?.sequence ?? 0, getPersistedSnapshot(actor), 'ch-001');
    };

    actor.send({ type: 'BOOT' });
    persist();
    actor.send({ type: 'STORY.DONE' });
    persist();
    actor.send({ type: 'INTERACTION.OPEN' });
    persist();
    actor.send({ type: 'VOTE', viewerId: 'viewer-1', choiceId: 'A' });
    persist();
    actor.send({ type: 'LOCK' });
    persist();

    const expectedLog = getEventLog(actor);
    const expectedStory = getStoryPhase(getRuntimeSnapshot(actor));
    const expectedInteraction = getInteractionPhase(getRuntimeSnapshot(actor));
    const restored = restoreSession(db, {
      sessionId,
      chapterRootDir: fixture,
      seed: 'recovery',
    });
    expect(getStoryPhase(getRuntimeSnapshot(restored))).toBe(expectedStory);
    expect(getInteractionPhase(getRuntimeSnapshot(restored))).toBe(expectedInteraction);
    expect(getEventLog(restored)).toEqual(expectedLog);
  });
});
