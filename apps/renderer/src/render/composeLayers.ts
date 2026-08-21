import type { ResolvedVisualLayer } from '@interactive-story/runtime-kernel';

/** A visual layer ready for the renderer: sorted by `z` and mapped to `zIndex`. */
export interface RenderableLayer {
  assetId: string;
  file: string;
  zIndex: number;
  parallax?: number;
}

/**
 * Sort resolved layers bottom-up (ascending `z`) and map them to
 * `RenderableLayer`. `parallax` is passed through untouched — real camera /
 * parallax motion is DEV-026 Camera/Transition's job; this node only makes
 * sure the data survives. The input array is not mutated.
 */
export function composeLayers(layers: ResolvedVisualLayer[]): RenderableLayer[] {
  return [...layers]
    .sort((a, b) => a.z - b.z)
    .map((layer) => ({
      assetId: layer.assetId,
      file: layer.file,
      zIndex: layer.z,
      ...(layer.parallax !== undefined ? { parallax: layer.parallax } : {}),
    }));
}
