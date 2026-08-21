import type { PresentationPort } from '@interactive-story/runtime-kernel';
import { WebSocket, WebSocketServer } from 'ws';

const RENDERER_HELLO = 'RENDERER_HELLO';

/**
 * 用 ws 库实现的真实 PresentationPort（传输半，Task Package 2.2/2.1）：
 * - send 把信封 JSON 文本帧广播给全部已连接 client（同一时间实践上只有一个 OBS Browser
 *   Source 实例，广播语义足够）。
 * - onRendererHello 注册一次；对每个 client 的 message 帧判定 type === 'RENDERER_HELLO'
 *   时统一调用 handler（首连/重连同一条路径，CR-012）。
 *
 * commandSeq 信封与折叠状态由调用方组合 wrapPresentationPort 获得（见
 * wsServer.test.ts 集成测试），本函数只做传输，不重新实现 DEV-012 已冻结的封装逻辑。
 */
export function createWebSocketPresentationPort(wss: WebSocketServer): PresentationPort {
  let helloHandler: (() => void) | undefined;

  wss.on('connection', (socket) => {
    socket.on('message', (data) => {
      let frame: unknown;
      try {
        frame = JSON.parse(data.toString());
      } catch {
        return; // 非 JSON 帧忽略
      }
      const isHello =
        typeof frame === 'object' &&
        frame !== null &&
        (frame as { type?: unknown }).type === RENDERER_HELLO;
      if (isHello) helloHandler?.();
    });
  });

  return {
    send(command) {
      const text = JSON.stringify(command);
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) client.send(text);
      }
    },
    onRendererHello(handler) {
      helloHandler = handler;
    },
  };
}
