import type { CompileResult } from '@interactive-story/chapter-compiler';
import type { ImageAsset, VisualScene } from '@interactive-story/chapter-schema';

/**
 * One renderable visual layer, resolved from the compiled chapter pack:
 * the `VisualScene.layers[].assetId` lookup has already been chased to the
 * concrete `ImageAsset.file` here in the Runtime (Dev Spec §35: the Renderer
 * must not read chapter content itself).
 */
export interface ResolvedVisualLayer {
  assetId: string;
  file: string;
  z: number;
  parallax?: number;
}

/**
 * Resolve a `visualSceneId` to its concrete image layers. `VisualScene`,
 * `CharacterAsset` and `ImageAsset` share one `schemaResult.visuals.passed`
 * collection; `'layers' in value` / `'file' in value` discriminate them.
 * Defensive (PASS2 reference integrity should already guarantee every hop):
 * an unknown `visualSceneId` yields `[]`; a layer whose `assetId` has no
 * matching `ImageAsset` is skipped instead of throwing, so the remaining
 * layers still render.
 */
export function resolveVisualLayers(
  compiled: CompileResult,
  visualSceneId: string,
): ResolvedVisualLayer[] {
  const visuals = compiled.schemaResult.visuals.passed;
  const entry = visuals.find((e) => e.value.id === visualSceneId && 'layers' in e.value);
  if (entry === undefined) return [];
  const scene = entry.value as VisualScene;
  const resolved: ResolvedVisualLayer[] = [];
  for (const layer of scene.layers) {
    const imageEntry = visuals.find((e) => e.value.id === layer.assetId && 'file' in e.value);
    if (imageEntry === undefined) continue;
    const image = imageEntry.value as ImageAsset;
    resolved.push({
      assetId: layer.assetId,
      file: image.file,
      z: layer.z,
      ...(layer.parallax !== undefined ? { parallax: layer.parallax } : {}),
    });
  }
  return resolved;
}
