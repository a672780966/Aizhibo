export const CHAPTER_AUTHORING_SCHEMA_PROMPT = `# Chapter Authoring Instructions

You are authoring a single Chapter for an AI-driven interactive fiction livestream. Your output must strictly conform to the ChapterSchema defined in \`packages/chapter-schema\`. Produce your draft by working through the following eleven stages, in order. Do not skip a stage. Do not invent fields not listed below.

## Stage 1 — World Bible

Free-form worldbuilding notes for your own reference (setting, tone, factions, stakes). This stage is not part of the machine-checked schema; use it to keep the rest of your output internally consistent.

## Stage 2 — Chapter Outline

A short outline of the chapter's dramatic arc: opening state, escalation points, the boss/climax, and the possible endings. This stage is also not machine-checked; it is planning scaffolding for Stage 3 onward.

## Stage 3 — Manifest & World Rules

Produce \`manifest\` matching \`ChapterManifestSchema\`:
- \`schemaVersion\`, \`chapterId\`, \`chapterVersion\`, \`title\`, \`entryNodeId\`, \`language\` (all strings)
- \`entryNodeId\` must be the \`id\` of the first Scene node you will define in Stage 4
- \`authoring\`: \`{ generatedBy?, auditedBy?, createdAt }\` — \`createdAt\` is a required string

Produce \`worldRules\` matching \`WorldRulesSchema\`:
- \`viewerDefaults\`: \`{ hp: 0|1|2|3, life: 0|1|2 }\`
- \`downedPolicy\`: \`'AUTO_SPEND_LIFE' | 'REQUIRE_RECOVERY'\`
- \`defaultScaleBands\`: array of \`{ scale: 'SOLO'|'SMALL'|'MEDIUM'|'LARGE'|'MASS', minParticipants, maxParticipants (nullable) }\` — bands must be contiguous and cover every viewer count you intend to support
- \`defaultDiceProfileId\`: id of a DiceProfile you will define in Stage 6
- \`interactionDefaults\`: \`{ openDurationMs, noParticipationPolicy }\` — \`noParticipationPolicy\` is one of \`DEFAULT_CHOICE\` (\`{ kind, choiceId: A|B|C|D }\`), \`SKIP\` (\`{ kind }\`), or \`HOLD\` (\`{ kind, extendMs, maxExtensions, thenFallback: DEFAULT_CHOICE|SKIP }\`)
- \`diceBuffer\`: \`{ minDiceMs, targetDiceMs, maxDiceMs }\` — must satisfy \`minDiceMs <= targetDiceMs <= maxDiceMs\`

Produce \`initialState\` matching \`WorldStateSchema\`:
- \`chapterId\`, \`sceneId\` (must equal your \`entryNodeId\`)
- \`flags\`: free-form record of boolean/number/string
- \`npc\`: record of \`NPCState\` (\`present\`, \`alive\`, \`disposition: HOSTILE|NEUTRAL|FRIENDLY\`, \`flags\`) keyed by NPC id — every NPC id used here must have a matching NPC definition in Stage 4
- \`danger\`: \`{ level: non-negative integer, tensionKey: string }\`
- \`discovered\`, \`activeThreats\`: string arrays
- \`chapterVariables\`: free-form record

Produce \`metadata\` (optional but recommended) matching \`ChapterMetadataSchema\`: \`synopsis?\`, \`tags?\`, \`contentWarnings?\`, \`estimatedDurationMinutes?\`, \`targetAudience?\`, \`authoringNotes?\`. This is pure authoring context; the runtime ignores it entirely.

### Conditions

Conditions are used by scene guards, recovery triggers, ending \`when\`, narrative block \`when\`, dice modifiers, and state rules. A Condition is always one of:
- a leaf comparison: \`{ path: { container: 'flags'|'npc'|'danger'|'discovered'|'activeThreats'|'chapterVariables', key, field? }, op: 'EQ'|'NEQ'|'GT'|'GTE'|'LT'|'LTE', value }\`
- a leaf set membership: \`{ path, op: 'IN', value: [...] }\`
- a leaf existence check: \`{ path, op: 'EXISTS' }\`
- a combinator: \`{ all: Condition[] }\`, \`{ any: Condition[] }\`, or \`{ not: Condition }\`

Reuse this exact shape everywhere a Condition is required below.

## Stage 4 — Scene Graph

For every reachable narrative beat, produce one Scene node matching \`SceneNodeSchema\`:
- \`id\`, \`visualSceneId\` (id of a VisualScene you will define in Stage 10)
- \`narration?\`: array of narration line strings shown before/around the scene
- \`characters\`: array of \`CharacterPlacement { characterId, slot: LEFT|CENTER_LEFT|CENTER|CENTER_RIGHT|RIGHT, expression?, visible }\` — exactly these five fixed slots, no more
- \`bgm?\`, \`ambience?\`: optional audio asset ids (Stage 10)
- \`interactionId?\`: id of an InteractionNode (Stage 5) if this scene offers a choice
- \`next?\`: id of the next Scene node if this scene has no interaction and flows directly onward
- \`guards?\`: array of \`SceneGuard { when: Condition, goto: nodeId, priority }\` — evaluated before the default \`next\`/interaction flow, highest priority first
- \`hostPolicy\`: \`ALLOWED|LIMITED|MUTED\` — how much the AI Host may speak while this scene is active

Also produce a \`storyGraph\` matching \`StoryGraphSchema\` (\`{ nodes: [{ id, kind: SCENE|BOSS|ENDING, file }] }\`) listing every Scene/Boss/Ending node you author, and an \`npc\` definition matching \`NPCDefinitionSchema\` (\`{ id, characterAssetId, displayName, initialState: NPCState }\`) for every NPC referenced anywhere in the chapter.

## Stage 5 — Interaction Design

For every scene that offers viewer choices, produce an \`interactions\` node matching \`InteractionNodeSchema\`:
- \`id\`, \`promptAudioId?\`, \`openDurationMs\` (how long voting stays open)
- \`choices\`: array of up to four \`Choice\` entries \`{ id: 'A'|'B'|'C'|'D', label, actionType, ruleId, visibleIf? }\` — \`actionType\` must match an ActionDefinition you define below; \`visibleIf\` is an optional array of Condition filtering when that choice is shown
- \`diceMode\`: always the literal \`'PER_ACTION_GROUP'\`
- \`resultPolicy\`: string identifying how results are resolved (document your own convention consistently)
- \`nextScene\`: id of the Scene node to move to after this interaction resolves
- \`noParticipationPolicy\`: same shape as Stage 3's world-rules default; may override it per interaction

Also produce one \`actions\` entry per distinct \`actionType\` referenced above, matching \`ActionDefinitionSchema\`: \`{ id, actionType, scaleBands?, scaleSemantics?, diceProfileId, resultSetId }\` — \`scaleBands\` overrides the chapter default scale bands for this action if present; \`scaleSemantics\` is a record keyed by scale describing what that scale means narratively for this action; \`diceProfileId\` and \`resultSetId\` point at Stage 6/7 entries.

## Stage 6 — Rule Dictionary (Dice Profiles & State Rules)

For every \`diceProfileId\` referenced above, produce a \`dice\` entry matching \`DiceProfileSchema\`:
- \`id\`, \`diceType\` (free-form label for the roll mechanic used)
- \`qualityThresholds\`: array of \`{ quality, min, max }\` with \`min <= max\`; the thresholds together must partition the roll range with no gaps for every quality you intend to be reachable
- \`modifiers?\`: array of \`{ when: Condition, amount, reason }\` — situational bonuses/penalties

Produce one or more \`state-rules\` sets matching \`StateRuleSetSchema\` (\`{ id, rules: StateRule[] }\`) where each \`StateRule\` is \`{ id, when: Condition, effects: StateEffect[], once? }\`, and each \`StateEffect\` is \`{ path: StatePath, op: 'SET'|'INC'|'DEC'|'PUSH'|'REMOVE', value? }\`. Use these for world-state changes that should fire automatically whenever a condition becomes true, independent of any specific dice roll's outcome.

## Stage 7 — Result Dictionary

For every \`resultSetId\` referenced above, produce a \`results\` entry matching \`ResultDictionarySchema\` (\`{ id, entries: ResultEntry[] }\`) where each entry is exactly one of:
- a full entry: \`{ quality, resultId, worldEffects: StateEffect[], playerEffects: PlayerEffect[], narrativeId, visibility: 'PUBLIC'|'DEFERRED' }\`
- a redirect: \`{ quality, mapsTo: <a different quality> }\` — this quality produces no unique outcome; it behaves as if the mapped-to quality had occurred
- an unreachable marker: \`{ quality, unreachable: true }\` — this quality can never actually occur for this action (note why in your authoring notes)

Every one of the six \`Quality\` values — \`DISASTER\`, \`FAILURE\`, \`COSTLY_SUCCESS\`, \`SUCCESS\`, \`GREAT_SUCCESS\`, \`SPECIAL\` — must appear exactly once across a ResultDictionary's entries, as one of the three shapes above. Never omit one.

\`PlayerEffect\`: \`{ scope: THIS_ACTION_GROUP|OTHER_ACTION_GROUPS|ALL_ACTIVE|ALL_DOWNED|ALL_SPECTATORS|ALL_VIEWERS, op: DAMAGE|HEAL|SPEND_LIFE|GRANT_LIFE|REVIVE, amount? }\`.

Also produce \`recovery\` rules matching \`RecoveryRuleSchema\` (\`{ id, when: RecoveryTrigger, scope: ViewerScope, effects: PlayerEffect[], oncePerChapter? }\`) where \`RecoveryTrigger\` is one of \`{ kind: 'STATE', condition: Condition }\`, \`{ kind: 'SCENE_ENTER', nodeId }\`, or \`{ kind: 'RESULT_QUALITY', actionId, minQuality: Quality }\` — these fire automatically so downed/struggling viewers can recover without needing an explicit choice.

## Stage 8 — Narrative Blocks

For every \`narrativeId\` referenced in Stage 7, produce a \`narrative.result\` entry matching \`ResultNarrativeSchema\`: \`{ id, primaryBlockId, supportBlockIds?, urgencyBlockId?, transitionBlockId?, prefixBlockId?, focus: { priority, category, urgency: NONE|LOW|MEDIUM|HIGH } }\`.

Every block id referenced above must correspond to a \`narrative.block\` entry matching \`NarrativeBlockSchema\`: \`{ id, slot: PREFIX|SUPPORT|PRIMARY|URGENCY|TRANSITION (must match the field name that referenced it), text, tone?, when? }\` — \`text\` is the actual line(s) of prose/dialogue, and \`when\` (a Condition) lets a \`SUPPORT\` block apply only conditionally. This is the one stage where free creative writing is the deliverable, not structural bookkeeping.

## Stage 9 — Boss & Ending

If this chapter has a climactic Boss encounter, produce a \`boss\` node matching \`BossNodeSchema\`: \`{ id, displayName, visualSceneId, phases: BossPhase[], variables, stateRuleSetId, onDefeat, onFailure, maxRounds? }\`. Each \`BossPhase\` is \`{ id, order, enterWhen: Condition, interactionId, narrationBlockIds?, hostPolicy }\`. \`onDefeat\`/\`onFailure\` are ids of the Scene/Ending to go to next.

Produce every \`endings\` node matching \`EndingNodeSchema\`: \`{ id, title, when: Condition|null, priority, isFallback, visualSceneId, narrationBlockIds, masterAudioId?, tags? }\`. Exactly one ending must have \`isFallback: true\` with \`when: null\` (the catch-all if nothing else matches); every other ending must have \`isFallback: false\` with a non-null \`when\`. Endings are evaluated in descending \`priority\` order.

## Stage 10 — Visual & Audio Assets

For every \`visualSceneId\` referenced above, produce a \`visuals\` entry matching \`VisualSceneSchema\`: \`{ id, layers: VisualLayer[] ({ assetId, z, parallax? }), cameraPreset? }\`.

For every \`characterId\` placed in a scene, produce a \`CharacterAsset\` matching \`CharacterAssetSchema\`: \`{ id, expressions, microAnimations?, defaultExpression }\` — \`expressions\` is a record mapping expression name to an image asset id.

For every asset id referenced by a layer or expression, produce an \`ImageAsset\` matching \`ImageAssetSchema\`: \`{ id, file }\`.

For every audio id referenced above (\`bgm\`, \`ambience\`, \`promptAudioId\`, \`masterAudioId\`), produce an \`audio\` entry matching \`AudioAssetSchema\` — one of two shapes: \`{ id, kind: SPEECH|BGM|SFX|AMBIENCE, loop?, gain?, source: 'PREPRODUCED'|'PREGENERATED', file }\` for pre-made audio, or \`{ id, kind, loop?, gain?, source: 'RUNTIME_TTS', ttsSpec: { voiceId, voiceSettings } }\` for text-to-speech generated at runtime.

Also produce a \`hostPublic\` spec matching \`HostPublicSpecSchema\`: \`{ flagVisibility, sceneDisclosures, tensionLabels, forbiddenTopics? }\` — \`flagVisibility\` is a record of flag key to \`PUBLIC\`|\`HIDDEN\`, governing which world-state flags the AI Host is allowed to know about or mention; \`sceneDisclosures\` is a record of scene id to \`{ locationLabel, knownFactIds, tensionKey, knownFactDependencies? }\`; \`tensionLabels\` maps each \`tensionKey\` you used to a human-readable label. This is what keeps the AI Host from leaking hidden information.

## Stage 11 — Review

Before finalizing, re-check every one of the following:
- Every id referenced anywhere above (scene ids in \`next\`/\`goto\`/\`nextScene\`/\`onDefeat\`/\`onFailure\`, and every action/dice/result/narrative/visual/audio/character id) resolves to something you actually defined.
- Every one of the six Quality values is covered in every ResultDictionary you produced.
- The fallback Ending exists, is unique, and every other Ending has a non-null \`when\`.
- \`entryNodeId\` points at a real Scene you defined.

Do not submit content that references an id you have not defined. The Compiler will reject it, and the AI Repair Loop will bounce your draft back to you with the specific error.`;
