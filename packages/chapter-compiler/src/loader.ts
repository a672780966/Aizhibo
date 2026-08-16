import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import type { FileEntry, LoadIssue, RawChapterPack } from './types.js';

export const ROOT_FILE_NAMES = [
  'manifest.json',
  'story.graph.json',
  'initial.state.json',
  'world.rules.json',
  'host.public.json',
] as const;

export const SUBDIR_NAMES = [
  'scenes',
  'interactions',
  'actions',
  'dice',
  'results',
  'state-rules',
  'narrative',
  'npc',
  'recovery',
  'boss',
  'endings',
  'visuals',
  'audio',
  'metadata',
] as const;

function normalizePath(relPath: string): string {
  return relPath.split(sep).join('/');
}

export function loadChapterPack(rootDir: string): { raw: RawChapterPack; issues: LoadIssue[] } {
  const issues: LoadIssue[] = [];

  const readJsonFile = (relPath: string): unknown => {
    try {
      const text = readFileSync(join(rootDir, relPath), 'utf8');
      try {
        return JSON.parse(text);
      } catch (err) {
        issues.push({
          kind: 'JSON_SYNTAX_ERROR',
          path: normalizePath(relPath),
          message: err instanceof Error ? err.message : String(err),
        });
        return undefined;
      }
    } catch (err) {
      issues.push({
        kind: 'FILE_READ_ERROR',
        path: normalizePath(relPath),
        message: err instanceof Error ? err.message : String(err),
      });
      return undefined;
    }
  };

  const readDirEntries = (dirName: string): FileEntry[] => {
    let names: string[];
    try {
      names = readdirSync(join(rootDir, dirName));
    } catch (err) {
      issues.push({
        kind: 'FILE_READ_ERROR',
        path: normalizePath(dirName),
        message: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
    const entries: FileEntry[] = [];
    for (const name of names.filter((n) => n.endsWith('.json')).sort()) {
      const relPath = normalizePath(join(dirName, name));
      const content = readJsonFile(relPath);
      if (content !== undefined) {
        entries.push({ file: relPath, content });
      }
    }
    return entries;
  };

  const raw: RawChapterPack = {
    manifest: readJsonFile('manifest.json'),
    storyGraph: readJsonFile('story.graph.json'),
    initialState: readJsonFile('initial.state.json'),
    worldRules: readJsonFile('world.rules.json'),
    hostPublic: readJsonFile('host.public.json'),
    scenes: readDirEntries('scenes'),
    interactions: readDirEntries('interactions'),
    actions: readDirEntries('actions'),
    dice: readDirEntries('dice'),
    results: readDirEntries('results'),
    stateRules: readDirEntries('state-rules'),
    narrative: readDirEntries('narrative'),
    npc: readDirEntries('npc'),
    recovery: readDirEntries('recovery'),
    boss: readDirEntries('boss'),
    endings: readDirEntries('endings'),
    visuals: readDirEntries('visuals'),
    audio: readDirEntries('audio'),
    metadata: readDirEntries('metadata'),
  };

  return { raw, issues };
}
