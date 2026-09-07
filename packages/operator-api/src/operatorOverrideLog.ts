/**
 * Operator Override Log — 走持久化层旁路记录 Operator 人工干预。
 *
 * 直接构造 RuntimeEvent 并调用 appendEvents，不经过 RuntimeActor.send()
 * （runtime-kernel 的 RootEvent 没有对应事件变体，本节点裁决不改冻结的
 * runtime-kernel）。这条事件只出现在持久化的 runtime_events 表里，不会
 * 出现在某个存活 actor 内存中的 getEventLog() 结果里——如实记录。
 *
 * visibility: 'HIDDEN'：内部审计事件，不是要展示给观众的事实，符合
 * CR-008/DEV-050 getPublicState() 投影"隐藏事实不外泄"的既有纪律。
 *
 * sequence 通过读取该 sessionId 已持久化事件的最大 sequence 值 +1 计算，
 * 不依赖任何存活 actor 的内存计数器。id 格式 op-${sequence}，与
 * machine.ts emitLog 的 ev-${seq} 风格对齐但前缀不同，方便审计时一眼
 * 区分"来自 actor 内存"还是"来自 Operator API 旁路"。
 */

import type { DatabaseSync } from 'node:sqlite';
import { appendEvents, loadEvents } from '@interactive-story/persistence';
import type { RuntimeEvent } from '@interactive-story/runtime-kernel';
import type { OperatorAction } from './operatorActions.js';

export interface OperatorOverrideLogInput {
  sessionId: string;
  chapterId: string;
  action: OperatorAction;
  detail: string;
}

export function appendOperatorOverrideEvent(
  db: DatabaseSync,
  input: OperatorOverrideLogInput,
): RuntimeEvent {
  const existing = loadEvents(db, input.sessionId);
  let maxSequence = 0;
  for (const event of existing) {
    if (event.sequence > maxSequence) maxSequence = event.sequence;
  }
  const nextSequence = maxSequence + 1;
  const event: RuntimeEvent = {
    id: `op-${nextSequence}`,
    sequence: nextSequence,
    timestamp: new Date().toISOString(),
    type: 'OPERATOR_OVERRIDE',
    payload: { action: input.action, detail: input.detail },
    chapterId: input.chapterId,
    sessionId: input.sessionId,
    visibility: 'HIDDEN',
  };
  appendEvents(db, input.sessionId, [event]);
  return event;
}
