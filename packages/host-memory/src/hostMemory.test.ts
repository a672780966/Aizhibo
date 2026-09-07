import { describe, expect, it } from 'vitest';
import { openDatabase } from '@interactive-story/persistence';
import { createHostMemory } from './hostMemory.js';

describe('createHostMemory', () => {
  it('recalls a viewer note after remembering it', () => {
    const memory = createHostMemory(openDatabase(':memory:'));
    memory.rememberViewer('twitch', 'viewer-1', 'first note');
    expect(memory.recallViewer('twitch', 'viewer-1')).toEqual({
      platform: 'twitch',
      viewerId: 'viewer-1',
      note: 'first note',
    });
  });

  it('returns undefined for a viewer that was never remembered', () => {
    const memory = createHostMemory(openDatabase(':memory:'));
    expect(memory.recallViewer('twitch', 'nobody')).toBeUndefined();
  });

  it('lists a running joke after adding it', () => {
    const memory = createHostMemory(openDatabase(':memory:'));
    memory.addRunningJoke('twitch', 'joke-1', 'hello world');
    expect(memory.listRunningJokes('twitch')).toEqual([
      { id: 'joke-1', platform: 'twitch', text: 'hello world' },
    ]);
  });

  it('purge deletes expired records only for listed platforms', () => {
    const db = openDatabase(':memory:');
    const memory = createHostMemory(db);
    memory.rememberViewer('twitch', 'viewer-1', 'twitch note');
    memory.rememberViewer('youtube', 'viewer-1', 'youtube note');
    db.prepare(
      `UPDATE host_viewer_memory SET last_seen_at = '2000-01-01T00:00:00.000Z'
       WHERE platform IN ('twitch', 'youtube')`,
    ).run();
    memory.purge({ twitch: 1000 });
    expect(memory.recallViewer('twitch', 'viewer-1')).toBeUndefined();
    expect(memory.recallViewer('youtube', 'viewer-1')?.note).toBe('youtube note');
  });

  it('reports OK from getHealth on a healthy database', () => {
    const memory = createHostMemory(openDatabase(':memory:'));
    expect(memory.getHealth().status).toBe('OK');
  });
});
