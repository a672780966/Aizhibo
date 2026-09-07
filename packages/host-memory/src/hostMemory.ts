import type { DatabaseSync } from 'node:sqlite';
import type { Health } from '@interactive-story/shared';
import {
  getHostViewerMemory,
  upsertHostViewerMemory,
  type HostViewerMemoryEntry,
  addHostRunningJoke,
  listHostRunningJokes,
  type HostRunningJokeEntry,
  deleteExpiredHostViewerMemory,
  deleteExpiredHostRunningJokes,
  getHealth,
} from '@interactive-story/persistence';

export interface HostMemory {
  rememberViewer(platform: string, viewerId: string, note: string): void;
  recallViewer(platform: string, viewerId: string): HostViewerMemoryEntry | undefined;
  addRunningJoke(platform: string, id: string, text: string): void;
  listRunningJokes(platform: string): HostRunningJokeEntry[];
  purge(retentionMsByPlatform: Record<string, number>): void;
  getHealth(): Health;
}

export function createHostMemory(db: DatabaseSync): HostMemory {
  return {
    rememberViewer(platform, viewerId, note) {
      upsertHostViewerMemory(db, { platform, viewerId, note });
    },
    recallViewer(platform, viewerId) {
      return getHostViewerMemory(db, platform, viewerId);
    },
    addRunningJoke(platform, id, text) {
      addHostRunningJoke(db, { platform, id, text });
    },
    listRunningJokes(platform) {
      return listHostRunningJokes(db, platform);
    },
    purge(retentionMsByPlatform) {
      for (const [platform, retentionMs] of Object.entries(retentionMsByPlatform)) {
        const olderThanIso = new Date(Date.now() - retentionMs).toISOString();
        deleteExpiredHostViewerMemory(db, platform, olderThanIso);
        deleteExpiredHostRunningJokes(db, platform, olderThanIso);
      }
    },
    getHealth() {
      return getHealth(db);
    },
  };
}
