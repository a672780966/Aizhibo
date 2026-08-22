import type { PresentationCommand } from '@interactive-story/runtime-kernel';

/**
 * 骰子 UI 的三阶段视图。`INTRO` 与 `RESOLVE` 由服务端命令驱动；`LOOP`（摇骰子动画）
 * 是 `App.tsx` 的本地视觉过渡，不体现在本类型里（见 DECISIONS D1）。
 */
export type DicePhase = 'IDLE' | 'INTRO' | 'RESOLVE';

/** `DICE_RESULT.results` 数组元素的展示视图，只含已裁剪的展示字段。 */
export interface DiceResultView {
  diceType: string;
  rawValue: number;
  modifier: number;
  finalValue: number;
  quality: string;
}

export interface DiceView {
  phase: DicePhase;
  results: DiceResultView[];
  /** 产生这批数据的命令 commandSeq：`DICE_INTRO` 或 `DICE_RESULT` 中较新者的 seq。 */
  key: number;
}

interface LatestEntry {
  seq: number;
  results: DiceResultView[];
}

function commandOf(envelope: PresentationCommand): { kind?: unknown; results?: unknown } {
  if (typeof envelope.command !== 'object' || envelope.command === null) return {};
  return envelope.command as { kind?: unknown; results?: unknown };
}

/**
 * 把 `DICE_RESULT` 载荷映射成 `DiceResultView[]`：只保留五个展示字段
 * （`diceType`/`rawValue`/`modifier`/`finalValue`/`quality`），丢弃 `seed`/
 * `rollIndex`/`appliedModifiers` 等内部记账字段；非数组或元素缺任一展示字段的一律
 * 丢弃（渲染格式要求 quality 标签，见 DECISIONS D3）。
 */
function toResultViews(payload: unknown): DiceResultView[] {
  if (!Array.isArray(payload)) return [];
  const views: DiceResultView[] = [];
  for (const item of payload) {
    if (typeof item !== 'object' || item === null) continue;
    const r = item as Record<string, unknown>;
    if (
      typeof r.diceType !== 'string' ||
      typeof r.rawValue !== 'number' ||
      typeof r.modifier !== 'number' ||
      typeof r.finalValue !== 'number' ||
      typeof r.quality !== 'string'
    ) {
      continue;
    }
    views.push({
      diceType: r.diceType,
      rawValue: r.rawValue,
      modifier: r.modifier,
      finalValue: r.finalValue,
      quality: r.quality,
    });
  }
  return views;
}

/**
 * 从已接收的命令流中选出当前骰子 UI 应处的阶段。比较最近一条 `DICE_INTRO` 与最近
 * 一条 `DICE_RESULT` 的 `commandSeq`：都不存在→`IDLE`；`DICE_RESULT` 更新→`RESOLVE`
 * （携映射后的 results）；`DICE_INTRO` 更新（或只有它）→`INTRO`（摇骰信号，无结果）。
 * `key` 是较新者的 `commandSeq`，供 `App.tsx` 检测"新一轮"以重启 LOOP 动画
 * （`pickDialogueLines`/`pickInteractionOpen` 同款模式）。
 */
export function pickDiceState(commands: PresentationCommand[]): DiceView {
  let intro: number | undefined;
  let result: LatestEntry | undefined;

  for (const envelope of commands) {
    const value = commandOf(envelope);
    if (value.kind === 'DICE_INTRO') {
      intro = envelope.commandSeq;
    } else if (value.kind === 'DICE_RESULT') {
      result = { seq: envelope.commandSeq, results: toResultViews(value.results) };
    }
  }

  if (intro === undefined && result === undefined) {
    return { phase: 'IDLE', results: [], key: 0 };
  }
  if (result === undefined) {
    return { phase: 'INTRO', results: [], key: intro! };
  }
  if (intro === undefined || result.seq > intro) {
    return { phase: 'RESOLVE', results: result.results, key: result.seq };
  }
  return { phase: 'INTRO', results: [], key: intro };
}
