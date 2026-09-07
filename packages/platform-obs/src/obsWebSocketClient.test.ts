import { createHash } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import type { WebSocket as WsServerSocket } from 'ws';
import { WebSocketServer } from 'ws';

import { noopObsControlPort } from './obsControlPort.js';
import {
  createObsControlProvider,
  createOptionalObsControlProvider,
} from './obsWebSocketClient.js';

// Fake OBS server helpers. Every test starts a real WebSocketServer on a random port
// and scripts the obs-websocket v5 frame exchange (Hello op 0 -> Identify op 1 ->
// Identified op 2, Request op 6 -> RequestResponse op 7) directly on the raw
// server-side socket.

// obs-websocket v5 auth formula, computed independently in the test (node:crypto
// directly; the implementation's private helper is intentionally not imported):
// base64(sha256(base64(sha256(password + salt)) + challenge)).
function computeObsAuthenticationString(password: string, salt: string, challenge: string): string {
  const secret = createHash('sha256')
    .update(password + salt)
    .digest('base64');
  return createHash('sha256')
    .update(secret + challenge)
    .digest('base64');
}

function startFakeServer(): { wss: WebSocketServer; url: string } {
  const wss = new WebSocketServer({ port: 0 }); // 随机可用端口
  const { port } = wss.address() as AddressInfo;
  return { wss, url: `ws://localhost:${port}` };
}

// Frees a port by starting and closing a throwaway server, so tests can point the
// client at an address where nothing is listening.
async function unusedPort(): Promise<number> {
  const wss = new WebSocketServer({ port: 0 });
  const { port } = wss.address() as AddressInfo;
  await new Promise<void>((resolve) => wss.close(() => resolve()));
  return port;
}

// Broad structural shape of an obs-websocket frame, kept loose on purpose: tests
// narrow individual fields with typeof checks before asserting or replying.
interface ObsWsFrame {
  op?: unknown;
  d?: {
    rpcVersion?: unknown;
    negotiatedRpcVersion?: unknown;
    authentication?: unknown;
    requestType?: unknown;
    requestId?: unknown;
    requestData?: { sceneName?: unknown };
    requestStatus?: { result?: unknown; comment?: unknown };
  };
}

function parseFrame(data: unknown): ObsWsFrame {
  return JSON.parse(String(data)) as ObsWsFrame;
}

