/**
 * Operator Action Dispatch — 全部 11 个 operator action 的唯一调用入口。
 *
 * 11 个 action 中只有 MUTE_HOST / UNMUTE_HOST / RESTORE_LKG 三个有真实
 * 可调用的目标：
 *   - MUTE_HOST / UNMUTE_HOST → HostPermissionPort（本地最小结构类型镜像，
 *     不 import @interactive-story/ai-host；谁真正传入一个
 *     createHostPermissionStore() 实例是未来集成节点的职责）。
 *   - RESTORE_LKG → @interactive-story/persistence 的 loadLatestSnapshot /
 *     restoreSession。
 * 其余 8 个 action 的目标子系统尚不存在（runtime-kernel 冻结、无对应
 * RootEvent；SAFETY/OBS 仍是占位或零代码），按 USER 2026-09-07 裁决诚实
 * 占位：返回 ok:false + 各自具体、点名原因（NOT_WIRED_REASON），不假装
 * 生效、不产生任何真实副作用。
 *
 * 关键不变式：dispatchOperatorAction 无论 runAction 返回 ok:true 还是
 * ok:false，都无条件追加一条 OPERATOR_OVERRIDE 事件——审计完整性覆盖
 * "尝试执行"本身，不只覆盖"成功执行"。
 */

import type { DatabaseSync } from 'node:sqlite';
import { loadLatestSnapshot, restoreSession } from '@interactive-story/persistence';
import type { OperatorAction, OperatorActionResult } from './operatorActions.js';
import { appendOperatorOverrideEvent } from './operatorOverrideLog.js';

/** 本地定义的最小结构类型：只声明本节点需要的 setPermission 方法。 */
export interface HostPermissionPort {
  setPermission(permission: 'ALLOWED' | 'MUTED'): void;
}

export interface OperatorDispatchDeps {
  db: DatabaseSync;
  sessionId: string;
  chapterId: string;
  chapterRootDir: string;
  seed: string;
  hostPermission: HostPermissionPort;
}

/**
 * 8 个目标尚不存在的 action 各自的诚实占位原因。类型写成 Record 覆盖
 * Exclude<OperatorAction, 'MUTE_HOST' | 'UNMUTE_HOST' | 'RESTORE_LKG'>，
 * 由 TypeScript 强制恰好覆盖这 8 个键、不多不少。
 */
const NOT_WIRED_REASON: Record<
  Exclude<OperatorAction, 'MUTE_HOST' | 'UNMUTE_HOST' | 'RESTORE_LKG'>,
  string
> = {
  PAUSE:
    'requires a new PAUSE RootEvent on the frozen runtime-kernel machine; deferred pending future CR',
  RESUME:
    'requires a new RESUME RootEvent on the frozen runtime-kernel machine; deferred pending future CR',
  CLOSE_INTERACTION:
    'requires a new CLOSE_INTERACTION RootEvent on the frozen runtime-kernel machine; deferred pending future CR',
  FORCE_RESOLVE:
    'requires a new FORCE_RESOLVE RootEvent on the frozen runtime-kernel machine; deferred pending future CR',
  REPLAY_CURRENT_AUDIO:
    'requires a new REPLAY_CURRENT_AUDIO RootEvent on the frozen runtime-kernel machine; deferred pending future CR',
  RESTART_SCENE:
    'requires a new RESTART_SCENE RootEvent on the frozen runtime-kernel machine; deferred pending future CR',
  SWITCH_OBS_FAILOVER: 'OBS integration not yet built (planned DEV-064/DEV-065)',
  EMERGENCY_STOP: 'SAFETY region not yet built beyond placeholder (planned DEV-063/DEV-067)',
};

function runAction(deps: OperatorDispatchDeps, action: OperatorAction): OperatorActionResult {
  switch (action) {
    case 'MUTE_HOST':
      deps.hostPermission.setPermission('MUTED');
      return { ok: true, action, detail: 'host permission set to MUTED' };
    case 'UNMUTE_HOST':
      deps.hostPermission.setPermission('ALLOWED');
      return { ok: true, action, detail: 'host permission set to ALLOWED' };
    case 'RESTORE_LKG': {
      // 先确认快照存在，避免依赖 restoreSession 在无快照时抛异常这一控制流。
      const existing = loadLatestSnapshot(deps.db, deps.sessionId);
      if (existing === undefined) {
        return { ok: false, action, detail: 'no persisted snapshot found for this session' };
      }
      // 已确认存在快照，restoreSession 理论上不会再抛异常。
      restoreSession(deps.db, {
        sessionId: deps.sessionId,
        chapterRootDir: deps.chapterRootDir,
        seed: deps.seed,
      });
      return { ok: true, action, detail: 'restored latest persisted snapshot' };
    }
    default:
      // TypeScript 在此分支已将 action 收窄为 NOT_WIRED_REASON 的键类型，
      // 索引类型安全，无需 cast。
      return { ok: false, action, detail: NOT_WIRED_REASON[action] };
  }
}

export function dispatchOperatorAction(
  deps: OperatorDispatchDeps,
  action: OperatorAction,
): OperatorActionResult {
  const result = runAction(deps, action);
  // 无条件追加审计事件：一次操作意图，无论是否真的生效，都需要留痕。
  appendOperatorOverrideEvent(deps.db, {
    sessionId: deps.sessionId,
    chapterId: deps.chapterId,
    action,
    detail: result.detail,
  });
  return result;
}
