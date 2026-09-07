import { describe, expect, it } from 'vitest';
import { createHealthRegistry } from './healthRegistry.js';

describe('createHealthRegistry', () => {
  it('aggregates an empty registry to { overall: "OK", sources: {} }', async () => {
    const registry = createHealthRegistry();
    await expect(registry.getAggregateHealth()).resolves.toEqual({
      overall: 'OK',
      sources: {},
    });
  });

  it('aggregates a single OK source to overall "OK"', async () => {
    const registry = createHealthRegistry();
    registry.register({
      name: 'db',
      getHealth: () => ({ status: 'OK' }),
    });
    await expect(registry.getAggregateHealth()).resolves.toEqual({
      overall: 'OK',
      sources: { db: { status: 'OK' } },
    });
  });

  it('aggregates a single DOWN source to overall "DOWN" and passes fields through untouched', async () => {
    const registry = createHealthRegistry();
    registry.register({
      name: 'ai-host',
      getHealth: () => ({ status: 'DOWN', error: 'something broke' }),
    });
    await expect(registry.getAggregateHealth()).resolves.toEqual({
      overall: 'DOWN',
      sources: { 'ai-host': { status: 'DOWN', error: 'something broke' } },
    });
  });

  it('picks the worst status (DOWN) across OK + DEGRADED + DOWN sources', async () => {
    const registry = createHealthRegistry();
    registry.register({ name: 'db', getHealth: () => ({ status: 'OK' }) });
    registry.register({
      name: 'twitch',
      getHealth: () => ({ status: 'DEGRADED', latencyMs: 500 }),
    });
    registry.register({
      name: 'llm',
      getHealth: () => ({ status: 'DOWN', error: 'no provider configured' }),
    });
    await expect(registry.getAggregateHealth()).resolves.toEqual({
      overall: 'DOWN',
      sources: {
        db: { status: 'OK' },
        twitch: { status: 'DEGRADED', latencyMs: 500 },
        llm: { status: 'DOWN', error: 'no provider configured' },
      },
    });
  });

  it('picks DEGRADED as the worst when only OK + DEGRADED are present', async () => {
    const registry = createHealthRegistry();
    registry.register({ name: 'db', getHealth: () => ({ status: 'OK' }) });
    registry.register({
      name: 'twitch',
      getHealth: () => ({ status: 'DEGRADED' }),
    });
    await expect(registry.getAggregateHealth()).resolves.toEqual({
      overall: 'DEGRADED',
      sources: {
        db: { status: 'OK' },
        twitch: { status: 'DEGRADED' },
      },
    });
  });

  it('replaces a previously registered source when the same name is registered again', async () => {
    const registry = createHealthRegistry();
    registry.register({
      name: 'db',
      getHealth: () => ({ status: 'OK' }),
    });
    registry.register({
      name: 'db',
      getHealth: () => ({ status: 'DOWN', error: 'second registration wins' }),
    });
    const aggregate = await registry.getAggregateHealth();
    expect(aggregate).toEqual({
      overall: 'DOWN',
      sources: { db: { status: 'DOWN', error: 'second registration wins' } },
    });
  });

  it('handles a mix of sync and async getHealth implementations in one call', async () => {
    const registry = createHealthRegistry();
    registry.register({
      name: 'persistence',
      getHealth: () => ({ status: 'OK' }),
    });
    registry.register({
      name: 'ai-host',
      async getHealth() {
        return { status: 'DEGRADED', latencyMs: 120 };
      },
    });
    const aggregate = await registry.getAggregateHealth();
    expect(aggregate.sources).toEqual({
      persistence: { status: 'OK' },
      'ai-host': { status: 'DEGRADED', latencyMs: 120 },
    });
    expect(aggregate.overall).toBe('DEGRADED');
  });
});
