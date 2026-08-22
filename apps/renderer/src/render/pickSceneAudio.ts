import type { PresentationCommand, ResolvedAudio } from '@interactive-story/runtime-kernel';

/** 场景级音频视图：BGM（可选）+ 环境音数组，来自最近一条 `SCENE_ENTER` 的 `audio` 字段。 */
export interface SceneAudioView {
  bgm?: ResolvedAudio;
  ambience: ResolvedAudio[];
}

function commandOf(envelope: PresentationCommand): { kind?: unknown; audio?: unknown } {
  if (typeof envelope.command !== 'object' || envelope.command === null) return {};
  return envelope.command as { kind?: unknown; audio?: unknown };
}

/** 防御性映射单个 `ResolvedAudio`：缺 `id`/`file` 字符串的项视为无效。 */
function toResolvedAudio(item: unknown): ResolvedAudio | undefined {
  if (typeof item !== 'object' || item === null) return undefined;
  const r = item as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.file !== 'string') return undefined;
  return {
    id: r.id,
    file: r.file,
    ...(typeof r.loop === 'boolean' ? { loop: r.loop } : {}),
    ...(typeof r.gain === 'number' ? { gain: r.gain } : {}),
  };
}

/** 防御性映射 `audio` 字段：非对象视为空；`ambience` 非数组视为空数组。 */
function toSceneAudio(audio: unknown): SceneAudioView {
  if (typeof audio !== 'object' || audio === null) return { ambience: [] };
  const a = audio as Record<string, unknown>;
  const bgm = toResolvedAudio(a.bgm);
  const ambience = Array.isArray(a.ambience)
    ? a.ambience
        .map((item) => toResolvedAudio(item))
        .filter((x): x is ResolvedAudio => x !== undefined)
    : [];
  return { ...(bgm !== undefined ? { bgm } : {}), ambience };
}

/**
 * 从已接收的命令流中选出当前场景的音频视图。每条 `SCENE_ENTER` 都会把音频重置为当次
 * 载荷的值（`audio` 缺失/非法 → `{ambience: []}`），因此上一场景的音频不会残留到
 * 没有音频的新场景。没有 `SCENE_ENTER` 命令时返回 `{ambience: []}`。
 */
export function pickSceneAudio(commands: PresentationCommand[]): SceneAudioView {
  let latest: SceneAudioView | undefined;
  for (const envelope of commands) {
    const value = commandOf(envelope);
    if (value.kind !== 'SCENE_ENTER') continue;
    latest = toSceneAudio(value.audio);
  }
  return latest ?? { ambience: [] };
}
