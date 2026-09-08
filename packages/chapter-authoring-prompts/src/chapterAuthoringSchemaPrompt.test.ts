import { describe, expect, it } from 'vitest';
import { CHAPTER_AUTHORING_SCHEMA_PROMPT } from './chapterAuthoringSchemaPrompt.js';

describe('CHAPTER_AUTHORING_SCHEMA_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof CHAPTER_AUTHORING_SCHEMA_PROMPT).toBe('string');
    expect(CHAPTER_AUTHORING_SCHEMA_PROMPT.length).toBeGreaterThan(0);
  });

  it('contains all eleven Stage headings in order of appearance', () => {
    const stageHeadings = [
      '## Stage 1 — World Bible',
      '## Stage 2 — Chapter Outline',
      '## Stage 3 — Manifest & World Rules',
      '## Stage 4 — Scene Graph',
      '## Stage 5 — Interaction Design',
      '## Stage 6 — Rule Dictionary (Dice Profiles & State Rules)',
      '## Stage 7 — Result Dictionary',
      '## Stage 8 — Narrative Blocks',
      '## Stage 9 — Boss & Ending',
      '## Stage 10 — Visual & Audio Assets',
      '## Stage 11 — Review',
    ];
    let cursor = 0;
    for (const heading of stageHeadings) {
      const idx = CHAPTER_AUTHORING_SCHEMA_PROMPT.indexOf(heading, cursor);
      expect(idx, `missing heading in order: ${heading}`).toBeGreaterThanOrEqual(0);
      cursor = idx + heading.length;
    }
  });

  it('contains all 18 module keywords', () => {
    const keywords = [
      'contentWarnings', // metadata
      'activeThreats', // worldState
      'hostPolicy', // scene
      'characterAssetId', // npc
      'PER_ACTION_GROUP', // interaction
      'EXISTS', // stateRules / Condition
      'qualityThresholds', // dice
      'mapsTo', // result
      'isFallback', // endings
      'onDefeat', // boss
      'RUNTIME_TTS', // audio
      'parallax', // visuals
      'forbiddenTopics', // hostPublic
      'oncePerChapter', // recovery
      'urgencyBlockId', // narrative
      'scaleSemantics', // action
      'diceBuffer', // manifest / worldRules
      'ChapterSchema', // overall reference
    ];
    for (const keyword of keywords) {
      expect(CHAPTER_AUTHORING_SCHEMA_PROMPT, `missing keyword: ${keyword}`).toContain(keyword);
    }
  });

  it('contains all six Quality values', () => {
    const qualities = [
      'DISASTER',
      'FAILURE',
      'COSTLY_SUCCESS',
      'SUCCESS',
      'GREAT_SUCCESS',
      'SPECIAL',
    ];
    for (const quality of qualities) {
      expect(CHAPTER_AUTHORING_SCHEMA_PROMPT, `missing Quality: ${quality}`).toContain(quality);
    }
  });

  it('contains all five character slot values', () => {
    const slots = ['LEFT', 'CENTER_LEFT', 'CENTER', 'CENTER_RIGHT', 'RIGHT'];
    for (const slot of slots) {
      expect(CHAPTER_AUTHORING_SCHEMA_PROMPT, `missing slot: ${slot}`).toContain(slot);
    }
  });
});
