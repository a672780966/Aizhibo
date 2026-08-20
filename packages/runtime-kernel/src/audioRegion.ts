/**
 * AUDIO region — CR-005 reconstruction skeleton (IDLE/PREPARING/PLAYING_STORY/
 * PLAYING_HOST/DUCKED/ERROR). No real audio system is wired (M3 not built):
 * transitions push placeholder commands through the replaceable AudioPort.
 * Concrete command schema is DEV-030's job (loosely typed `unknown` here).
 */
export const audioRegion = {
  initial: 'IDLE' as const,
  states: {
    IDLE: {
      on: {
        'AUDIO.PREPARE': { target: 'PREPARING', actions: 'audioPreparing' },
      },
    },
    PREPARING: {
      on: {
        'AUDIO.READY': { target: 'PLAYING_STORY', actions: 'audioPlayStory' },
        'AUDIO.FAIL': { target: 'ERROR', actions: 'audioError' },
      },
    },
    PLAYING_STORY: {
      on: {
        'AUDIO.DUCK': { target: 'DUCKED', actions: 'audioDuck' },
        'AUDIO.STOP': { target: 'IDLE', actions: 'audioStop' },
        'AUDIO.PLAY_HOST': { target: 'PLAYING_HOST', actions: 'audioPlayHost' },
      },
    },
    PLAYING_HOST: {
      on: {
        'AUDIO.STOP': { target: 'IDLE', actions: 'audioStop' },
      },
    },
    DUCKED: {
      on: {
        'AUDIO.UNDUCK': { target: 'PLAYING_STORY', actions: 'audioPlayStory' },
        'AUDIO.STOP': { target: 'IDLE', actions: 'audioStop' },
      },
    },
    ERROR: { description: 'audio error skeleton (no real audio system)' },
  },
};
