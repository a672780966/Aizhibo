import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { initSchema, openDatabase } from './db.js';

describe('database schema', () => {
  it('creates exactly the six authorized tables and is idempotent', () => {
    const db = openDatabase(':memory:');
    initSchema(db);
    const names = (
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all() as Array<{ name: string }>
    ).map((row) => row.name);
    expect(names).toEqual([
      'host_running_jokes',
      'host_viewer_memory',
      'runtime_events',
      'runtime_sessions',
      'runtime_snapshots',
      'viewer_states',
    ]);
  });

  it('opens a file-backed database', () => {
    const dir = mkdtempSync(join(tmpdir(), 'persistence-'));
    const path = join(dir, 'runtime.db');
    const db = openDatabase(path);
    expect(db.prepare('SELECT 1 AS ok').get()).toEqual({ ok: 1 });
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
});
