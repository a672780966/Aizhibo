import type { CompileResult } from '@interactive-story/chapter-compiler';
import type { SceneNode } from '@interactive-story/chapter-schema';

/**
 * A resolved scene-level audio track: the `AudioAsset.id`/`file` lookup has
 * been chased to the concrete audio file here in the Runtime (Dev Spec §35:
 * the Renderer must not read chapter content itself). `loop`/`gain` pass
 * through untouched (may be `undefined`).
 */
export interface ResolvedAudio {
  id: string;
  file: string;
  loop?: boolean;
  gain?: number;
}

export interface SceneAudio {
  bgm?: ResolvedAudio;
  ambience: ResolvedAudio[];
}

/**
 * Resolve a `SceneNode`'s `bgm` (optional) and `ambience` (array) ids to their
 * concrete `AudioAsset` files, looking each up in
 * `schemaResult.audio.passed`. Defensive: an id with no matching asset, or an
 * asset whose `source === 'RUNTIME_TTS'` (no `file`; a DEV-034+ TTS-pipeline
 * asset this node does not handle), is skipped — a `bgm` that resolves to
 * nothing omits the field entirely, an unresolvable `ambience` entry is
 * dropped from the array. Never throws.
 */
export function resolveSceneAudio(compiled: CompileResult, scene: SceneNode): SceneAudio {
  const audios = compiled.schemaResult.audio.passed;

  const resolveOne = (id: string): ResolvedAudio | undefined => {
    const entry = audios.find((e) => e.value.id === id);
    if (entry === undefined) return undefined;
    const asset = entry.value;
    if (asset.source === 'RUNTIME_TTS') return undefined;
    return {
      id: asset.id,
      file: asset.file,
      ...(asset.loop !== undefined ? { loop: asset.loop } : {}),
      ...(asset.gain !== undefined ? { gain: asset.gain } : {}),
    };
  };

  const bgm = scene.bgm !== undefined ? resolveOne(scene.bgm) : undefined;
  const ambience = (scene.ambience ?? [])
    .map((id) => resolveOne(id))
    .filter((a): a is ResolvedAudio => a !== undefined);

  return {
    ...(bgm !== undefined ? { bgm } : {}),
    ambience,
  };
}
