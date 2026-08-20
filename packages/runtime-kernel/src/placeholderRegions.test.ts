import { describe, expect, it } from 'vitest';
import { hostRegion, platformRegion, safetyRegion } from './placeholderRegions.js';
import { createRuntimeMachine } from './machine.js';

describe('placeholder regions (T008)', () => {
  it('each placeholder region is a single IDLE state with no transitions', () => {
    for (const region of [hostRegion, platformRegion, safetyRegion]) {
      expect(region.initial).toBe('IDLE');
      expect(Object.keys(region.states)).toEqual(['IDLE']);
      expect(typeof (region.states as { IDLE: { description?: string } }).IDLE.description).toBe(
        'string',
      );
    }
  });

  it('compose into the root machine without error (default ports + fixture)', () => {
    // chapterRootDir is loaded when BOOT is sent; construction itself must not fail
    const actor = createRuntimeMachine({ chapterRootDir: '/tmp/does-not-matter', seed: 's' });
    const value = actor.getSnapshot().value as Record<string, unknown>;
    expect(value.host).toBe('IDLE');
    expect(value.platform).toBe('IDLE');
    expect(value.safety).toBe('IDLE');
  });
});
