import { ChapterManifestSchema, StoryGraphSchema, WorldRulesSchema } from './manifest.js';
import { WorldStateSchema } from './worldState.js';
import { HostPublicSpecSchema } from './hostPublic.js';
import { SceneNodeSchema } from './scene.js';
import { InteractionNodeSchema } from './interaction.js';
import { ActionDefinitionSchema } from './action.js';
import { DiceProfileSchema } from './dice.js';
import { ResultDictionarySchema } from './result.js';
import { StateRuleSetSchema } from './stateRules.js';
import { ResultNarrativeSchema, NarrativeBlockSchema } from './narrative.js';
import { NPCDefinitionSchema } from './npc.js';
import { RecoveryRuleSchema } from './recovery.js';
import { BossNodeSchema } from './boss.js';
import { EndingNodeSchema } from './endings.js';
import { VisualSceneSchema } from './visuals.js';
import { AudioAssetSchema } from './audio.js';
import { ChapterMetadataSchema } from './metadata.js';

export const ChapterPackSchemas = {
  manifest: ChapterManifestSchema,
  storyGraph: StoryGraphSchema,
  initialState: WorldStateSchema,
  worldRules: WorldRulesSchema,
  hostPublic: HostPublicSpecSchema,
  scenes: SceneNodeSchema,
  interactions: InteractionNodeSchema,
  actions: ActionDefinitionSchema,
  dice: DiceProfileSchema,
  results: ResultDictionarySchema,
  'state-rules': StateRuleSetSchema,
  narrative: {
    result: ResultNarrativeSchema,
    block: NarrativeBlockSchema,
  },
  npc: NPCDefinitionSchema,
  recovery: RecoveryRuleSchema,
  boss: BossNodeSchema,
  endings: EndingNodeSchema,
  visuals: VisualSceneSchema,
  audio: AudioAssetSchema,
  metadata: ChapterMetadataSchema,
} as const;

export type ChapterPackSchemaMap = typeof ChapterPackSchemas;
