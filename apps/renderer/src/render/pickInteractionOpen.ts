import type { DisplayChoice, PresentationCommand } from '@interactive-story/runtime-kernel';

/** 当前应展示的选项视图：选项列表 + 互动时限 + 产生它的命令 `commandSeq`（检测"新一轮"）。 */
export interface InteractionOpenView {
  choices: DisplayChoice[];
  openDurationMs?: number;
  key: number;
}

interface LatestOpen {
  seq: number;
  choices: DisplayChoice[];
  openDurationMs?: number;
}

function commandOf(envelope: PresentationCommand): {
  kind?: unknown;
  choices?: unknown;
  openDurationMs?: unknown;
} {
  if (typeof envelope.command !== 'object' || envelope.command === null) return {};
  return envelope.command as { kind?: unknown; choices?: unknown; openDurationMs?: unknown };
}

/**
 * 从已接收的命令流中选出最近一条 `INTERACTION_OPEN`。Runtime（`onOpen` CR，DEV-024）已把
 * `visibleIf` 过滤后的选项与互动时限随命令下发；这里只做展示数据挑选，不读任何章节文件
 * （Dev Spec §35）。`choices` 非法（非数组）时视为空数组，`openDurationMs` 非数字时省略。
 * 没有 `INTERACTION_OPEN` 命令时返回 `undefined`。
 */
export function pickInteractionOpen(
  commands: PresentationCommand[],
): InteractionOpenView | undefined {
  let latest: LatestOpen | undefined;
  for (const envelope of commands) {
    const value = commandOf(envelope);
    if (value.kind !== 'INTERACTION_OPEN') continue;
    latest = {
      seq: envelope.commandSeq,
      choices: Array.isArray(value.choices) ? (value.choices as DisplayChoice[]) : [],
      ...(typeof value.openDurationMs === 'number' ? { openDurationMs: value.openDurationMs } : {}),
    };
  }
  if (latest === undefined) return undefined;
  return {
    choices: latest.choices,
    ...(latest.openDurationMs !== undefined ? { openDurationMs: latest.openDurationMs } : {}),
    key: latest.seq,
  };
}
