import type { DatabaseSync } from 'node:sqlite';
import type { RuntimeEvent } from '@interactive-story/runtime-kernel';

export function appendEvents(
  db: DatabaseSync,
  sessionId: string,
  events: readonly RuntimeEvent[],
): void {
  if (events.length === 0) return;
  const insert = db.prepare(
    `INSERT INTO runtime_events
      (session_id, sequence, id, type, payload, chapter_id, visibility, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  db.exec('BEGIN');
  try {
    for (const event of events) {
      insert.run(
        sessionId,
        event.sequence,
        event.id,
        event.type,
        JSON.stringify(event.payload) ?? 'null',
        event.chapterId,
        event.visibility,
        event.timestamp,
      );
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function loadEvents(db: DatabaseSync, sessionId: string): RuntimeEvent[] {
  const rows = db
    .prepare(
      `SELECT id, sequence, type, payload, chapter_id, session_id, visibility, timestamp
       FROM runtime_events WHERE session_id = ? ORDER BY sequence ASC`,
    )
    .all(sessionId) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    sequence: Number(row.sequence),
    type: String(row.type),
    payload: JSON.parse(String(row.payload)) as unknown,
    chapterId: String(row.chapter_id),
    sessionId: String(row.session_id),
    visibility: row.visibility as RuntimeEvent['visibility'],
    timestamp: String(row.timestamp),
  }));
}
