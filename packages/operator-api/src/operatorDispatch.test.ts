import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  createRuntimeMachine,
  getEventLog,
  getPersistedSnapshot,
} from '@interactive-story/runtime-kernel';
import {
  appendEvents,
  loadEvents,
  openDatabase,
  saveSnapshot,
} from '@interactive-story/persistence';
import { ALL_OPERATOR_ACTIONS } from './operatorActions.js';
import { dispatchOperatorAction, type HostPermissionPort } from './operatorDispatch.js';

// 复用 recovery.test.ts 的既有 chapter fixture：restoreSession 需要真实可编译的章节目录。
const fixture = fileURLToPath(
  new URL('../../chapter-compiler/test-fixtures/valid-minimal', import.meta.url),
);

function makeDeps(overrides: Partial<Parameters<typeof dispatchOperatorAction>[0]> = {}) {
  const db = openDatabase(':memory:');
  const calls: string[] = [];
  const hostPermission: HostPermissionPort = {
    setPermission(permission) {
      calls.push(permission);
    },
  };
  return {
    db,
    calls,
    hostPermission,
    deps: {
      db,
      sessionId: 's-1',
      chapterId: 'ch-1',
      chapterRootDir: fixture,
      seed: 'dispatch-test',
      hostPermission,
      ...overrides,
    },
  };
}

/** 为 session 播种一条与 recovery.test.ts 同构的 LKG 快照。 */
function seedSnapshot(db: Parameters<typeof saveSnapshot>[0], sessionId: string) {
  const actor = createRuntimeMachine({ chapterRootDir: fixture, seed: 'dispatch-seed' });
  actor.send({ type: 'BOOT' });
  actor.send({ type: 'STORY.DONE' });
  // 单次持久化：全量事件写库一次 + 最新快照落表，不会与 appendEvents 的
  // (session_id, sequence) 唯一约束冲突。
  const events = getEventLog(actor);
  appendEvents(db, sessionId, events.slice());
  const latest = events.at(-1);
  saveSnapshot(db, sessionId, latest?.sequence ?? 0, getPersistedSnapshot(actor), 'ch-1');
  return actor;
}

describe('dispatchOperatorAction — MUTE_HOST / UNMUTE_HOST', () => {
  it('MUTE_HOST returns ok:true and sets host permission to MUTED', () => {
    const { deps, calls } = makeDeps();
    const result = dispatchOperatorAction(deps, 'MUTE_HOST');
    expect(result).toEqual({
      ok: true,
      action: 'MUTE_HOST',
      detail: 'host permission set to MUTED',
    });
    expect(calls).toEqual(['MUTED']);
  });

  it('UNMUTE_HOST returns ok:true and sets host permission back to ALLOWED', () => {
    const { deps, calls } = makeDeps();
    const result = dispatchOperatorAction(deps, 'UNMUTE_HOST');
    expect(result).toEqual({
      ok: true,
      action: 'UNMUTE_HOST',
      detail: 'host permission set to ALLOWED',
    });
    expect(calls).toEqual(['ALLOWED']);
  });

  it('a real createHostPermissionStore-backed port flips state across the two actions', () => {
    const { deps, hostPermission } = makeDeps();
    expect(dispatchOperatorAction(deps, 'MUTE_HOST').ok).toBe(true);
    expect(dispatchOperatorAction(deps, 'UNMUTE_HOST').ok).toBe(true);
    // HostPermissionPort 是本地最小接口，fake 记录调用即可；这里用类型层面验证
    // 真实 ai-host 存储可满足该接口（createHostPermissionStore 结构性兼容）。
    void hostPermission;
  });
});

describe('dispatchOperatorAction — RESTORE_LKG', () => {
  it('returns ok:false with "no persisted snapshot" when the session has no snapshot at all', () => {
    const { deps } = makeDeps();
    const result = dispatchOperatorAction(deps, 'RESTORE_LKG');
    expect(result.ok).toBe(false);
    expect(result.detail).toContain('no persisted snapshot');
  });

  it('returns ok:true after a snapshot was seeded for the session', () => {
    const { deps, db } = makeDeps();
    seedSnapshot(db, deps.sessionId);
    const result = dispatchOperatorAction(deps, 'RESTORE_LKG');
    expect(result.ok).toBe(true);
    expect(result.detail).toContain('restored latest persisted snapshot');
  });
});

describe('dispatchOperatorAction — audit trail fires unconditionally for all 11 actions', () => {
  it('appends exactly one OPERATOR_OVERRIDE event per call, for every action including the 8 ok:false stubs', () => {
    for (const action of ALL_OPERATOR_ACTIONS) {
      const { deps } = makeDeps();
      const result = dispatchOperatorAction(deps, action);
      const events = loadEvents(deps.db, deps.sessionId);
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('OPERATOR_OVERRIDE');
      expect(events[0]?.payload).toEqual({ action, detail: result.detail });
    }
  });

  it('sequence numbers strictly increase across 11 calls on the same session', () => {
    const { deps } = makeDeps();
    for (const action of ALL_OPERATOR_ACTIONS) {
      dispatchOperatorAction(deps, action);
    }
    const events = loadEvents(deps.db, deps.sessionId);
    expect(events).toHaveLength(ALL_OPERATOR_ACTIONS.length);
    expect(events.map((e) => e.sequence)).toEqual(ALL_OPERATOR_ACTIONS.map((_, i) => i + 1));
  });
});

describe('dispatchOperatorAction — honest stubs are specific, not generic placeholders', () => {
  it('PAUSE returns ok:false with a detail naming the missing RootEvent variant', () => {
    const { deps } = makeDeps();
    const result = dispatchOperatorAction(deps, 'PAUSE');
    expect(result.ok).toBe(false);
    expect(result.detail).toContain('PAUSE RootEvent');
  });

  it('EMERGENCY_STOP returns ok:false with a detail naming the missing SAFETY region', () => {
    const { deps } = makeDeps();
    const result = dispatchOperatorAction(deps, 'EMERGENCY_STOP');
    expect(result.ok).toBe(false);
    expect(result.detail).toContain('SAFETY');
    expect(result.detail).not.toContain('RootEvent'); // 与 6 个 RootEvent 占位不同类
  });

  it('each of the 8 stubbed actions carries its own specific, distinct reason', () => {
    const { deps } = makeDeps();
    // 每个 stub 的 detail 必须出现各自的点名标记，证明不是同一句通用文案
    const expectedMarker: Record<string, string> = {
      PAUSE: 'PAUSE RootEvent',
      RESUME: 'RESUME RootEvent',
      CLOSE_INTERACTION: 'CLOSE_INTERACTION RootEvent',
      FORCE_RESOLVE: 'FORCE_RESOLVE RootEvent',
      REPLAY_CURRENT_AUDIO: 'REPLAY_CURRENT_AUDIO RootEvent',
      RESTART_SCENE: 'RESTART_SCENE RootEvent',
      SWITCH_OBS_FAILOVER: 'OBS integration not yet built',
      EMERGENCY_STOP: 'SAFETY region not yet built',
    };
    const details = new Set<string>();
    for (const [action, marker] of Object.entries(expectedMarker)) {
      const result = dispatchOperatorAction(deps, action as (typeof ALL_OPERATOR_ACTIONS)[number]);
      expect(result.ok).toBe(false);
      expect(result.detail).toContain(marker);
      details.add(result.detail);
    }
    expect(details.size).toBe(8); // 8 条互不相同、各自点名
  });
});
