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
});
