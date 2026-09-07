import { DatabaseSync } from 'node:sqlite';

export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  initSchema(db);
  return db;
}

export function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS runtime_sessions (
      session_id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL,
      seed TEXT NOT NULL,
      started_at TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS runtime_events (
      session_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      id TEXT NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      visibility TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      PRIMARY KEY (session_id, sequence)
    );

    CREATE TABLE IF NOT EXISTS runtime_snapshots (
      session_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      persisted TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (session_id, sequence)
    );

    CREATE TABLE IF NOT EXISTS viewer_states (
      platform TEXT NOT NULL,
      viewer_id TEXT NOT NULL,
      hp INTEGER NOT NULL,
      life INTEGER NOT NULL,
      alive INTEGER NOT NULL,
      last_choice TEXT,
      participation_count INTEGER NOT NULL,
      joined_chapter_at INTEGER,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      PRIMARY KEY (platform, viewer_id)
    );

    CREATE TABLE IF NOT EXISTS host_viewer_memory (
      platform TEXT NOT NULL,
      viewer_id TEXT NOT NULL,
      nickname TEXT,
      interaction_count INTEGER NOT NULL,
      known_running_jokes TEXT NOT NULL,
      host_affinity REAL NOT NULL,
      notable_events TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      PRIMARY KEY (platform, viewer_id)
    );

    CREATE TABLE IF NOT EXISTS host_running_jokes (
      id TEXT NOT NULL,
      platform TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      PRIMARY KEY (platform, id)
    );
  `);
}
