import type { DatabaseSync } from 'node:sqlite';

export interface ViewerState {
  platform: string;
  viewerId: string;
  hp: 0 | 1 | 2 | 3;
  life: 0 | 1 | 2;
  alive: boolean;
  lastChoice?: string;
  participationCount: number;
  joinedChapterAt?: number;
}

export function upsertViewerState(db: DatabaseSync, state: ViewerState): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO viewer_states
      (platform, viewer_id, hp, life, alive, last_choice, participation_count,
       joined_chapter_at, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (platform, viewer_id) DO UPDATE SET
       hp = excluded.hp,
       life = excluded.life,
       alive = excluded.alive,
       last_choice = excluded.last_choice,
       participation_count = excluded.participation_count,
       joined_chapter_at = excluded.joined_chapter_at,
       last_seen_at = excluded.last_seen_at`,
  ).run(
    state.platform,
    state.viewerId,
    state.hp,
    state.life,
    state.alive ? 1 : 0,
    state.lastChoice ?? null,
    state.participationCount,
    state.joinedChapterAt ?? null,
    now,
    now,
  );
}

export function getViewerState(
  db: DatabaseSync,
  platform: string,
  viewerId: string,
): ViewerState | undefined {
  const row = db
    .prepare(
      `SELECT platform, viewer_id, hp, life, alive, last_choice,
              participation_count, joined_chapter_at
       FROM viewer_states WHERE platform = ? AND viewer_id = ?`,
    )
    .get(platform, viewerId) as Record<string, unknown> | undefined;
  if (row === undefined) return undefined;
  const state: ViewerState = {
    platform: String(row.platform),
    viewerId: String(row.viewer_id),
    hp: Number(row.hp) as ViewerState['hp'],
    life: Number(row.life) as ViewerState['life'],
    alive: Number(row.alive) === 1,
    participationCount: Number(row.participation_count),
  };
  if (row.last_choice !== null) state.lastChoice = String(row.last_choice);
  if (row.joined_chapter_at !== null) state.joinedChapterAt = Number(row.joined_chapter_at);
  return state;
}
