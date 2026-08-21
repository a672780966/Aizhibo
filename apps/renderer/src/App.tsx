import type { PresentationCommand } from '@interactive-story/runtime-kernel';
import { useEffect, useState } from 'react';
import { createRendererClient } from './ws/client.js';
import type { SocketLike } from './ws/client.js';

/** WebSocket 服务端约定的地址（本节点服务端半仅由集成测试验证，无长驻进程）。 */
export const WS_URL = 'ws://localhost:8787';

/** 把浏览器原生 WebSocket 适配成 client.ts 需要的最小注入接口。App 内唯一接触 WebSocket 全局的位置。 */
export function browserSocket(url: string): SocketLike {
  const ws = new WebSocket(url);
  return {
    send: (data: string) => ws.send(data),
    onOpen: (handler: () => void) => {
      ws.onopen = () => handler();
    },
    onMessage: (handler: (data: string) => void) => {
      ws.onmessage = (event: MessageEvent) => handler(String(event.data));
    },
  };
}

/** App 的命令收集逻辑（纯函数，便于无 DOM 测试）：追加一条信封到渲染列表。 */
export function appendCommand(
  commands: PresentationCommand[],
  next: PresentationCommand,
): PresentationCommand[] {
  return [...commands, next];
}

export default function App() {
  const [commands, setCommands] = useState<PresentationCommand[]>([]);
  const [lastSeq, setLastSeq] = useState<number | undefined>(undefined);

  useEffect(() => {
    createRendererClient(browserSocket(WS_URL), {
      onCommand: (envelope) => {
        setLastSeq(envelope.commandSeq);
        setCommands((prev) => appendCommand(prev, envelope));
      },
    });
  }, []);

  return (
    <main>
      <h1>Renderer Shell</h1>
      <p>last commandSeq: {lastSeq ?? '—'}</p>
      <pre>{JSON.stringify(commands, null, 2)}</pre>
    </main>
  );
}
