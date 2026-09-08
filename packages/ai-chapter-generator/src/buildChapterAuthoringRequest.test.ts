import { describe, expect, it } from 'vitest';
import { CHAPTER_AUTHORING_SCHEMA_PROMPT } from '@interactive-story/chapter-authoring-prompts';
import { buildChapterAuthoringRequest } from './buildChapterAuthoringRequest.js';

describe('buildChapterAuthoringRequest — 空/仅空白 brief 抛错，不静默通过', () => {
  it('throws an Error for an empty brief', () => {
    expect(() => buildChapterAuthoringRequest('')).toThrow(Error);
  });

  it('throws an Error for a whitespace-only brief', () => {
    expect(() => buildChapterAuthoringRequest('   ')).toThrow(Error);
  });
});

describe('buildChapterAuthoringRequest — schema prompt 在前、brief 原文在后，均完整未改动', () => {
  const brief = 'A haunted lighthouse chapter.';

  it('includes the full, unmodified CHAPTER_AUTHORING_SCHEMA_PROMPT', () => {
    expect(buildChapterAuthoringRequest(brief)).toContain(CHAPTER_AUTHORING_SCHEMA_PROMPT);
  });

  it('includes the verbatim brief text', () => {
    expect(buildChapterAuthoringRequest(brief)).toContain(brief);
  });

  it('places the schema prompt strictly before the brief', () => {
    const request = buildChapterAuthoringRequest(brief);
    const schemaIndex = request.indexOf(CHAPTER_AUTHORING_SCHEMA_PROMPT);
    const briefIndex = request.indexOf(brief);
    expect(schemaIndex).toBeGreaterThanOrEqual(0);
    expect(briefIndex).toBeGreaterThanOrEqual(0);
    expect(schemaIndex).toBeLessThan(briefIndex);
  });
});
