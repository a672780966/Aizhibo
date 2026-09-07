import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '@interactive-story/persistence';
import { createOperatorAuthProvider, noopOperatorAuthPort } from './operatorAuth.js';
import type { HostPermissionPort } from './operatorDispatch.js';
import { createOperatorHttpServer } from './operatorHttpServer.js';

const TOKEN = 'test-secret-token';

function makeDeps() {
  const db = openDatabase(':memory:');
  const hostPermission: HostPermissionPort = {
    setPermission() {
      // fake：记录到 db 无关的本地副作用即可，本文件通过 HTTP 层断言
    },
  };
  return {
    db,
    deps: {
      db,
      sessionId: 's-http-1',
      chapterId: 'ch-http-1',
      chapterRootDir: 'unused-in-http-tests',
      seed: 'http-test',
      hostPermission,
    },
  };
}

function startServer(config: Parameters<typeof createOperatorHttpServer>[0]) {
  const server = createOperatorHttpServer(config);
  return new Promise<{ server: typeof server; url: string }>((resolve) => {
    server.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, url: `http://localhost:${port}` });
    });
  });
}

async function post(
  url: string,
  init: { body?: string; headers?: Record<string, string>; method?: string } = {},
): Promise<Response> {
  const requestInit: RequestInit = {
    method: init.method ?? 'POST',
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  };
  if (init.body !== undefined) requestInit.body = init.body;
  return fetch(`${url}/operator/action`, requestInit);
}

describe('createOperatorHttpServer（真实 node:http server + fetch 集成）', () => {
  const servers: Array<{ close(): void }> = [];

  afterEach(() => {
    for (const server of servers.splice(0)) server.close();
  });

  it('valid Bearer token + valid action body → HTTP 200 with OperatorActionResult shape', async () => {
    const { deps } = makeDeps();
    const auth = createOperatorAuthProvider(TOKEN);
    const { server, url } = await startServer({ auth, dispatchDeps: deps });
    servers.push(server);

    const response = await post(url, {
      headers: { authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ action: 'MUTE_HOST' }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; action: string; detail: string };
    expect(body).toMatchObject({ ok: true, action: 'MUTE_HOST' });
    expect(typeof body.detail).toBe('string');
  });

  it('missing Authorization header → HTTP 401', async () => {
    const { deps } = makeDeps();
    const { server, url } = await startServer({
      auth: createOperatorAuthProvider(TOKEN),
      dispatchDeps: deps,
    });
    servers.push(server);

    const response = await post(url, { body: JSON.stringify({ action: 'MUTE_HOST' }) });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, reason: 'missing operator token' });
  });

  it('incorrect Bearer token → HTTP 401', async () => {
    const { deps } = makeDeps();
    const { server, url } = await startServer({
      auth: createOperatorAuthProvider(TOKEN),
      dispatchDeps: deps,
    });
    servers.push(server);

    const response = await post(url, {
      headers: { authorization: 'Bearer wrong-token' },
      body: JSON.stringify({ action: 'MUTE_HOST' }),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, reason: 'invalid operator token' });
  });

  it('noopOperatorAuthPort (token not configured) → any request is HTTP 401 (default deny)', async () => {
    const { deps } = makeDeps();
    const { server, url } = await startServer({ auth: noopOperatorAuthPort, dispatchDeps: deps });
    servers.push(server);

    const response = await post(url, {
      headers: { authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ action: 'MUTE_HOST' }),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      reason: 'no OPERATOR_API_TOKEN configured',
    });
  });

  it('valid token but unknown action string → HTTP 400', async () => {
    const { deps } = makeDeps();
    const { server, url } = await startServer({
      auth: createOperatorAuthProvider(TOKEN),
      dispatchDeps: deps,
    });
    servers.push(server);

    const response = await post(url, {
      headers: { authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ action: 'NOT_A_REAL_ACTION' }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, reason: 'unknown or missing action' });
  });

  it('valid token but body is not valid JSON → HTTP 400', async () => {
    const { deps } = makeDeps();
    const { server, url } = await startServer({
      auth: createOperatorAuthProvider(TOKEN),
      dispatchDeps: deps,
    });
    servers.push(server);

    const response = await post(url, {
      headers: { authorization: `Bearer ${TOKEN}` },
      body: 'not json',
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, reason: 'invalid JSON body' });
  });

  it('GET request to /operator/action (wrong method) → HTTP 404', async () => {
    const { deps } = makeDeps();
    const { server, url } = await startServer({
      auth: createOperatorAuthProvider(TOKEN),
      dispatchDeps: deps,
    });
    servers.push(server);

    const response = await post(url, {
      method: 'GET',
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, reason: 'not found' });
  });

  it('a stubbed action (EMERGENCY_STOP) still reaches dispatch: HTTP 200 with ok:false in the body', async () => {
    const { deps } = makeDeps();
    const { server, url } = await startServer({
      auth: createOperatorAuthProvider(TOKEN),
      dispatchDeps: deps,
    });
    servers.push(server);

    const response = await post(url, {
      headers: { authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ action: 'EMERGENCY_STOP' }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; action: string; detail: string };
    expect(body).toMatchObject({ ok: false, action: 'EMERGENCY_STOP' });
    expect(body.detail).toContain('SAFETY');
  });
});
