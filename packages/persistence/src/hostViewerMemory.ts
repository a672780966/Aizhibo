import type { DatabaseSync } from 'node:sqlite';

export interface HostViewerMemoryEntry {
  platform: string;
  viewerId: string;
  nickname?: string;
  interactionCount: number;
  knownRunningJokes: string[];
  hostAffinity: number;
  notableEvents: string[];
}

export function upsertHostViewerMemory(db: DatabaseSync, entry: HostViewerMemoryEntry): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO host_viewer_memory
      (platform, viewer_id, nickname, interaction_count, known_running_jokes, host_affinity, notable_events, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (platform, viewer_id) DO UPDATE SET
       nickname = excluded.nickname,
       interaction_count = excluded.interaction_count,
       known_running_jokes = excluded.known_running_jokes,
       host_affinity = excluded.host_affinity,
       notable_events = excluded.notable_events,
       last_seen_at = excluded.last_seen_at`,
  ).run(
    entry.platform,
    entry.viewerId,
    entry.nickname ?? null,
    entry.interactionCount,
    JSON.stringify(entry.knownRunningJokes),
    entry.hostAffinity,
    JSON.stringify(entry.notableEvents),
    now,
    now,
  );
}

export function getHostViewerMemory(
  db: DatabaseSync,
  platform: string,
  viewerId: string,
): HostViewerMemoryEntry | undefined {
  const row = db
    .prepare(
      `SELECT platform, viewer_id, nickname, interaction_count, known_running_jokes, host_affinity, notable_events
       FROM host_viewer_memory WHERE platform = ? AND viewer_id = ?`,
    )
    .get(platform, viewerId) as Record<string, unknown> | undefined;
  if (row === undefined) return undefined;
  const entry: HostViewerMemoryEntry = {
    platform: String(row.platform),
    viewerId: String(row.viewer_id),
    interactionCount: Number(row.interaction_count),
    knownRunningJokes: JSON.parse(String(row.known_running_jokes)) as string[],
    hostAffinity: Number(row.host_affinity),
    notableEvents: JSON.parse(String(row.notable_events)) as string[],
  };
  if (row.nickname !== null && row.nickname !== undefined) {
    entry.nickname = String(row.nickname);
  }
  return entry;
}

export function deleteExpiredHostViewerMemory(
  db: DatabaseSync,
  platform: string,
  olderThanIso: string,
): void {
  db.prepare(
    `DELETE FROM host_viewer_memory
     WHERE platform = ? AND last_seen_at < ?`,
  ).run(platform, olderThanIso);
}
