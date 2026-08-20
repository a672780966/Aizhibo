import { describe, expect, it } from 'vitest';
import type { PlatformPort } from './ports.js';
import { virtualClockPort, virtualPlatformPort } from './virtualPorts.js';

describe('virtual ports', () => {
  it('advances a deterministic clock without wall time', () => {
    const first = virtualClockPort.now();
    const second = virtualClockPort.now();
    expect(second).toBe(first + 1);
  });

  it('implements the platform port without IO', async () => {
    const platform: PlatformPort = virtualPlatformPort;
    expect(() => platform.onVote(() => {})).not.toThrow();
    await expect(platform.sendChat('hello')).resolves.toBeUndefined();
  });
});
