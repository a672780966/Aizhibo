import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createRuntimeMachine } from './machine.js';
import { instantClock } from './virtualPorts.js';
import { type PresentationCommand, wrapPresentationPort } from './presentationCommand.js';

const fixture = fileURLToPath(
  new URL('../../chapter-compiler/test-fixtures/valid-minimal', import.meta.url),
);

describe('wrapPresentationPort', () => {
  it('sequences commands and folds known command kinds into state', () => {
    const sent: PresentationCommand[] = [];
    const port = wrapPresentationPort({
      send: (command) => sent.push(command as PresentationCommand),
    });

    port.send({ kind: 'SCENE_ENTER', sceneId: 'scene-start' });
    port.send({ kind: 'PRES_READY' });
    port.send({ kind: 'RESULT_PLAYING', text: '结果' });
    port.send({ kind: 'UNKNOWN', sceneId: 'ignored' });
    port.send({ kind: 'PRES_FAILOVER' });

    expect(sent.map((entry) => entry.commandSeq)).toEqual([1, 2, 3, 4, 5]);
    expect(port.getState()).toEqual({
      phase: 'FAILOVER',
      currentSceneId: 'scene-start',
      lastResultText: '结果',
    });
  });

  it('uses one continuous sequence for renderer resync', () => {
    const sent: PresentationCommand[] = [];
    let hello: (() => void) | undefined;
    const port = wrapPresentationPort({
      send: (command) => sent.push(command as PresentationCommand),
      onRendererHello: (handler) => {
        hello = handler;
      },
    });

    port.send({ kind: 'SCENE_ENTER', sceneId: 'scene-start' });
    port.send({ kind: 'PRES_READY' });
    hello?.();

    expect(sent).toHaveLength(3);
    expect(sent[2]).toEqual({
      commandSeq: 3,
      command: { kind: 'PRESENTATION_RESYNC', state: port.getState() },
    });
  });

  it('works when the inner port has no renderer callback', () => {
    const sent: PresentationCommand[] = [];
    const port = wrapPresentationPort({
      send: (command) => sent.push(command as PresentationCommand),
    });

    expect(() => port.send({ kind: 'PRES_LOADING' })).not.toThrow();
    expect(sent[0]?.commandSeq).toBe(1);
  });

  it('captures presentation state from a real runtime actor', () => {
    const sent: PresentationCommand[] = [];
    const port = wrapPresentationPort({
      send: (command) => sent.push(command as PresentationCommand),
    });
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 'dev-012-e2e',
      clock: instantClock,
      ports: { presentation: port },
    });

    actor.send({ type: 'BOOT' });
    expect(port.getState().currentSceneId).toBe('scene-start');

    actor.send({ type: 'STORY.DONE' });
    actor.send({ type: 'INTERACTION.OPEN' });
    actor.send({ type: 'VOTE', viewerId: 'viewer-1', choiceId: 'A' });
    actor.send({ type: 'LOCK' });
    expect(port.getState().lastResultText).toBeTypeOf('string');
    expect(sent.every((entry) => entry.commandSeq > 0)).toBe(true);
  });

  it('同连接连续两次 RESYNC 请求幂等：commandSeq 各自递增、state 内容相同', () => {
    const sent: PresentationCommand[] = [];
    let hello: (() => void) | undefined;
    const port = wrapPresentationPort({
      send: (command) => sent.push(command as PresentationCommand),
      onRendererHello: (handler) => {
        hello = handler;
      },
    });

    port.send({ kind: 'SCENE_ENTER', sceneId: 'scene-start' });
    port.send({ kind: 'PRES_READY' });

    // 同一连接、不重连，连续两次 RESYNC 请求（中间无任何新的 send）
    hello?.();
    hello?.();

    const resyncs = sent.filter(
      (entry) => (entry.command as { kind?: string }).kind === 'PRESENTATION_RESYNC',
    );
    expect(resyncs).toHaveLength(2);
    expect(resyncs.map((entry) => entry.commandSeq)).toEqual([3, 4]); // 各自递增，不重复、不跳号
    expect(resyncs[0]?.command).toEqual(resyncs[1]?.command); // state 内容完全相同（折叠状态未变）
    expect(resyncs[0]?.command).toEqual({
      kind: 'PRESENTATION_RESYNC',
      state: { phase: 'READY', currentSceneId: 'scene-start' },
    });
  });
});
