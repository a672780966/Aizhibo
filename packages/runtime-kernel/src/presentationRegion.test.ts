import { describe, expect, it } from 'vitest';
import { createRuntimeMachine } from './machine.js';
import { presentationRegion } from './presentationRegion.js';

describe('presentationRegion skeleton (T007)', () => {
  it('declares LOADING/READY/FAILOVER', () => {
    expect(Object.keys(presentationRegion.states).sort()).toEqual(['FAILOVER', 'LOADING', 'READY']);
    expect(presentationRegion.initial).toBe('LOADING');
  });

  it('LOGGING entry pushes a command, ASSETS.READY moves to READY, ASSETS.FAIL to FAILOVER', () => {
    const sent: unknown[] = [];
    const actor = createRuntimeMachine({
      chapterRootDir: '/tmp/none',
      seed: 's',
      ports: { presentation: { send: (c) => sent.push(c) } },
    });
    // entry action on LOADING fires at start
    expect(sent.some((c) => (c as { kind: string }).kind === 'PRES_LOADING')).toBe(true);

    actor.send({ type: 'ASSETS.READY' });
    expect((actor.getSnapshot().value as Record<string, unknown>).presentation).toBe('READY');
    expect(sent.some((c) => (c as { kind: string }).kind === 'PRES_READY')).toBe(true);

    actor.send({ type: 'INTERACTION.OPEN' }); // irrelevant to this region
    expect((actor.getSnapshot().value as Record<string, unknown>).presentation).toBe('READY');

    actor.send({ type: 'ASSETS.FAIL' });
    expect((actor.getSnapshot().value as Record<string, unknown>).presentation).toBe('FAILOVER');
    expect(sent.some((c) => (c as { kind: string }).kind === 'PRES_FAILOVER')).toBe(true);
  });
});
