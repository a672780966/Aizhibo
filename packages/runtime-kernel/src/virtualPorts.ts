import type { ClockPort, PlatformPort } from './ports.js';

let virtualTime = 0;

export const virtualClockPort: ClockPort = {
  now: () => {
    virtualTime += 1;
    return virtualTime;
  },
};

export const virtualPlatformPort: PlatformPort = {
  // 当前未接线，故意保留空实现；模拟器直接发送 VOTE 事件。
  onVote: () => {},
  sendChat: async () => {},
};
