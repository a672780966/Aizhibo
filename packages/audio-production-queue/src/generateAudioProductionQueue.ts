import { loadChapterPack, runSchemaValidation } from '@interactive-story/chapter-compiler';
import type { TtsProviderPort } from '@interactive-story/audio-engine';
import { extractNarrativeBlocks } from './extractNarrativeBlocks.js';
import {
  runAudioProductionQueue,
  type NarrativeBlockAudioResult,
  type VoiceConfig,
} from './runAudioProductionQueue.js';

/**
 * End-to-end batch production entry point: load a real Chapter Pack, run
 * the real schema validation, extract all NarrativeBlocks, then synthesize
 * them all through the given TTS provider (same `VoiceConfig` for the whole
 * batch). Load issues are ignored (unvalidatable files simply never surface
 * in `schemaResult.narrative.passed`), matching the DEV-073 precedent.
 */
export async function generateAudioProductionQueue(
  rootDir: string,
  ttsPort: TtsProviderPort,
  voice: VoiceConfig,
): Promise<NarrativeBlockAudioResult[]> {
  const { raw } = loadChapterPack(rootDir);
  const schemaResult = runSchemaValidation(raw);
  const blocks = extractNarrativeBlocks(schemaResult);
  return runAudioProductionQueue(blocks, ttsPort, voice);
}
