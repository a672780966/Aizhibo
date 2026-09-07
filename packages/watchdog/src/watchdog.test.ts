import { describe, expect, it } from 'vitest';
import { decideWatchdogAction } from './watchdog.js';

describe('decideWatchdogAction', () => {
  it('returns ALREADY_HANDLED for TWITCH_DISCONNECT with a detail referencing the existing automatic reconnect mechanism', () => {
    const decision = decideWatchdogAction('TWITCH_DISCONNECT');
    expect(decision.action).toBe('ALREADY_HANDLED');
    expect(decision.detail).toContain('reconnect');
  });

  it('returns NOT_YET_WIRED for RENDERER_CRASH with a detail that names the missing renderer crash detection mechanism', () => {
    const decision = decideWatchdogAction('RENDERER_CRASH');
    expect(decision.action).toBe('NOT_YET_WIRED');
    expect(decision.detail.toLowerCase()).toContain('renderer crash');
  });

  it('returns NOT_YET_WIRED for RUNTIME_PROCESS_RESTART with a detail distinct from the RENDERER_CRASH one', () => {
    const decision = decideWatchdogAction('RUNTIME_PROCESS_RESTART');
    expect(decision.action).toBe('NOT_YET_WIRED');
    const rendererCrashDecision = decideWatchdogAction('RENDERER_CRASH');
    expect(decision.detail).not.toBe(rendererCrashDecision.detail);
  });

  it('echoes back the exact trigger that was passed in for each of the three trigger values', () => {
    const triggers = ['RENDERER_CRASH', 'TWITCH_DISCONNECT', 'RUNTIME_PROCESS_RESTART'] as const;
    for (const trigger of triggers) {
      expect(decideWatchdogAction(trigger).trigger).toBe(trigger);
    }
  });

  it('is pure and deterministic: two consecutive calls with the same trigger return deeply equal decisions', () => {
    const first = decideWatchdogAction('TWITCH_DISCONNECT');
    const second = decideWatchdogAction('TWITCH_DISCONNECT');
    expect(second).toEqual(first);
  });
});
