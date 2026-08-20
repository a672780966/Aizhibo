import type { DatabaseSync } from 'node:sqlite';
import type { Health } from '@interactive-story/shared';

export function getHealth(db: DatabaseSync): Health {
  const started = Date.now();
  try {
    db.prepare('SELECT 1').get();
    return {
      status: 'OK',
      lastSuccessAt: Date.now(),
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      status: 'DOWN',
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
