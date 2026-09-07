import { describe, expect, it } from 'vitest';
import { noopObsControlPort } from './obsControlPort.js';
import type { ObsControlPort, ObsScene } from './obsControlPort.js';

describe('noopObsControlPort', () => {
  it('switchScene fails honestly for every ObsScene value, regardless of the scene', async () => {
    const scenes: ObsScene[] = ['BOOT', 'LIVE', 'RECONNECTING', 'MAINTENANCE', 'ERROR', 'ENDING'];
    for (const scene of scenes) {
      await expect(noopObsControlPort.switchScene(scene)).resolves.toEqual({
        ok: false,
        reason: 'no OBS WebSocket connection configured',
      });
    }
  });

  it('getHealth reports DOWN when no OBS WebSocket connection is configured', async () => {
    await expect(noopObsControlPort.getHealth()).resolves.toEqual({
      status: 'DOWN',
      error: 'no OBS WebSocket connection configured',
    });
  });
});

describe('ObsControlPort interface is usable by external implementations', () => {
  it('accepts a hand-written object literal implementing the interface', async () => {
    const fakePort: ObsControlPort = {
      switchScene: async () => ({ ok: true }),
      getHealth: async () => ({ status: 'OK' }),
    };

    await expect(fakePort.switchScene('LIVE')).resolves.toEqual({ ok: true });
    await expect(fakePort.getHealth()).resolves.toEqual({ status: 'OK' });
  });
});
