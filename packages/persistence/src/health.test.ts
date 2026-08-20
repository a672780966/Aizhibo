import { describe, expect, it } from 'vitest';
import { getHealth } from './health.js';
import { openDatabase } from './db.js';

describe('getHealth', () => {
  it('reports a working database as OK', () => {
    const health = getHealth(openDatabase(':memory:'));
    expect(health.status).toBe('OK');
    expect(health.lastSuccessAt).toBeTypeOf('number');
    expect(health.latencyMs).toBeTypeOf('number');
  });

  it('reports a closed database as DOWN', () => {
    const db = openDatabase(':memory:');
    db.close();
    const health = getHealth(db);
    expect(health.status).toBe('DOWN');
    expect(health.error).toBeTruthy();
  });
});
