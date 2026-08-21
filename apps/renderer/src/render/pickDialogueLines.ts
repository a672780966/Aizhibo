import type { PresentationCommand } from '@interactive-story/runtime-kernel';

/** 当前应显示的对话行：内容 + 产生它的命令的 `commandSeq`（用于检测"内容已换"）。 */
export interface DialogueLines {
  lines: string[];
  key: number;
}

interface SceneEntry {
  seq: number;
  narration: string[];
}
interface ResultEntry {
  seq: number;
  text: string;
}

function commandOf(envelope: PresentationCommand): {
  kind?: unknown;
  narration?: unknown;
  text?: unknown;
} {
  if (typeof envelope.command !== 'object' || envelope.command === null) return {};
  return envelope.command as { kind?: unknown; narration?: unknown; text?: unknown };
}

/**
 * 从已接收的命令流中选出当前应显示的对话行。比较最近一条 `SCENE_ENTER`（取其
 * `narration`）与最近一条 `RESULT_PLAYING`（取其 `text` 包成单元素数组）两者的
 * `commandSeq`，谁的 `commandSeq` 更大就用谁——新场景覆盖旧结算文本，新结算文本覆盖
 * 旧场景旁白，`commandSeq` 天然给出"最近发生的是哪一个"。都不存在时返回
 * `{lines: [], key: 0}`。`SCENE_ENTER` 未携带 `narration` 字段时视为空数组。
 */
export function pickDialogueLines(commands: PresentationCommand[]): DialogueLines {
  let scene: SceneEntry | undefined;
  let result: ResultEntry | undefined;

  for (const envelope of commands) {
    const value = commandOf(envelope);
    if (value.kind === 'SCENE_ENTER') {
      scene = {
        seq: envelope.commandSeq,
        narration: Array.isArray(value.narration) ? (value.narration as string[]) : [],
      };
    } else if (value.kind === 'RESULT_PLAYING' && typeof value.text === 'string') {
      result = { seq: envelope.commandSeq, text: value.text };
    }
  }

  if (scene === undefined && result === undefined) return { lines: [], key: 0 };
  if (scene === undefined) return { lines: [result!.text], key: result!.seq };
  if (result === undefined) return { lines: scene.narration, key: scene.seq };
  return scene.seq > result.seq
    ? { lines: scene.narration, key: scene.seq }
    : { lines: [result.text], key: result.seq };
}
