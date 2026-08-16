import {
  ChapterPackSchemas,
  CharacterAssetSchema,
  ImageAssetSchema,
} from '@interactive-story/chapter-schema';
import type {
  ActionDefinition,
  AudioAsset,
  BossNode,
  ChapterManifest,
  ChapterMetadata,
  CharacterAsset,
  DiceProfile,
  EndingNode,
  HostPublicSpec,
  ImageAsset,
  InteractionNode,
  NarrativeBlock,
  NPCDefinition,
  RecoveryRule,
  ResultDictionary,
  ResultNarrative,
  SceneNode,
  StateRuleSet,
  StoryGraph,
  VisualScene,
  WorldRules,
  WorldState,
} from '@interactive-story/chapter-schema';
import { z } from 'zod';
import type { FileEntry, RawChapterPack } from './types.js';

export interface ValidatedEntry<T> {
  file: string;
  value: T;
}

export interface ValidationFailure {
  file: string;
  issues: z.ZodIssue[];
}

interface RootResult<T> {
  passed: T | null;
  failed: ValidationFailure[];
}

interface CollectionResult<T> {
  passed: ValidatedEntry<T>[];
  failed: ValidationFailure[];
}

export interface SchemaValidationResult {
  manifest: RootResult<ChapterManifest>;
  storyGraph: RootResult<StoryGraph>;
  initialState: RootResult<WorldState>;
  worldRules: RootResult<WorldRules>;
  hostPublic: RootResult<HostPublicSpec>;
  scenes: CollectionResult<SceneNode>;
  interactions: CollectionResult<InteractionNode>;
  actions: CollectionResult<ActionDefinition>;
  dice: CollectionResult<DiceProfile>;
  results: CollectionResult<ResultDictionary>;
  stateRules: CollectionResult<StateRuleSet>;
  narrative: CollectionResult<ResultNarrative | NarrativeBlock>;
  npc: CollectionResult<NPCDefinition>;
  recovery: CollectionResult<RecoveryRule>;
  boss: CollectionResult<BossNode>;
  endings: CollectionResult<EndingNode>;
  visuals: CollectionResult<VisualScene | CharacterAsset | ImageAsset>;
  audio: CollectionResult<AudioAsset>;
  metadata: CollectionResult<ChapterMetadata>;
}

export function runSchemaValidation(raw: RawChapterPack): SchemaValidationResult {
  return {
    manifest: validateRoot('manifest.json', raw.manifest, ChapterPackSchemas.manifest),
    storyGraph: validateRoot('story.graph.json', raw.storyGraph, ChapterPackSchemas.storyGraph),
    initialState: validateRoot(
      'initial.state.json',
      raw.initialState,
      ChapterPackSchemas.initialState,
    ),
    worldRules: validateRoot('world.rules.json', raw.worldRules, ChapterPackSchemas.worldRules),
    hostPublic: validateRoot('host.public.json', raw.hostPublic, ChapterPackSchemas.hostPublic),
    scenes: validateEntries(raw.scenes, ChapterPackSchemas.scenes),
    interactions: validateEntries(raw.interactions, ChapterPackSchemas.interactions),
    actions: validateEntries(raw.actions, ChapterPackSchemas.actions),
    dice: validateEntries(raw.dice, ChapterPackSchemas.dice),
    results: validateEntries(raw.results, ChapterPackSchemas.results),
    stateRules: validateEntries(raw.stateRules, ChapterPackSchemas['state-rules']),
    narrative: validateNarrativeEntries(raw.narrative),
    npc: validateEntries(raw.npc, ChapterPackSchemas.npc),
    recovery: validateEntries(raw.recovery, ChapterPackSchemas.recovery),
    boss: validateEntries(raw.boss, ChapterPackSchemas.boss),
    endings: validateEntries(raw.endings, ChapterPackSchemas.endings),
    visuals: validateVisualEntries(raw.visuals),
    audio: validateEntries(raw.audio, ChapterPackSchemas.audio),
    metadata: validateEntries(raw.metadata, ChapterPackSchemas.metadata),
  };
}

function validateRoot<T>(file: string, content: unknown, schema: z.ZodType<T>): RootResult<T> {
  const result = schema.safeParse(content);
  if (result.success) {
    return { passed: result.data, failed: [] };
  }
  return { passed: null, failed: [{ file, issues: result.error.issues }] };
}

function validateEntries<T>(entries: FileEntry[], schema: z.ZodType<T>): CollectionResult<T> {
  const passed: ValidatedEntry<T>[] = [];
  const failed: ValidationFailure[] = [];
  for (const entry of entries) {
    const result = schema.safeParse(entry.content);
    if (result.success) {
      passed.push({ file: entry.file, value: result.data });
    } else {
      failed.push({ file: entry.file, issues: result.error.issues });
    }
  }
  return { passed, failed };
}

function validateNarrativeEntries(
  entries: FileEntry[],
): CollectionResult<ResultNarrative | NarrativeBlock> {
  const passed: ValidatedEntry<ResultNarrative | NarrativeBlock>[] = [];
  const failed: ValidationFailure[] = [];
  for (const entry of entries) {
    const asResult = ChapterPackSchemas.narrative.result.safeParse(entry.content);
    if (asResult.success) {
      passed.push({ file: entry.file, value: asResult.data });
      continue;
    }
    const asBlock = ChapterPackSchemas.narrative.block.safeParse(entry.content);
    if (asBlock.success) {
      passed.push({ file: entry.file, value: asBlock.data });
      continue;
    }
    failed.push({
      file: entry.file,
      issues: [...asResult.error.issues, ...asBlock.error.issues],
    });
  }
  return { passed, failed };
}

function validateVisualEntries(
  entries: FileEntry[],
): CollectionResult<VisualScene | CharacterAsset | ImageAsset> {
  const passed: ValidatedEntry<VisualScene | CharacterAsset | ImageAsset>[] = [];
  const failed: ValidationFailure[] = [];
  for (const entry of entries) {
    const asScene = ChapterPackSchemas.visuals.safeParse(entry.content);
    if (asScene.success) {
      passed.push({ file: entry.file, value: asScene.data });
      continue;
    }
    const asCharacter = CharacterAssetSchema.safeParse(entry.content);
    if (asCharacter.success) {
      passed.push({ file: entry.file, value: asCharacter.data });
      continue;
    }
    const asImage = ImageAssetSchema.safeParse(entry.content);
    if (asImage.success) {
      passed.push({ file: entry.file, value: asImage.data });
      continue;
    }
    failed.push({
      file: entry.file,
      issues: [...asScene.error.issues, ...asCharacter.error.issues, ...asImage.error.issues],
    });
  }
  return { passed, failed };
}

export function countSchemaFailures(schemaResult: SchemaValidationResult): number {
  return (
    schemaResult.manifest.failed.length +
    schemaResult.storyGraph.failed.length +
    schemaResult.initialState.failed.length +
    schemaResult.worldRules.failed.length +
    schemaResult.hostPublic.failed.length +
    schemaResult.scenes.failed.length +
    schemaResult.interactions.failed.length +
    schemaResult.actions.failed.length +
    schemaResult.dice.failed.length +
    schemaResult.results.failed.length +
    schemaResult.stateRules.failed.length +
    schemaResult.narrative.failed.length +
    schemaResult.npc.failed.length +
    schemaResult.recovery.failed.length +
    schemaResult.boss.failed.length +
    schemaResult.endings.failed.length +
    schemaResult.visuals.failed.length +
    schemaResult.audio.failed.length +
    schemaResult.metadata.failed.length
  );
}
