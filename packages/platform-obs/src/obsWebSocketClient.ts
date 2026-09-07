// Real OBS WebSocket v5 client (obs-websocket protocol 5.x, public external spec,
// not invented here). Handshake: server Hello (op 0) -> client Identify (op 1) ->
// server Identified (op 2). Optional challenge-response auth:
// base64(sha256(base64(sha256(password + salt)) + challenge)) via node:crypto.
// Scene switch: Request (op 6, SetCurrentProgramScene) correlated back to the
// matching RequestResponse (op 7) through a pending-request map keyed by requestId.
//
// Production code has zero third-party/workspace dependencies: only node:crypto
// and the native Node >=22 global WebSocket. No reconnect logic and no
// scene-switch decision logic — both belong to the future DEV-065 SAFETY region
// (CR-020). A dropped connection makes every later call honestly fail until the
// caller creates a new provider instance.
import { createHash, randomUUID } from 'node:crypto';

import { noopObsControlPort } from './obsControlPort.js';
import type { ObsControlPort, ObsScene, ObsSwitchResult } from './obsControlPort.js';

// Local mirror of packages/shared/src/health.ts's Health contract by value, not by
// import (no workspace dependency, same precedent as DEV-035/040/041; obsControlPort.ts
// keeps an identical private mirror).
type Health = {
  status: 'OK' | 'DEGRADED' | 'DOWN';
  lastSuccessAt?: number;
  latencyMs?: number;
  error?: string;
};

export interface ObsControlProviderConfig {
  url: string;
  password?: string;
  /** 测试注入；默认全局 WebSocket（Node ≥22 原生）。 */
  webSocketImpl?: typeof WebSocket;
  connectTimeoutMs?: number;
  requestTimeoutMs?: number;
}

const DEFAULT_CONNECT_TIMEOUT_MS = 5000;
const DEFAULT_REQUEST_TIMEOUT_MS = 5000;

// obs-websocket v5 auth: base64(sha256(base64(sha256(password + salt)) + challenge)).
function computeAuthenticationString(password: string, salt: string, challenge: string): string {
  const secret = createHash('sha256')
    .update(password + salt)
    .digest('base64');
  return createHash('sha256')
    .update(secret + challenge)
    .digest('base64');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface ObsRequestStatus {
  result: boolean;
  comment?: string;
}

// Small internal connection handle handed back once the handshake completes.
// sendRequest fires an op 6 Request and settles on the op 7 RequestResponse whose
// requestId matches; each request carries its own timeout so no call path can hang.
interface ObsConnection {
  sendRequest(requestType: string, requestData: unknown): Promise<ObsRequestStatus>;
}

interface PendingRequest {
  resolve: (status: ObsRequestStatus) => void;
  reject: (error: unknown) => void;
}

/**
 * Opens the WebSocket, performs the Hello/Identify/Identified handshake (computing the
 * challenge-response authentication string when the server requires it and a password
 * is configured), and resolves with a connection object once Identified arrives.
 * Rejects on timeout/error/close, on an authentication requirement with no password
 * configured (without sending any guessed authentication value), and — being a single
 * shared eager promise — stays permanently rejected thereafter (no reconnection).
 */
function connectAndIdentify(config: ObsControlProviderConfig): Promise<ObsConnection> {
  return new Promise((promiseResolve, promiseReject) => {
    const WebSocketImpl = config.webSocketImpl ?? WebSocket;
    const connectTimeoutMs = config.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
    const requestTimeoutMs = config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    const socket = new WebSocketImpl(config.url);
    const pendingRequests = new Map<string, PendingRequest>();
    // Guards the timeout/error/close handlers so a settled promise is never settled twice.
    let settled = false;
    let connectTimer: ReturnType<typeof setTimeout> | undefined = undefined;

    function clearConnectTimer(): void {
      if (connectTimer !== undefined) {
        clearTimeout(connectTimer);
        connectTimer = undefined;
      }
    }

    function fail(error: Error): void {
      if (settled) return;
      settled = true;
      clearConnectTimer();
      try {
        socket.close();
      } catch {
        // Socket already closing/closed; nothing else to release.
      }
      promiseReject(error);
    }

    // op 0 Hello: reply with Identify, computing the auth string only when the Hello
    // carries an authentication object AND a password is configured. If authentication
    // is required but no password is configured, fail immediately — never guess.
    function handleHello(d: unknown): void {
      const hello = d as {
        rpcVersion?: unknown;
        authentication?: { challenge?: unknown; salt?: unknown };
      };
      const rpcVersion = typeof hello.rpcVersion === 'number' ? hello.rpcVersion : 1;
      const identifyPayload: { rpcVersion: number; authentication?: string } = { rpcVersion };
      const auth = hello.authentication;
      if (auth !== undefined && auth !== null) {
        if (config.password === undefined || config.password === '') {
          fail(new Error('OBS requires authentication but no password configured'));
          return;
        }
        if (typeof auth.challenge !== 'string' || typeof auth.salt !== 'string') {
          fail(new Error('OBS Hello authentication payload malformed'));
          return;
        }
        identifyPayload.authentication = computeAuthenticationString(
          config.password,
          auth.salt,
          auth.challenge,
        );
      }
      socket.send(JSON.stringify({ op: 1, d: identifyPayload }));
    }

    // op 2 Identified: handshake complete — hand the connection object back. From here
    // on, per-request timeouts and op 7 matching drive every later call; a later close
    // (settled already true) is deliberately not turned into a rejection here.
    function handleIdentified(): void {
      if (settled) return;
      settled = true;
      clearConnectTimer();
      promiseResolve({
        sendRequest(requestType: string, requestData: unknown): Promise<ObsRequestStatus> {
          return new Promise((requestResolve, requestReject) => {
            const requestId = randomUUID();
            const timer = setTimeout(() => {
              pendingRequests.delete(requestId);
              requestReject(new Error('OBS WebSocket request timed out'));
            }, requestTimeoutMs);
            pendingRequests.set(requestId, {
              resolve: (status) => {
                clearTimeout(timer);
                requestResolve(status);
              },
              reject: (error) => {
                clearTimeout(timer);
                requestReject(error);
              },
            });
            try {
              socket.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } }));
            } catch (error) {
              pendingRequests.delete(requestId);
              clearTimeout(timer);
              requestReject(error);
            }
          });
        },
      });
    }

    // op 7 RequestResponse: correlate by requestId and settle that pending request with
    // its requestStatus ({ result, comment? }); success/failure branching happens at the
    // switchScene call site. Unknown/stale requestIds (already timed out) are ignored.
    function handleRequestResponse(d: unknown): void {
      const response = d as { requestId?: unknown; requestStatus?: unknown };
      if (typeof response.requestId !== 'string') return;
      const pending = pendingRequests.get(response.requestId);
      if (pending === undefined) return;
      pendingRequests.delete(response.requestId);
      const status = response.requestStatus;
      pending.resolve(
        typeof status === 'object' && status !== null
          ? (status as ObsRequestStatus)
          : { result: false },
      );
    }

    socket.addEventListener('message', (event) => {
      // Text frames arrive as strings; anything else (binary/Blob) is not protocol traffic.
      if (typeof event.data !== 'string') return;
      let frame: unknown;
      try {
        frame = JSON.parse(event.data);
      } catch {
        return; // Silently ignore anything that fails to parse.
      }
      const record = frame as { op?: unknown; d?: unknown };
      const d = record.d;
      if (record.op === 0) handleHello(d);
      else if (record.op === 2) handleIdentified();
      else if (record.op === 7) handleRequestResponse(d);
    });

    socket.addEventListener('error', () => {
      fail(new Error('OBS WebSocket connection error'));
    });

    socket.addEventListener('close', () => {
      // A close after settled (connection object already handed back and in use for
      // requests) must not reject the handshake promise; those requests settle via
      // their own timeouts instead.
      if (settled) return;
      fail(new Error('OBS WebSocket closed before identify completed'));
    });

    connectTimer = setTimeout(() => {
      fail(new Error('OBS WebSocket connect/identify timed out'));
    }, connectTimeoutMs);
  });
}

