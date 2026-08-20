import { describe, expect, it } from 'vitest';
import { createRuntimeMachine } from './machine.js';
import { audioRegion } from './audioRegion.js';

describe('audioRegion skeleton (T007)', () => {
  it('declares the six states', () => {
    expect(Object.keys(audioRegion.states).sort()).toEqual([
      'DUCKED',
      'ERROR',
      'IDLE',
      'PLAYING_HOST',
      'PLAYING_STORY',
      'PREPARING',
    ]);
    expect(audioRegion.initial).toBe('IDLE');
  });

  it('drives through IDLE->PREPARING->PLAYING_STORY->DUCKED with port commands', () => {
    const sent: unknown[] = [];
    const actor = createRuntimeMachine({
      chapterRootDir: '/tmp/none',
      seed: 's',
      ports: { audio: { send: (c) => sent.push(c) } },
    });
    expect((actor.getSnapshot().value as Record<string, unknown>).audio).toBe('IDLE');

    actor.send({ type: 'AUDIO.PREPARE' });
    expect((actor.getSnapshot().value as Record<string, unknown>).audio).toBe('PREPARING');
    expect(sent.some((c) => (c as { kind: string }).kind === 'AUDIO_PREPARING')).toBe(true);

    actor.send({ type: 'AUDIO.READY' });
    expect((actor.getSnapshot().value as Record<string, unknown>).audio).toBe('PLAYING_STORY');

    actor.send({ type: 'AUDIO.DUCK' });
    expect((actor.getSnapshot().value as Record<string, unknown>).audio).toBe('DUCKED');

    actor.send({ type: 'AUDIO.UNDUCK' });
    expect((actor.getSnapshot().value as Record<string, unknown>).audio).toBe('PLAYING_STORY');
  });

  it('reaches PLAYING_HOST via PREPARE->READY->PLAY_HOST (FIX-T04)', () => {
    const actor = createRuntimeMachine({ chapterRootDir: '/tmp/none', seed: 's-host' });
    actor.send({ type: 'AUDIO.PREPARE' });
    actor.send({ type: 'AUDIO.READY' });
    expect((actor.getSnapshot().value as Record<string, unknown>).audio).toBe('PLAYING_STORY');
    actor.send({ type: 'AUDIO.PLAY_HOST' });
    expect((actor.getSnapshot().value as Record<string, unknown>).audio).toBe('PLAYING_HOST');
  });

  it('reaches ERROR via PREPARE->FAIL (FIX-T04)', () => {
    const actor = createRuntimeMachine({ chapterRootDir: '/tmp/none', seed: 's-err' });
    actor.send({ type: 'AUDIO.PREPARE' });
    actor.send({ type: 'AUDIO.FAIL' });
    expect((actor.getSnapshot().value as Record<string, unknown>).audio).toBe('ERROR');
  });
});
