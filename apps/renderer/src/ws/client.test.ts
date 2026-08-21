import type { PresentationCommand } from '@interactive-story/runtime-kernel';
import { describe, expect, it } from 'vitest';
import { createRendererClient } from './client.js';
import type { SocketLike } from './client.js';

class FakeSocket implements SocketLike {
  sent: string[] = [];
  private openHandler: (() => void) | undefined;
  private messageHandler: ((data: string) => void) | undefined;

  send(data: string): void {
    this.sent.push(data);
  }
  onOpen(handler: () => void): void {
    this.openHandler = handler;
  }
  onMessage(handler: (data: string) => void): void {
    this.messageHandler = handler;
  }
  open(): void {
    this.openHandler?.();
  }
  receive(envelope: PresentationCommand): void {
    this.messageHandler?.(JSON.stringify(envelope));
  }
  receiveRaw(data: string): void {
    this.messageHandler?.(data);
  }
  helloCount(): number {
    return this.sent.filter((frame) => {
      try {
        return (JSON.parse(frame) as { type?: string }).type === 'RENDERER_HELLO';
      } catch {
        return false;
      }
    }).length;
  }
}

function envelope(seq: number): PresentationCommand {
  return { commandSeq: seq, command: { kind: 'PRES_READY' } };
}

describe('createRendererClient', () => {
  it('onOpen 触发即发送 RENDERER_HELLO', () => {
    const socket = new FakeSocket();
    createRendererClient(socket);
    socket.open();
    expect(socket.helloCount()).toBe(1);
  });

  it('连续递增的 commandSeq 不触发重发 HELLO，getLastSeq 照常推进', () => {
    const socket = new FakeSocket();
    const client = createRendererClient(socket);
    socket.open();
    socket.receive(envelope(1));
    socket.receive(envelope(2));
    socket.receive(envelope(3));
    expect(socket.helloCount()).toBe(1);
    expect(client.getLastSeq()).toBe(3);
  });

  it('首条消息无论序号多少都不算跳空、不重发 HELLO', () => {
    const socket = new FakeSocket();
    const client = createRendererClient(socket);
    socket.open();
    socket.receive(envelope(42));
    expect(socket.helloCount()).toBe(1);
    expect(client.getLastSeq()).toBe(42);
  });

  it('发生跳空时重发 RENDERER_HELLO，且原命令本身不被丢弃', () => {
    const socket = new FakeSocket();
    const received: PresentationCommand[] = [];
    const client = createRendererClient(socket, {
      onCommand: (envelope) => received.push(envelope),
    });
    socket.open();
    socket.receive(envelope(1));
    expect(socket.helloCount()).toBe(1);
    socket.receive(envelope(3)); // 跳过 2 → 跳空
    expect(socket.helloCount()).toBe(2); // 额外重发一次 HELLO
    expect(client.getLastSeq()).toBe(3); // lastSeq 照常更新
    expect(received.map((e) => e.commandSeq)).toEqual([1, 3]); // 信封都被送达，不丢弃
  });

  it('乱序（序号回退）同样触发重发 HELLO', () => {
    const socket = new FakeSocket();
    createRendererClient(socket);
    socket.open();
    socket.receive(envelope(2));
    socket.receive(envelope(1));
    expect(socket.helloCount()).toBe(2);
  });

  it('非 JSON 帧被忽略，不触发重发也不更新 lastSeq', () => {
    const socket = new FakeSocket();
    const client = createRendererClient(socket);
    socket.open();
    socket.receiveRaw('not json');
    expect(socket.helloCount()).toBe(1);
    expect(client.getLastSeq()).toBeUndefined();
  });
});
