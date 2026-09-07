/**
 * DEV-055 Host Scheduler.
 *
 * Decides whether the Host may speak right now, given scheduling factors
 * computed by the caller (future Runtime composition layer). This module is
 * a pure decision function: it imports nothing from runtime-kernel /
 * platform-core / other ai-host modules, and reads no real runtime state.
 *
 * Only one rule from Dev Spec section 41 is implemented — "Story Audio >
 * Host Audio": while the audio channel is busy with formal story audio,
 * the Host must yield (`canSpeak: false`). The other five factors exist in
 * the type signature only, reserved for future product/creative decisions
 * that define concrete thresholds/directions/combinations.
 */

export interface HostSchedulingFactors {
  /** 当前故事阶段（调用方计算好传入，本节点不解释具体取值）。 */
  currentStoryPhase: string;
  /** 聊天速度（调用方定义单位，比如条/分钟，本节点不解释）。 */
  chatVelocity: number;
  /** 上次 Host 说话的时间戳（毫秒），从未说过则为 undefined。 */
  lastHostSpeechTimeMs?: number;
  /** 当前被选中评论的重要性（比如 DEV-051 SelectedComment.clusterSize），无候选则为 undefined。 */
  selectedCommentImportance?: number;
  /** 当前是否处于连续对话中（调用方判定）。 */
  conversationContinuity: boolean;
  /** 音频通道当前是否被正式故事音频占用——唯一有明确规则的因子。 */
  audioChannelBusy: boolean;
}

export interface HostSchedulingDecision {
  canSpeak: boolean;
  reason: string;
}

export function decideHostScheduling(factors: HostSchedulingFactors): HostSchedulingDecision {
  if (factors.audioChannelBusy) {
    return { canSpeak: false, reason: 'audioChannelBusy' };
  }
  return { canSpeak: true, reason: 'clear' };
}
