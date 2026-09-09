import { describe, expect, it } from 'vitest';
import * as sendChatModule from './sendChat.js';
import { unsupportedBilibiliSendChat } from './sendChat.js';

describe('unsupportedBilibiliSendChat（A18）', () => {
  it('always answers {ok:false} with a reason naming the protocol gap', async () => {
    const result = await unsupportedBilibiliSendChat.sendChat('hello');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('no application-level send-message API');
  });

  it('is a module-level constant: calling it multiple times never succeeds', async () => {
    const first = await unsupportedBilibiliSendChat.sendChat('one');
    const second = await unsupportedBilibiliSendChat.sendChat('two');
    expect(first.ok).toBe(false);
    expect(second.ok).toBe(false);
  });

  it('exports no configurable factory (no createXxxSendChat to mislead callers)', () => {
    // 能力缺口是协议性的（无 App 级发弹幕接口），不是凭据缺失——没有可配置的
    // 端点，故没有工厂函数；未来若官方开放 send API 才需要引入工厂。
    expect('createBilibiliSendChat' in sendChatModule).toBe(false);
    expect(sendChatModule).toHaveProperty('unsupportedBilibiliSendChat');
  });
});
