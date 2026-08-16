import { describe, expect, it } from 'vitest';
import type { FileEntry, LoadIssue, RawChapterPack, ReferenceIssue } from './types.js';

const validRaw: RawChapterPack = {
  manifest: {},
  storyGraph: {},
  initialState: {},
  worldRules: {},
  hostPublic: {},
  scenes: [],
  interactions: [],
  actions: [],
  dice: [],
  results: [],
  stateRules: [],
  narrative: [],
  npc: [],
  recovery: [],
  boss: [],
  endings: [],
  visuals: [],
  audio: [],
  metadata: [],
};

describe('RawChapterPack shape', () => {
  it('accepts the canonical 5-root + 14-subdir shape', () => {
    expect(validRaw.scenes).toEqual([]);
    expect(validRaw.metadata).toEqual([]);
    expect(Object.keys(validRaw)).toHaveLength(19);
  });

  it('subdirectory entries are { file, content } pairs', () => {
    const entry: FileEntry = { file: 'scenes/a.json', content: { id: 'a' } };
    const raw: RawChapterPack = { ...validRaw, scenes: [entry] };
    expect(raw.scenes[0]!.content).toEqual({ id: 'a' });
  });
});

describe('LoadIssue shape', () => {
  it('accepts both kinds', () => {
    const syntax: LoadIssue = { kind: 'JSON_SYNTAX_ERROR', path: 'a.json', message: 'bad' };
    const read: LoadIssue = { kind: 'FILE_READ_ERROR', path: 'b.json', message: 'enoent' };
    expect([syntax, read].map((i) => i.kind)).toEqual(['JSON_SYNTAX_ERROR', 'FILE_READ_ERROR']);
  });
});

describe('ReferenceIssue shape', () => {
  it('carries category, severity, message and file', () => {
    const issue: ReferenceIssue = {
      category: 'storyGraph.sceneNext',
      severity: 'BLOCKING',
      message: 'target not registered',
      file: 'scenes/a.json',
    };
    expect(issue.category).toBe('storyGraph.sceneNext');
    expect(issue.severity).toBe('BLOCKING');
  });

  const badSeverity: ReferenceIssue = {
    category: 'boss.interactionId',
    // @ts-expect-error severity is a closed union
    severity: 'SOFT',
    message: 'x',
    file: 'y',
  };
  void badSeverity;
});