/**
 * Builds an ObsControlPort from a real OBS WebSocket v5 connection. The connection and
 * handshake start eagerly (exactly once) when this function is called; the resulting
 * shared ready promise is awaited by every switchScene/getHealth call and stays
 * permanently rejected after a failed handshake — this client deliberately implements
 * no reconnection (reconnect policy is entangled with the DEV-065 failover decision).
 */
export function createObsControlProvider(config: ObsControlProviderConfig): ObsControlPort {
  const readyPromise = connectAndIdentify(config);
  return {
    async switchScene(scene: ObsScene): Promise<ObsSwitchResult> {
      try {
        const connection = await readyPromise;
        const requestStatus = await connection.sendRequest('SetCurrentProgramScene', {
          sceneName: scene,
        });
        if (requestStatus.result) return { ok: true };
        return { ok: false, reason: requestStatus.comment ?? 'OBS request failed' };
      } catch (error) {
        return { ok: false, reason: errorMessage(error) };
      }
    },
    async getHealth(): Promise<Health> {
      const started = Date.now();
      try {
        await readyPromise;
        return { status: 'OK', lastSuccessAt: Date.now(), latencyMs: Date.now() - started };
      } catch (error) {
        return { status: 'DOWN', latencyMs: Date.now() - started, error: errorMessage(error) };
      }
    },
  };
}

/**
 * Reads OBS_WEBSOCKET_URL from the environment; when unset/empty, returns the shared
 * noopObsControlPort singleton by reference (identity-preserving, so callers can
 * compare). Otherwise builds a real provider, forwarding OBS_WEBSOCKET_PASSWORD when set.
 */
export function createOptionalObsControlProvider(env: NodeJS.ProcessEnv): ObsControlPort {
  const url = env.OBS_WEBSOCKET_URL;
  if (url === undefined || url === '') return noopObsControlPort;
  const config: ObsControlProviderConfig = { url };
  const password = env.OBS_WEBSOCKET_PASSWORD;
  if (password !== undefined && password !== '') config.password = password;
  return createObsControlProvider(config);
}
