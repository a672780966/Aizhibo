import type { AddressInfo } from 'node:net';
import { wrapPresentationPort } from '@interactive-story/runtime-kernel';
import type { PresentationCommand, PresentationState } from '@interactive-story/runtime-kernel';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import { createWebSocketPresentationPort } from './wsServer.js';

function startServer(): { wss: WebSocketServer; url: string } {
  const wss = new WebSocketServer({ port: 0 }); // 随机可用端口
  const { port } = wss.address() as AddressInfo;
  return { wss, url: `ws://localhost:${port}` };
}

function connect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const client = new WebSocket(url);
    client.once('open', () => resolve(client));
    client.once('error', reject);
  });
}

function waitForMessage(client: WebSocket): Promise<PresentationCommand> {
  return new Promise((resolve, reject) => {
    client.once('message', (data) => {
      resolve(JSON.parse(data.toString()) as PresentationCommand);
    });
    client.once('error', reject);
  });
}

describe('createWebSocketPresentationPort（真实 ws server + client 集成）', () => {
  const clients: WebSocket[] = [];
  const servers: WebSocketServer[] = [];

  afterEach(() => {
    for (const client of clients.splice(0)) client.close();
    for (const wss of servers.splice(0)) wss.close();
  });

  it('RENDERER_HELLO 触发 PRESENTATION_RESYNC，commandSeq 从 1 开始且后续连续不跳号', async () => {
    const { wss, url } = startServer();
    servers.push(wss);
    // 服务端半 = 裸传输端口 + DEV-012 冻结的 wrapPresentationPort 组合（Task Package T005）
    const port = wrapPresentationPort(createWebSocketPresentationPort(wss));

    const client = await connect(url);
    clients.push(client);
    client.send(JSON.stringify({ type: 'RENDERER_HELLO' }));

    const resync = await waitForMessage(client);
    expect(resync.commandSeq).toBe(1);
    expect((resync.command as { kind?: string }).kind).toBe('PRESENTATION_RESYNC');
    expect((resync.command as { state?: PresentationState }).state).toEqual({ phase: 'LOADING' });

    // 组合端口的 send 走进同一个信封管道，编号与 RESYNC 连续
    port.send({ kind: 'PRES_READY' });
    const next = await waitForMessage(client);
    expect(next.commandSeq).toBe(2);
    expect(next.command).toEqual({ kind: 'PRES_READY' });
  });

  it('RESYNC 携带的是当前折叠状态，且 RESYNC 命令本身占用一个连续编号', async () => {
    const { wss, url } = startServer();
    servers.push(wss);
    const port = wrapPresentationPort(createWebSocketPresentationPort(wss));
    port.send({ kind: 'PRES_READY' }); // commandSeq 1

    const client = await connect(url);
    clients.push(client);
    client.send(JSON.stringify({ type: 'RENDERER_HELLO' }));

    const resync = await waitForMessage(client);
    expect(resync.commandSeq).toBe(2);
    expect((resync.command as { state?: PresentationState }).state).toEqual({ phase: 'READY' });
  });

  it('真实断线重连：close 后全新连接重发 RENDERER_HELLO 走同一路径，commandSeq 延续且 state 反映断线前最新折叠状态', async () => {
    const { wss, url } = startServer();
    servers.push(wss);
    const port = wrapPresentationPort(createWebSocketPresentationPort(wss));

    const client1 = await connect(url);
    clients.push(client1);
    client1.send(JSON.stringify({ type: 'RENDERER_HELLO' }));
    const resync1 = await waitForMessage(client1);
    expect(resync1.commandSeq).toBe(1);
    expect((resync1.command as { state?: PresentationState }).state).toEqual({ phase: 'LOADING' });

    port.send({ kind: 'PRES_READY' });
    const ready = await waitForMessage(client1);
    expect(ready.commandSeq).toBe(2);
    expect(ready.command).toEqual({ kind: 'PRES_READY' });

    // 真实断线：关闭连接并等待关闭完成，再从客户端数组中移除（afterEach 的 close 幂等）
    const closed = new Promise<void>((resolve) => client1.once('close', () => resolve()));
    client1.close();
    await closed;
    clients.splice(clients.indexOf(client1), 1);

    // 重连：全新连接，重发 RENDERER_HELLO——同一个 helloHandler，同一条代码路径
    const client2 = await connect(url);
    clients.push(client2);
    client2.send(JSON.stringify({ type: 'RENDERER_HELLO' }));

    const resync2 = await waitForMessage(client2);
    expect(resync2.commandSeq).toBe(3); // commandSeq 延续此前计数，不重置为 1
    expect((resync2.command as { kind?: string }).kind).toBe('PRESENTATION_RESYNC');
    expect((resync2.command as { state?: PresentationState }).state).toEqual({ phase: 'READY' });
  });

  it('多客户端分发一致性：一次 port.send 广播给全部在线连接，各客户端收到内容一致的命令', async () => {
    const { wss, url } = startServer();
    servers.push(wss);
    const port = wrapPresentationPort(createWebSocketPresentationPort(wss));

    const client1 = await connect(url);
    clients.push(client1);
    const client2 = await connect(url);
    clients.push(client2);

    // 先挂好两个客户端的等待器，再发一次命令，避免竞态
    const got1 = waitForMessage(client1);
    const got2 = waitForMessage(client2);
    port.send({ kind: 'PRES_READY' });

    const [m1, m2] = await Promise.all([got1, got2]);
    expect(m1).toEqual(m2); // 广播内容一致：commandSeq/command 均相同
    expect(m1).toEqual({ commandSeq: 1, command: { kind: 'PRES_READY' } });
  });
});
