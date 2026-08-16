import { describe, expect, it } from 'vitest';
import { EndingNodeSchema } from './endings.js';

const nonFallbackEnding = {
  id: 'ending-good',
  title: 'The Light Wins',
  when: { path: { container: 'flags', key: 'lighthouseLit' }, op: 'EQ', value: true },
  priority: 10,
  isFallback: false,
  visualSceneId: 'vs-ending-good',
  narrationBlockIds: ['b-ending-good'],
  masterAudioId: 'audio-ending-good',
  tags: ['good'],
};

const fallbackEnding = {
  id: 'ending-fallback',
  title: 'The Story Fades',
  when: null,
  priority: 0,
  isFallback: true,
  visualSceneId: 'vs-ending-fallback',
  narrationBlockIds: ['b-ending-fallback'],
};

describe('EndingNode', () => {
  it('parses a non-fallback ending with a when condition', () => {
    expect(EndingNodeSchema.parse(nonFallbackEnding).isFallback).toBe(false);
  });

  it('parses a fallback ending with when = null', () => {
    expect(EndingNodeSchema.parse(fallbackEnding).when).toBeNull();
  });

  it('rejects isFallback = true with a non-null when', () => {
    const bad = {
      ...fallbackEnding,
      when: { path: { container: 'flags', key: 'x' }, op: 'EXISTS' },
    };
    expect(EndingNodeSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects isFallback = false with when = null', () => {
    expect(EndingNodeSchema.safeParse({ ...nonFallbackEnding, when: null }).success).toBe(false);
  });
});
