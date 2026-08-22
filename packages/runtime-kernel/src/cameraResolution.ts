import type { CompileResult } from '@interactive-story/chapter-compiler';
import type { VisualScene } from '@interactive-story/chapter-schema';

/**
 * Resolve a `visualSceneId` to its chapter-declared camera preset key.
 * `VisualScene`/`CharacterAsset`/`ImageAsset` share one
 * `schemaResult.visuals.passed` collection; `'layers' in value` discriminates
 * the `VisualScene` entries (same pattern as `resolveVisualLayers`, DEV-021).
 *
 * Deliberately NOT merged into `resolveVisualLayers` (DEV-021 frozen): the
 * small duplicate lookup is cheaper than opening a frozen function's return
 * shape (DECISIONS D1).
 *
 * Defensive: an unknown `visualSceneId` yields `undefined`; the field itself
 * is optional in the frozen schema (`z.string().optional()`), so a scene
 * without a `cameraPreset` also yields `undefined`. Never throws.
 */
export function resolveCameraPreset(
  compiled: CompileResult,
  visualSceneId: string,
): string | undefined {
  const visuals = compiled.schemaResult.visuals.passed;
  const entry = visuals.find((e) => e.value.id === visualSceneId && 'layers' in e.value);
  if (entry === undefined) return undefined;
  return (entry.value as VisualScene).cameraPreset;
}
