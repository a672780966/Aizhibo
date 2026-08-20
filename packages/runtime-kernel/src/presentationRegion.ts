/**
 * PRESENTATION region — CR-005 reconstruction skeleton (LOADING/READY/FAILOVER).
 * No real Renderer is wired (M2 not built): transitions only move between the
 * states and push placeholder commands through the replaceable PresentationPort.
 * Concrete command schema is DEV-028's job (loosely typed `unknown` here).
 */
export const presentationRegion = {
  initial: 'LOADING' as const,
  states: {
    LOADING: {
      entry: 'presLoading',
      on: {
        'ASSETS.READY': { target: 'READY', actions: 'presReady' },
        'ASSETS.FAIL': { target: 'FAILOVER', actions: 'presFailover' },
      },
    },
    READY: {
      on: {
        'ASSETS.FAIL': { target: 'FAILOVER', actions: 'presFailover' },
      },
    },
    FAILOVER: { description: 'presentation failover skeleton (no real renderer)' },
  },
};
