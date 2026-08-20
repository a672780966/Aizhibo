import type { DatabaseSync } from 'node:sqlite';

export interface RuntimeSnapshotRecord {
  sessionId: string;
  sequence: number;
  persisted: unknown;
  chapterId: string;
  createdAt: string;
}

export function saveSnapshot(
  db: DatabaseSync,
  sessionId: string,
  sequence: number,
  persisted: unknown,
  chapterId: string,
): void {
  db.prepare(
    `INSERT INTO runtime_snapshots
      (session_id, sequence, persisted, chapter_id, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(sessionId, sequence, JSON.stringify(persisted), chapterId, new Date().toISOString());
}

export function loadLatestSnapshot(
  db: DatabaseSync,
  sessionId: string,
): RuntimeSnapshotRecord | undefined {
  const row = db
    .prepare(
      `SELECT session_id, sequence, persisted, chapter_id, created_at
       FROM runtime_snapshots WHERE session_id = ? ORDER BY sequence DESC LIMIT 1`,
    )
    .get(sessionId) as Record<string, unknown> | undefined;
  if (row === undefined) return undefined;
  return {
    sessionId: String(row.session_id),
    sequence: Number(row.sequence),
    persisted: JSON.parse(String(row.persisted)) as unknown,
    chapterId: String(row.chapter_id),
    createdAt: String(row.created_at),
  };
}
