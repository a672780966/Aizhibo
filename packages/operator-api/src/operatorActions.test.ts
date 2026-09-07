import { describe, expect, it } from 'vitest';
import { ALL_OPERATOR_ACTIONS, isOperatorAction } from './operatorActions.js';

const EXPECTED_ELEVEN = [
  'PAUSE',
  'RESUME',
  'MUTE_HOST',
  'UNMUTE_HOST',
  'CLOSE_INTERACTION',
  'FORCE_RESOLVE',
  'REPLAY_CURRENT_AUDIO',
  'RESTART_SCENE',
  'RESTORE_LKG',
  'SWITCH_OBS_FAILOVER',
  'EMERGENCY_STOP',
] as const;

describe('ALL_OPERATOR_ACTIONS', () => {
  it('contains exactly the eleven Dev Spec section-53 actions (set equality, order-independent)', () => {
    expect(new Set(ALL_OPERATOR_ACTIONS)).toEqual(new Set(EXPECTED_ELEVEN));
    expect(ALL_OPERATOR_ACTIONS).toHaveLength(11);
  });
});

describe('isOperatorAction', () => {
  it('returns true for each of the eleven actions', () => {
    for (const action of EXPECTED_ELEVEN) {
      expect(isOperatorAction(action)).toBe(true);
    }
  });

  it('returns false for made-up strings and the empty string', () => {
    expect(isOperatorAction('PAUSE_ALL')).toBe(false);
    expect(isOperatorAction('')).toBe(false);
  });
});
