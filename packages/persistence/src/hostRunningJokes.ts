import type { DatabaseSync } from 'node:sqlite';

export interface HostRunningJokeEntry {
  id: string;
  platform: string;
  text: string;
}

export function addHostRunningJoke(db: DatabaseSync, entry: HostRunningJokeEntry): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO host_running_jokes
      (id, platform, text, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(entry.id, entry.platform, entry.text, now, now);
}

export function listHostRunningJokes(db: DatabaseSync, platform: string): HostRunningJokeEntry[] {
  const rows = db
    .prepare(
      `SELECT id, platform, text
       FROM host_running_jokes WHERE platform = ?
       ORDER BY created_at ASC`,
    )
    .all(platform) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: String(row.id),
    platform: String(row.platform),
    text: String(row.text),
  }));
}

export function deleteExpiredHostRunningJokes(
  db: DatabaseSync,
  platform: string,
  olderThanIso: string,
): void {
  db.prepare(
    `DELETE FROM host_running_jokes
     WHERE platform = ? AND created_at < ?`,
  ).run(platform, olderThanIso);
}
