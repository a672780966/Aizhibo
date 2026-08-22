import { describe, expect, it } from 'vitest';
import {
  defaultPorts,
  noopAudioPort,
  noopPlatformPort,
  noopPresentationPort,
  systemClockPort,
} from './ports.js';
import { noopAudioResolutionPorts } from '@interactive-story/audio-engine';

describe('ports (T003)', () => {
  it('default implementations are callable and never throw', async () => {
    expect(() => systemClockPort.now()).not.toThrow();
    expect(() => noopPlatformPort.onVote(() => {})).not.toThrow();
    await expect(noopPlatformPort.sendChat('hi')).resolves.toBeUndefined();
    expect(() => noopPresentationPort.send({ kind: 'x' })).not.toThrow();
    expect(() => noopAudioPort.send({ kind: 'x' })).not.toThrow();
  });

  it('systemClockPort.now() is monotonic over short calls', () => {
    const t0 = systemClockPort.now();
    const t1 = systemClockPort.now();
    expect(t1).toBeGreaterThanOrEqual(t0);
  });

  it('defaultPorts bundles all five ports', () => {
    expect(typeof defaultPorts.clock.now).toBe('function');
    expect(typeof defaultPorts.platform.onVote).toBe('function');
    expect(typeof defaultPorts.platform.sendChat).toBe('function');
    expect(typeof defaultPorts.presentation.send).toBe('function');
    expect(typeof defaultPorts.audio.send).toBe('function');
    // DEV-031: the fifth port is the frozen audio-engine resolution chain, untouched.
    expect(defaultPorts.audioResolution).toBe(noopAudioResolutionPorts);
    expect(() =>
      defaultPorts.audioResolution.findPregenerated({
        contentId: 'x',
        text: 't',
        voiceId: 'v',
        voiceSettings: {},
      }),
    ).not.toThrow();
  });
});
