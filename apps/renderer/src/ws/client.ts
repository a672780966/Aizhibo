import type { PresentationCommand } from '@interactive-story/runtime-kernel';
import { detectSeqGap } from './seqGap.js';

/** 最小注入接口：解耦浏览器 WebSocket 全局，换取纯函数可测试性（Ports 模式的同类应用）。 */
export interface SocketLike {
  send(data: string): void;
  onOpen(handler: () => void): void;
  onMessage(handler: (data: string) => void): void;
}

export interface RendererClientOptions {
  /** 每条信封处理完成后回调（本客户端不丢弃任何命令，跳空时也只是额外重发 HELLO）。 */
  onCommand?: (envelope: PresentationCommand) => void;
}

export interface RendererClient {
  getLastSeq(): number | undefined;
}

export function createRendererClient(
  socket: SocketLike,
  options: RendererClientOptions = {},
): RendererClient {
  let lastSeq: number | undefined;

  // CR-012：首次连接与重连走同一条路径——onopen 永远发 RENDERER_HELLO
  socket.onOpen(() => {
    socket.send(JSON.stringify({ type: 'RENDERER_HELLO' }));
  });

  socket.onMessage((data) => {
    let envelope: PresentationCommand;
    try {
      envelope = JSON.parse(data) as PresentationCommand;
    } catch {
      return; // 非 JSON 帧忽略
    }
    if (typeof envelope.commandSeq !== 'number') return;

    // 跳空时主动重发 RENDERER_HELLO 触发一次全量 RESYNC；本条信封本身不丢弃，照常处理
    if (detectSeqGap(lastSeq, envelope.commandSeq)) {
      socket.send(JSON.stringify({ type: 'RENDERER_HELLO' }));
    }
    lastSeq = envelope.commandSeq;
    options.onCommand?.(envelope);
  });

  return { getLastSeq: () => lastSeq };
}
