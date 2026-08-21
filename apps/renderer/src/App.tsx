import type {
  PresentationCommand,
  ResolvedCharacterPlacement,
  ResolvedVisualLayer,
} from '@interactive-story/runtime-kernel';
import { useEffect, useState } from 'react';
import { createRendererClient } from './ws/client.js';
import type { SocketLike } from './ws/client.js';
import { composeLayers } from './render/composeLayers.js';
import type { RenderableLayer } from './render/composeLayers.js';
import { composeCharacters } from './render/composeCharacters.js';
import type { RenderableCharacter } from './render/composeCharacters.js';

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

/**
 * 取最近一条 `SCENE_ENTER` 命令里的 visual layers 并合成渲染层（纯函数，便于无 DOM
 * 测试）。Runtime（`onSceneEnter`）已把 `visualSceneId → layers → file` 解析完毕随命令
 * 下发；这里只做布局合成，不读任何章节文件（Dev Spec §35）。没有 SCENE_ENTER 命令时
 * 返回空数组。
 */
export function pickSceneLayers(commands: PresentationCommand[]): RenderableLayer[] {
  for (let i = commands.length - 1; i >= 0; i -= 1) {
    const command = commands[i]?.command;
    if (typeof command !== 'object' || command === null) continue;
    const candidate = command as { kind?: unknown; layers?: unknown };
    if (candidate.kind !== 'SCENE_ENTER') continue;
    if (!Array.isArray(candidate.layers)) continue;
    return composeLayers(candidate.layers as ResolvedVisualLayer[]);
  }
  return [];
}

/**
 * 取最近一条 `SCENE_ENTER` 命令里的 characters 并合成渲染角色（纯函数，便于无 DOM
 * 测试）。Runtime（`onSceneEnter` CR #2）已把三跳引用解析成 `ResolvedCharacterPlacement`
 * 随命令下发；这里只做五档 slot 定位与呼吸微动的合成，不读任何章节文件（Dev Spec §35）。
 * 没有 SCENE_ENTER 命令或 characters 非法时返回空数组。
 */
export function pickSceneCharacters(commands: PresentationCommand[]): RenderableCharacter[] {
  for (let i = commands.length - 1; i >= 0; i -= 1) {
    const command = commands[i]?.command;
    if (typeof command !== 'object' || command === null) continue;
    const candidate = command as { kind?: unknown; characters?: unknown };
    if (candidate.kind !== 'SCENE_ENTER') continue;
    if (!Array.isArray(candidate.characters)) continue;
    return composeCharacters(candidate.characters as ResolvedCharacterPlacement[]);
  }
  return [];
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
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        .character-animated {
          animation: breathe 3s ease-in-out infinite;
        }
      `}</style>
      <section aria-label="scene layers" style={{ position: 'relative' }}>
        {pickSceneLayers(commands).map((layer) => (
          <img
            key={layer.assetId}
            src={layer.file}
            alt={layer.assetId}
            style={{ position: 'absolute', zIndex: layer.zIndex }}
          />
        ))}
        {pickSceneCharacters(commands).map((character) => (
          <img
            key={character.characterId}
            src={character.file}
            alt={character.characterId}
            className={character.animated ? 'character-animated' : undefined}
            style={{
              position: 'absolute',
              left: `${character.leftPercent}%`,
              transform: 'translateX(-50%)',
              // 角色固定高于所有背景层（DECISIONS D2）
              zIndex: 1000,
            }}
          />
        ))}
      </section>
      <pre>{JSON.stringify(commands, null, 2)}</pre>
    </main>
  );
}
