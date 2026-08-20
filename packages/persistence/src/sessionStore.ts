import type { DatabaseSync } from 'node:sqlite';

export type SessionStatus = 'ACTIVE' | 'ENDED' | 'ERROR';

export interface RuntimeSession {
  sessionId: string;
  chapterId: string;
  seed: string;
  startedAt: string;
  status: SessionStatus;
}

export function createSession(
  db: DatabaseSync,
  input: Omit<RuntimeSession, 'startedAt' | 'status'> & {
    startedAt?: string;
    status?: SessionStatus;
  },
): RuntimeSession {
  const session: RuntimeSession = {
    sessionId: input.sessionId,
    chapterId: input.chapterId,
    seed: input.seed,
    startedAt: input.startedAt ?? new Date().toISOString(),
    status: input.status ?? 'ACTIVE',
  };
  db.prepare(
    `INSERT INTO runtime_sessions (session_id, chapter_id, seed, started_at, status)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(session.sessionId, session.chapterId, session.seed, session.startedAt, session.status);
  return session;
}

export function getSession(db: DatabaseSync, sessionId: string): RuntimeSession | undefined {
  const row = db
    .prepare(
      `SELECT session_id, chapter_id, seed, started_at, status
       FROM runtime_sessions WHERE session_id = ?`,
    )
    .get(sessionId) as Record<string, unknown> | undefined;
  if (row === undefined) return undefined;
  return {
    sessionId: String(row.session_id),
    chapterId: String(row.chapter_id),
    seed: String(row.seed),
    startedAt: String(row.started_at),
    status: row.status as SessionStatus,
  };
}

export function endSession(
  db: DatabaseSync,
  sessionId: string,
  status: Exclude<SessionStatus, 'ACTIVE'> = 'ENDED',
): void {
  db.prepare('UPDATE runtime_sessions SET status = ? WHERE session_id = ?').run(status, sessionId);
}
