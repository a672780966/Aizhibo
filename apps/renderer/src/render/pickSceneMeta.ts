import type { PresentationCommand } from '@interactive-story/runtime-kernel';

function commandOf(envelope: PresentationCommand): { kind?: unknown; cameraPreset?: unknown } {
  if (typeof envelope.command !== 'object' || envelope.command === null) return {};
  return envelope.command as { kind?: unknown; cameraPreset?: unknown };
}

/**
 * 取最近一条 `SCENE_ENTER` 的 `cameraPreset`。每次 `SCENE_ENTER` 都会把 preset 更新为
 * 当次载荷的值（非字符串视为未设置 → `undefined`），因此上一场景的 preset 不会残留到
 * 未设置 preset 的新场景。没有 `SCENE_ENTER` 命令时返回 `undefined`。
 */
export function pickCameraPreset(commands: PresentationCommand[]): string | undefined {
  let preset: string | undefined;
  for (const envelope of commands) {
    const value = commandOf(envelope);
    if (value.kind !== 'SCENE_ENTER') continue;
    preset = typeof value.cameraPreset === 'string' ? value.cameraPreset : undefined;
  }
  return preset;
}

/**
 * 取最近一条 `SCENE_ENTER` 的 `commandSeq`（没有则 `0`），作为场景容器 React 元素的
 * `key`——每次场景切换这个值都会变化，`key` 变化触发 React 重新挂载该元素，天然重放
 * 一次 CSS `@keyframes fadeIn` 过渡，不需要额外的过渡状态机。
 */
export function pickSceneEnterKey(commands: PresentationCommand[]): number {
  let key = 0;
  for (const envelope of commands) {
    const value = commandOf(envelope);
    if (value.kind === 'SCENE_ENTER') key = envelope.commandSeq;
  }
  return key;
}
