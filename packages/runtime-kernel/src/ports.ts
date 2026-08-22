/**
 * IO boundaries of the runtime kernel, all expressed as replaceable ports
 * (CR-004). DEV-007 (Chapter Simulator) will reuse this same Runtime
 * statechart and only swap these ports. The default implementations connect to
 * nothing real — the real systems (Renderer/Audio/Twitch) arrive in M2/M3/M4.
 */

export interface Vote {
  viewerId: string;
  choiceId: string;
}

/** Substitute for the bare `Date.now()` so the kernel stays deterministic. */
export interface ClockPort {
  now(): number;
}

export interface PlatformPort {
  onVote(handler: (vote: Vote) => void): void;
  sendChat(msg: string): Promise<void>;
}

/** Command payloads are loosely typed: the concrete command schema is DEV-028's job. */
export interface PresentationPort {
  send(command: unknown): void;
  onRendererHello?(handler: () => void): void;
}

/** Loose command payloads; concrete audio command schema is DEV-030's job. */
export interface AudioPort {
  send(command: unknown): void;
}

/**
 * Result-narration audio source decision (DEV-031). Re-exported from
 * `@interactive-story/audio-engine` (DEV-030's frozen CR-018 chain); the kernel
 * only wires it into `Ports`, never re-implements it.
 */
import type { AudioResolutionPorts } from '@interactive-story/audio-engine';
import { noopAudioResolutionPorts } from '@interactive-story/audio-engine';

export interface Ports {
  clock: ClockPort;
  platform: PlatformPort;
  presentation: PresentationPort;
  audio: AudioPort;
  /** DEV-030's four-level resolution chain ports; defaults report "unavailable". */
  audioResolution: AudioResolutionPorts;
}

/** Real system clock — the only ClockPort that touches the actual time. */
export const systemClockPort: ClockPort = {
  now: () => Date.now(),
};

export const noopPlatformPort: PlatformPort = {
  onVote: () => {},
  sendChat: async () => {},
};

export const noopPresentationPort: PresentationPort = {
  send: () => {},
};

export const noopAudioPort: AudioPort = {
  send: () => {},
};

export const defaultPorts: Ports = {
  clock: systemClockPort,
  platform: noopPlatformPort,
  presentation: noopPresentationPort,
  audio: noopAudioPort,
  audioResolution: noopAudioResolutionPorts,
};
