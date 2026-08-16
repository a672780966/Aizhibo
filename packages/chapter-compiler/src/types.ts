export interface FileEntry {
  file: string;
  content: unknown;
}

export interface RawChapterPack {
  manifest: unknown;
  storyGraph: unknown;
  initialState: unknown;
  worldRules: unknown;
  hostPublic: unknown;
  scenes: FileEntry[];
  interactions: FileEntry[];
  actions: FileEntry[];
  dice: FileEntry[];
  results: FileEntry[];
  stateRules: FileEntry[];
  narrative: FileEntry[];
  npc: FileEntry[];
  recovery: FileEntry[];
  boss: FileEntry[];
  endings: FileEntry[];
  visuals: FileEntry[];
  audio: FileEntry[];
  metadata: FileEntry[];
}

export interface LoadIssue {
  kind: 'JSON_SYNTAX_ERROR' | 'FILE_READ_ERROR';
  path: string;
  message: string;
}

export type ReferenceIssueSeverity = 'BLOCKING' | 'ADVISORY';

export type ReferenceIssueCategory =
  | 'storyGraph.entryNodeId'
  | 'storyGraph.nodeFileMissing'
  | 'storyGraph.nodeIdMismatch'
  | 'storyGraph.orphanFile'
  | 'storyGraph.sceneNext'
  | 'storyGraph.guardGoto'
  | 'storyGraph.sceneInteractionId'
  | 'storyGraph.interactionNextScene'
  | 'storyGraph.bossOutgoing'
  | 'actionChain.choiceRuleId'
  | 'actionChain.diceProfileId'
  | 'actionChain.resultSetId'
  | 'actionChain.narrativeId'
  | 'actionChain.mapsTo'
  | 'actionChain.recoveryActionId'
  | 'npcVisuals.characterAssetId'
  | 'npcVisuals.characterId'
  | 'npcVisuals.expression'
  | 'boss.interactionId'
  | 'boss.interactionNextScene';

export interface ReferenceIssue {
  category: ReferenceIssueCategory;
  severity: ReferenceIssueSeverity;
  message: string;
  file: string;
}
