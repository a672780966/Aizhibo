import type { PresentationCommand, AudioResolutionResult } from '@interactive-story/runtime-kernel';

const VALID_SOURCES = new Set(['PREGENERATED', 'CACHE', 'RUNTIME_TTS', 'SUBTITLE_ONLY']);

function commandOf(envelope: PresentationCommand): { kind?: unknown; audio?: unknown } {
  if (typeof envelope.command !== 'object' || envelope.command === null) return {};
  return envelope.command as { kind?: unknown; audio?: unknown };
}

function isAudioResolutionSource(v: unknown): v is AudioResolutionResult['source'] {
  return typeof v === 'string' && VALID_SOURCES.has(v);
}

/**
 * 防御性映射最近一条 `RESULT_PLAYING` 的 `audio` 字段（DEV-031）。任何缺失/非法
 * 形状一律返回 `undefined`，不抛异常：`PREGENERATED`/`CACHE` 必须带 `file` 字符串；
 * `RUNTIME_TTS`/`SUBTITLE_ONLY` 不带 `file`（本节点只决策不调用）。
 */
function toResultAudio(audio: unknown): AudioResolutionResult | undefined {
  if (typeof audio !== 'object' || audio === null) return undefined;
  const r = audio as Record<string, unknown>;
  if (!isAudioResolutionSource(r.source)) return undefined;
  if (r.source === 'PREGENERATED' || r.source === 'CACHE') {
    if (typeof r.file !== 'string') return undefined;
    return { source: r.source, file: r.file };
  }
  return { source: r.source };
}

/**
 * 从已接收的命令流中选出最近一条 `RESULT_PLAYING` 的音频来源视图。每条新的
 * `RESULT_PLAYING` 都会替换上一条（含非法值 → 复位为 `undefined`），与
 * `pickSceneAudio` 的"最近一条为准"语义一致。没有 `RESULT_PLAYING` 命令时返回
 * `undefined`。
 */
export function pickResultAudio(
  commands: PresentationCommand[],
): AudioResolutionResult | undefined {
  let latest: unknown;
  let seen = false;
  for (const envelope of commands) {
    const value = commandOf(envelope);
    if (value.kind !== 'RESULT_PLAYING') continue;
    latest = value.audio;
    seen = true;
  }
  return seen ? toResultAudio(latest) : undefined;
}
