import type { DatabaseSync } from 'node:sqlite';

export interface HostViewerMemoryEntry {
  platform: string;
  viewerId: string;
  note: string;
}

export function upsertHostViewerMemory(db: DatabaseSync, entry: HostViewerMemoryEntry): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO host_viewer_memory
      (platform, viewer_id, note, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (platform, viewer_id) DO UPDATE SET
       note = excluded.note,
       last_seen_at = excluded.last_seen_at`,
  ).run(entry.platform, entry.viewerId, entry.note, now, now);
}

export function getHostViewerMemory(
  db: DatabaseSync,
  platform: string,
  viewerId: string,
): HostViewerMemoryEntry | undefined {
  const row = db
    .prepare(
      `SELECT platform, viewer_id, note
       FROM host_viewer_memory WHERE platform = ? AND viewer_id = ?`,
    )
    .get(platform, viewerId) as Record<string, unknown> | undefined;
  if (row === undefined) return undefined;
  return {
    platform: String(row.platform),
    viewerId: String(row.viewer_id),
    note: String(row.note),
  };
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
