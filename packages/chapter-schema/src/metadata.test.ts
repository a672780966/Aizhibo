import { describe, expect, it } from 'vitest';
import { ChapterMetadataSchema } from './metadata.js';

describe('ChapterMetadata', () => {
  it('parses an empty object (all fields optional)', () => {
    expect(ChapterMetadataSchema.parse({}).estimatedDurationMinutes).toBeUndefined();
  });

  it('parses a fully populated object', () => {
    const meta = {
      synopsis: 'A lighthouse story.',
      tags: ['mystery', 'lighthouse'],
      contentWarnings: ['darkness'],
      estimatedDurationMinutes: 45,
      targetAudience: 'all',
      authoringNotes: 'Tone: hopeful dread.',
    };
    expect(ChapterMetadataSchema.parse(meta).tags).toHaveLength(2);
  });

  it('rejects a non-string synopsis', () => {
    expect(ChapterMetadataSchema.safeParse({ synopsis: 42 }).success).toBe(false);
  });
});
