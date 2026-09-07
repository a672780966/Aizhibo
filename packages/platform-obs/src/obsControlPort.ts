// Local mirror of packages/shared/src/health.ts's Health contract by value,
// not by import (no workspace dependency, same precedent as DEV-035/040/041).
type Health = {
  status: 'OK' | 'DEGRADED' | 'DOWN';
  lastSuccessAt?: number;
  latencyMs?: number;
  error?: string;
};

// Closed six-scene set from Dev Spec section 49 (OBS Scenes).
export type ObsScene = 'BOOT' | 'LIVE' | 'RECONNECTING' | 'MAINTENANCE' | 'ERROR' | 'ENDING';

export type ObsSwitchResult = { ok: true } | { ok: false; reason: string };

export interface ObsControlPort {
  switchScene(scene: ObsScene): Promise<ObsSwitchResult>;
  getHealth(): Promise<Health>;
}

export const noopObsControlPort: ObsControlPort = {
  switchScene: async () => ({ ok: false, reason: 'no OBS WebSocket connection configured' }),
  getHealth: async () => ({ status: 'DOWN', error: 'no OBS WebSocket connection configured' }),
};