describe('obsWebSocketClient (real client against a fake OBS WebSocket server)', () => {
  const openServers: WebSocketServer[] = [];
  const openServerSockets: WsServerSocket[] = [];

  afterEach(() => {
    // Terminate any server-side sockets (closes the provider's client sockets too) and
    // shut every fake server down, so no open port/socket keeps the test run alive.
    for (const socket of openServerSockets.splice(0)) socket.terminate();
    for (const wss of openServers.splice(0)) wss.close();
  });

  it('no-auth handshake then switchScene succeeds (op6 request carries the scene, op7 result:true -> ok)', async () => {
    const { wss, url } = startFakeServer();
    openServers.push(wss);
    wss.on('connection', (socket) => {
      openServerSockets.push(socket);
      socket.send(JSON.stringify({ op: 0, d: { rpcVersion: 1 } })); // Hello, no authentication
      socket.on('message', (data) => {
        const frame = parseFrame(data);
        if (frame.op === 1) {
          // Identify received -> Identified
          socket.send(JSON.stringify({ op: 2, d: { negotiatedRpcVersion: 1 } }));
        } else if (frame.op === 6) {
          expect(frame.d?.requestType).toBe('SetCurrentProgramScene');
          expect(frame.d?.requestData?.sceneName).toBe('LIVE');
          socket.send(
            JSON.stringify({
              op: 7,
              d: { requestId: frame.d?.requestId, requestStatus: { result: true } },
            }),
          );
        }
      });
    });

    const provider = createObsControlProvider({ url });
    await expect(provider.switchScene('LIVE')).resolves.toEqual({ ok: true });
  });

  it('auth handshake with the correct password sends the independently-computed authentication string', async () => {
    const { wss, url } = startFakeServer();
    openServers.push(wss);
    // Expected value computed in the test itself with the exact official double-SHA256
    // formula, never imported from the implementation.
    const expectedAuth = computeObsAuthenticationString(
      'test-password',
      'test-salt',
      'test-challenge',
    );
    const receivedFrames: ObsWsFrame[] = [];
    wss.on('connection', (socket) => {
      openServerSockets.push(socket);
      socket.send(
        JSON.stringify({
          op: 0,
          d: { rpcVersion: 1, authentication: { challenge: 'test-challenge', salt: 'test-salt' } },
        }),
      );
      socket.on('message', (data) => {
        const frame = parseFrame(data);
        receivedFrames.push(frame);
        if (frame.op === 1) {
          // Server-side validation gate: only Identify further once the auth value matches.
          if (frame.d?.authentication === expectedAuth) {
            socket.send(JSON.stringify({ op: 2, d: { negotiatedRpcVersion: 1 } }));
          }
        } else if (frame.op === 6) {
          expect(frame.d?.requestType).toBe('SetCurrentProgramScene');
          expect(frame.d?.requestData?.sceneName).toBe('MAINTENANCE');
          socket.send(
            JSON.stringify({
              op: 7,
              d: { requestId: frame.d?.requestId, requestStatus: { result: true } },
            }),
          );
        }
      });
    });

    const provider = createObsControlProvider({ url, password: 'test-password' });
    await expect(provider.switchScene('MAINTENANCE')).resolves.toEqual({ ok: true });
    const identify = receivedFrames.find((f) => f.op === 1);
    expect(identify?.d?.authentication).toBe(expectedAuth);
    expect(identify?.d?.rpcVersion).toBe(1);
  });

  it('auth handshake with a wrong password fails honestly and quickly (server never sends Identified)', async () => {
    const { wss, url } = startFakeServer();
    openServers.push(wss);
    // The server validates against the CORRECT password's expected value; the client
    // was configured with a wrong one, so the mismatch means no Identified is sent —
    // the client must give up via its own short connect timeout instead of hanging.
    const expectedAuth = computeObsAuthenticationString(
      'test-password',
      'test-salt',
      'test-challenge',
    );
    wss.on('connection', (socket) => {
      openServerSockets.push(socket);
      socket.send(
        JSON.stringify({
          op: 0,
          d: { rpcVersion: 1, authentication: { challenge: 'test-challenge', salt: 'test-salt' } },
        }),
      );
      socket.on('message', (data) => {
        const frame = parseFrame(data);
        if (frame.op === 1 && frame.d?.authentication !== expectedAuth) {
          // Wrong credentials: simulate real OBS by closing the connection.
          socket.close();
        }
      });
    });

    const provider = createObsControlProvider({
      url,
      password: 'wrong-password',
      connectTimeoutMs: 200,
      requestTimeoutMs: 200,
    });
    const result = await provider.switchScene('LIVE');
    expect(result.ok).toBe(false);
  });

  it('server requires auth but no password is configured: client fails without sending any Identify at all', async () => {
    const { wss, url } = startFakeServer();
    openServers.push(wss);
    const receivedFrames: ObsWsFrame[] = [];
    wss.on('connection', (socket) => {
      openServerSockets.push(socket);
      socket.send(
        JSON.stringify({
          op: 0,
          d: { rpcVersion: 1, authentication: { challenge: 'test-challenge', salt: 'test-salt' } },
        }),
      );
      socket.on('message', (data) => {
        receivedFrames.push(parseFrame(data));
      });
    });

    const provider = createObsControlProvider({
      url,
      connectTimeoutMs: 500,
      requestTimeoutMs: 500,
    });
    const result = await provider.switchScene('LIVE');
    expect(result.ok).toBe(false);
    // The spec's step 4: fail immediately and send nothing — no Identify frame of any
    // kind may reach the server (an Identify with a guessed/empty auth value would
    // violate "must not attempt to guess").
    expect(receivedFrames.some((f) => f.op === 1)).toBe(false);
  });

  it('request timeout: server never answers the op6 request -> switchScene fails honestly', async () => {
    const { wss, url } = startFakeServer();
    openServers.push(wss);
    wss.on('connection', (socket) => {
      openServerSockets.push(socket);
      socket.send(JSON.stringify({ op: 0, d: { rpcVersion: 1 } }));
      socket.on('message', (data) => {
        const frame = parseFrame(data);
        if (frame.op === 1) socket.send(JSON.stringify({ op: 2, d: { negotiatedRpcVersion: 1 } }));
        // op 6 deliberately ignored: no RequestResponse is ever sent.
      });
    });

    const provider = createObsControlProvider({ url, requestTimeoutMs: 50 });
    const result = await provider.switchScene('LIVE');
    expect(result.ok).toBe(false);
  });

  it('scene switch failure: requestStatus { result:false, comment } -> comment passed through as reason', async () => {
    const { wss, url } = startFakeServer();
    openServers.push(wss);
    wss.on('connection', (socket) => {
      openServerSockets.push(socket);
      socket.send(JSON.stringify({ op: 0, d: { rpcVersion: 1 } }));
      socket.on('message', (data) => {
        const frame = parseFrame(data);
        if (frame.op === 1) {
          socket.send(JSON.stringify({ op: 2, d: { negotiatedRpcVersion: 1 } }));
        } else if (frame.op === 6) {
          socket.send(
            JSON.stringify({
              op: 7,
              d: {
                requestId: frame.d?.requestId,
                requestStatus: { result: false, comment: 'scene not found' },
              },
            }),
          );
        }
      });
    });

    const provider = createObsControlProvider({ url });
    await expect(provider.switchScene('LIVE')).resolves.toEqual({
      ok: false,
      reason: 'scene not found',
    });
  });

  it('connection failure: nothing is listening on the target port -> switchScene fails honestly and quickly', async () => {
    const port = await unusedPort();
    const provider = createObsControlProvider({
      url: `ws://localhost:${port}`,
      connectTimeoutMs: 200,
    });
    const result = await provider.switchScene('LIVE');
    expect(result.ok).toBe(false);
  });

  it('getHealth reports OK after a successful handshake and DOWN (with error) when the connection fails', async () => {
    // OK side: same no-auth pattern as the successful handshake test.
    const { wss, url } = startFakeServer();
    openServers.push(wss);
    wss.on('connection', (socket) => {
      openServerSockets.push(socket);
      socket.send(JSON.stringify({ op: 0, d: { rpcVersion: 1 } }));
      socket.on('message', (data) => {
        const frame = parseFrame(data);
        if (frame.op === 1) socket.send(JSON.stringify({ op: 2, d: { negotiatedRpcVersion: 1 } }));
      });
    });
    const healthyProvider = createObsControlProvider({ url });
    const health = await healthyProvider.getHealth();
    expect(health.status).toBe('OK');
    expect(typeof health.lastSuccessAt).toBe('number');

    // DOWN side: same dead-port setup as the connection-failure test.
    const deadPort = await unusedPort();
    const downProvider = createObsControlProvider({
      url: `ws://localhost:${deadPort}`,
      connectTimeoutMs: 200,
    });
    const downHealth = await downProvider.getHealth();
    expect(downHealth.status).toBe('DOWN');
    expect(typeof downHealth.error).toBe('string');
    expect((downHealth.error ?? '').length).toBeGreaterThan(0);
  });

  it('createOptionalObsControlProvider returns the noop singleton by identity when unconfigured, a real provider when configured', async () => {
    // Unconfigured: exact same object reference as noopObsControlPort (not a copy).
    expect(createOptionalObsControlProvider({})).toBe(noopObsControlPort);
    expect(createOptionalObsControlProvider({ OBS_WEBSOCKET_URL: '' })).toBe(noopObsControlPort);

    // Configured: points at a real fake server and switches scenes end to end.
    const { wss, url } = startFakeServer();
    openServers.push(wss);
    wss.on('connection', (socket) => {
      openServerSockets.push(socket);
      socket.send(JSON.stringify({ op: 0, d: { rpcVersion: 1 } }));
      socket.on('message', (data) => {
        const frame = parseFrame(data);
        if (frame.op === 1) {
          socket.send(JSON.stringify({ op: 2, d: { negotiatedRpcVersion: 1 } }));
        } else if (frame.op === 6) {
          expect(frame.d?.requestData?.sceneName).toBe('BOOT');
          socket.send(
            JSON.stringify({
              op: 7,
              d: { requestId: frame.d?.requestId, requestStatus: { result: true } },
            }),
          );
        }
      });
    });

    const provider = createOptionalObsControlProvider({ OBS_WEBSOCKET_URL: url });
    expect(provider).not.toBe(noopObsControlPort);
    await expect(provider.switchScene('BOOT')).resolves.toEqual({ ok: true });
  });
});
