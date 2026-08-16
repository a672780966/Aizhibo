import type { LoadIssue, RawChapterPack, ReferenceIssue } from './types.js';
import { loadChapterPack } from './loader.js';
import {
  countSchemaFailures,
  runSchemaValidation,
  type SchemaValidationResult,
} from './pass1Schema.js';
import { checkIdUniqueness, type UniquenessIssue } from './pass1Uniqueness.js';
import { buildReferenceIndex } from './referenceIndex.js';
import { runStoryGraphChecks } from './pass2StoryGraph.js';
import { runActionChainChecks } from './pass2ActionChain.js';
import { runNpcVisualsChecks } from './pass2NpcVisuals.js';
import { runBossChecks } from './pass2BossRecovery.js';

export interface Pass1Result {
  schemaResult: SchemaValidationResult;
  uniquenessIssues: UniquenessIssue[];
}

export interface Pass2Result {
  referenceIssues: ReferenceIssue[];
}

export interface CompileResult {
  loadIssues: LoadIssue[];
  schemaResult: SchemaValidationResult;
  uniquenessIssues: UniquenessIssue[];
  referenceIssues: ReferenceIssue[];
  passed: boolean;
}

export function runPass1(raw: RawChapterPack): Pass1Result {
  const schemaResult = runSchemaValidation(raw);
  return { schemaResult, uniquenessIssues: checkIdUniqueness(schemaResult) };
}

export function runPass2(raw: RawChapterPack, pass1: Pass1Result): Pass2Result {
  const index = buildReferenceIndex(pass1.schemaResult);
  return {
    referenceIssues: [
      ...runStoryGraphChecks(pass1.schemaResult, index),
      ...runActionChainChecks(pass1.schemaResult, index),
      ...runNpcVisualsChecks(pass1.schemaResult, index),
      ...runBossChecks(pass1.schemaResult),
    ],
  };
}

export function compile(rootDir: string): CompileResult {
  const { raw, issues } = loadChapterPack(rootDir);
  const pass1 = runPass1(raw);
  const pass2 = runPass2(raw, pass1);
  const passed =
    issues.length === 0 &&
    countSchemaFailures(pass1.schemaResult) === 0 &&
    pass1.uniquenessIssues.length === 0 &&
    pass2.referenceIssues.length === 0;
  return {
    loadIssues: issues,
    schemaResult: pass1.schemaResult,
    uniquenessIssues: pass1.uniquenessIssues,
    referenceIssues: pass2.referenceIssues,
    passed,
  };
}
