/**
 * Operator Action — 11 个 action 字面量，逐一对应 Dev Spec V1.0 第 53 节
 * 原文列表（Pause/Resume/Mute Host/Unmute Host/Close Interaction/Force
 * Resolve/Replay Current Audio/Restart Scene/Restore LKG/Switch OBS
 * Failover/Emergency Stop），一个不多、一个不少。
 *
 * 用大写+下划线命名风格，与 runtime-kernel RootEvent 的 INTERACTION.OPEN
 * 等点号风格区分——这是一个独立的、不进入 runtime-kernel 状态机的动作枚举。
 */

export type OperatorAction =
  | 'PAUSE'
  | 'RESUME'
  | 'MUTE_HOST'
  | 'UNMUTE_HOST'
  | 'CLOSE_INTERACTION'
  | 'FORCE_RESOLVE'
  | 'REPLAY_CURRENT_AUDIO'
  | 'RESTART_SCENE'
  | 'RESTORE_LKG'
  | 'SWITCH_OBS_FAILOVER'
  | 'EMERGENCY_STOP';

export const ALL_OPERATOR_ACTIONS: readonly OperatorAction[] = [
  'PAUSE',
  'RESUME',
  'MUTE_HOST',
  'UNMUTE_HOST',
  'CLOSE_INTERACTION',
  'FORCE_RESOLVE',
  'REPLAY_CURRENT_AUDIO',
  'RESTART_SCENE',
  'RESTORE_LKG',
  'SWITCH_OBS_FAILOVER',
  'EMERGENCY_STOP',
];

export function isOperatorAction(value: string): value is OperatorAction {
  return (ALL_OPERATOR_ACTIONS as readonly string[]).includes(value);
}

export interface OperatorActionResult {
  ok: boolean;
  action: OperatorAction;
  detail: string;
}
