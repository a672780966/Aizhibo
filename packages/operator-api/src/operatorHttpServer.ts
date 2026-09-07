/**
 * Operator Dispatch — 全部 11 个 operator action 的语义分发与"无论成败
 * 都落一条 OPERATOR_OVERRIDE 审计事件"的不变式。
 *
 * 单一路由：POST /operator/action，请求头 Authorization: Bearer <token>，
 * JSON body { "action": "<OperatorAction>" }。不做 11 个 action 各自独立
 * 路径的路由表——一个路由 + body 里的 action 字段足够表达全部动作。
 *
 * 鉴权失败 → 401；未知/缺失 action 或非法 JSON → 400；方法/路径不对 →
 * 404；成功走到 dispatchOperatorAction 后统一 200（无论内部 ok 真假——
 * HTTP 层面"请求处理成功"与"action 语义上是否真的生效"是两个独立判断，
 * 后者体现在响应体 ok 字段里，不体现在 HTTP 状态码里）。
 *
 * 用 Node 内置 node:http，零第三方依赖。
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { isOperatorAction } from './operatorActions.js';
import type { OperatorAuthPort } from './operatorAuth.js';
import { dispatchOperatorAction, type OperatorDispatchDeps } from './operatorDispatch.js';

export interface OperatorHttpServerConfig {
  auth: OperatorAuthPort;
  dispatchDeps: OperatorDispatchDeps;
}

function extractBearerToken(header: string | undefined): string | undefined {
  if (header === undefined) return undefined;
  const match = /^Bearer (.+)$/.exec(header);
  return match?.[1];
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function isRequestBody(value: unknown): value is { action: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).action === 'string'
  );
}

async function handleRequest(
  config: OperatorHttpServerConfig,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'POST' || req.url !== '/operator/action') {
    sendJson(res, 404, { ok: false, reason: 'not found' });
    return;
  }

  const authResult = config.auth.authenticate(extractBearerToken(req.headers.authorization));
  if (!authResult.ok) {
    sendJson(res, 401, { ok: false, reason: authResult.reason });
    return;
  }

  let body: unknown;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    sendJson(res, 400, { ok: false, reason: 'invalid JSON body' });
    return;
  }

  const action = isRequestBody(body) ? body.action : undefined;
  if (action === undefined || !isOperatorAction(action)) {
    sendJson(res, 400, { ok: false, reason: 'unknown or missing action' });
    return;
  }

  sendJson(res, 200, dispatchOperatorAction(config.dispatchDeps, action));
}

export function createOperatorHttpServer(config: OperatorHttpServerConfig): Server {
  return createServer((req, res) => {
    void handleRequest(config, req, res);
  });
}
