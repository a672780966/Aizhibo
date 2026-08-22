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
import { pickDialogueLines } from './render/pickDialogueLines.js';
import { clampLineIndex, nextLineIndex } from './render/lineIndex.js';
import { pickInteractionOpen } from './render/pickInteractionOpen.js';
import { pickDiceState } from './render/pickDiceState.js';

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
  const [lineIndex, setLineIndex] = useState(0);

  const dialogue = pickDialogueLines(commands);
  const interaction = pickInteractionOpen(commands);
  const dice = pickDiceState(commands);
  const [countdownMs, setCountdownMs] = useState<number | undefined>(undefined);
  // 骰子 UI 的本地 LOOP 状态：收到 `DICE_INTRO`（且 key=新 seq）时进入"摇骰子动画"视觉
  // 状态，维持到 `DICE_RESULT`（真实数据）到达为止。纯本地视觉过渡，不是等待服务端
  // （真实节奏控制是 DEV-037 的职责，DECISIONS D1）。
  const [rolling, setRolling] = useState(false);

  // 对话内容换新（`key` 变化：新 SCENE_ENTER 或新 RESULT_PLAYING）时重置阅读进度。
  useEffect(() => {
    setLineIndex(0);
  }, [dialogue.key]);

  // 新一批选项（key = 产生它的命令 commandSeq）到来时，从 openDurationMs 重新开始本地倒计时。
  // 倒计时是纯展示反馈，不写入 Runtime Event Log、不参与游戏状态判定，允许使用裸
  // Date.now()/setInterval（任务包 2.5 节；与 DEV-010 getHealth() 同一区分原则）。
  useEffect(() => {
    const duration = interaction?.openDurationMs;
    setCountdownMs(duration ?? 0);
    if (duration === undefined) return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const remaining = duration - (Date.now() - startedAt);
      setCountdownMs(Math.max(remaining, 0));
      if (remaining <= 0) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, [interaction?.key]);

  useEffect(() => {
    setRolling(dice.phase === 'INTRO');
  }, [dice.key, dice.phase]);

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
        @keyframes dice-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .dice-rolling {
          display: inline-block;
          animation: dice-spin 0.6s linear infinite;
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
      {dialogue.lines.length > 0 && (
        <section
          aria-label="dialogue"
          onClick={() => setLineIndex(nextLineIndex(lineIndex, dialogue.lines))}
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '1rem 2rem',
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          <p>{dialogue.lines[clampLineIndex(lineIndex, dialogue.lines)]}</p>
          <span>
            第 {clampLineIndex(lineIndex, dialogue.lines) + 1} / {dialogue.lines.length} 行
          </span>
        </section>
      )}
      {interaction !== undefined && (
        <section
          aria-label="choice ui"
          style={{
            position: 'fixed',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0.5rem 1rem',
            background: 'rgba(0,0,0,0.75)',
            color: '#fff',
          }}
        >
          {interaction.choices.map((choice) => (
            <p key={choice.id} style={{ margin: '0.25rem 0' }}>
              [{choice.id}] {choice.label}
            </p>
          ))}
          {countdownMs !== undefined && (
            <p style={{ margin: '0.25rem 0', opacity: 0.8 }}>
              剩余 {Math.ceil(countdownMs / 1000)} 秒
            </p>
          )}
        </section>
      )}
      {dice.phase !== 'IDLE' && (
        <section
          aria-label="dice ui"
          style={{
            position: 'fixed',
            top: '4.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0.5rem 1rem',
            background: 'rgba(0,0,0,0.75)',
            color: '#fff',
            textAlign: 'center',
          }}
        >
          {rolling ? (
            <span className="dice-rolling" role="status">
              🎲 摇骰中…
            </span>
          ) : (
            dice.results.map((d) => (
              <p
                key={`${d.diceType}-${d.finalValue}-${d.rawValue}`}
                style={{ margin: '0.25rem 0' }}
              >
                {d.diceType}：{d.rawValue}
                {d.modifier > 0
                  ? ` + ${d.modifier}`
                  : d.modifier < 0
                    ? ` - ${Math.abs(d.modifier)}`
                    : ''}
                {' = '}
                {d.finalValue}（{d.quality}）
              </p>
            ))
          )}
        </section>
      )}
      <pre>{JSON.stringify(commands, null, 2)}</pre>
    </main>
  );
}
