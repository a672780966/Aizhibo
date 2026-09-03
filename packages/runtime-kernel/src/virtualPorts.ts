import type { ClockPort, PlatformPort } from './ports.js';
import type { Clock } from './machine.js';

let virtualTime = 0;

export const virtualClockPort: ClockPort = {
  now: () => {
    virtualTime += 1;
    return virtualTime;
  },
};

/**
 * 立即触发的假时钟：setTimeout 同步执行回调，返回值域延迟归零。
 * 仅供 Simulator/Replay/测试注入，避免真实卡顿；生产环境从不使用。
 * XState v5 的 `Clock` 不对外导出，`./machine.js` 的 `Clock` 是其结构镜像。
 */
export const instantClock: Clock = {
  setTimeout: (fn) => {
    fn();
    return 0;
  },
  clearTimeout: () => {},
};

export const virtualPlatformPort: PlatformPort = {
  // 当前未接线，故意保留空实现；模拟器直接发送 VOTE 事件。
  onVote: () => {},
  sendChat: async () => {},
};
