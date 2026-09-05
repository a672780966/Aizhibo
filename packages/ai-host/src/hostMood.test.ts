import { describe, expect, it } from 'vitest';
import { createHostMoodStore } from './hostMood.js';

describe('createHostMoodStore', () => {
  it('returns { label: "neutral" } when no initial is given', () => {
    expect(createHostMoodStore().getMood()).toEqual({ label: 'neutral' });
  });

  it('uses the provided initial mood instead of the default', () => {
    expect(createHostMoodStore({ label: 'excited' }).getMood()).toEqual({
      label: 'excited',
    });
  });

  it('reflects the mood written via setMood', () => {
    const store = createHostMoodStore();
    store.setMood({ label: 'bored' });
    expect(store.getMood()).toEqual({ label: 'bored' });
  });

  it('keeps only the last of two consecutive setMood calls (overwrite, not a queue)', () => {
    const store = createHostMoodStore();
    store.setMood({ label: 'happy' });
    store.setMood({ label: 'sad' });
    expect(store.getMood()).toEqual({ label: 'sad' });
  });

  it('keeps independent state across separate store instances', () => {
    const first = createHostMoodStore();
    const second = createHostMoodStore();
    first.setMood({ label: 'angry' });
    expect(first.getMood()).toEqual({ label: 'angry' });
    expect(second.getMood()).toEqual({ label: 'neutral' });
  });
});
