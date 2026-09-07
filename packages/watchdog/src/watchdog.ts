// The closed three-value set from Dev Spec section 56's L3 tier
// ("Runtime 可恢复" / Runtime recoverable): Renderer crash / Twitch
// disconnect / Runtime process restart. These three named scenarios
// define this Watchdog node's own chartered scope boundary.
export type WatchdogTrigger = 'RENDERER_CRASH' | 'TWITCH_DISCONNECT' | 'RUNTIME_PROCESS_RESTART';

export type WatchdogActionKind = 'ALREADY_HANDLED' | 'NOT_YET_WIRED';

export interface WatchdogDecision {
  trigger: WatchdogTrigger;
  action: WatchdogActionKind;
  detail: string;
}

export function decideWatchdogAction(trigger: WatchdogTrigger): WatchdogDecision {
  switch (trigger) {
    case 'TWITCH_DISCONNECT':
      return {
        trigger,
        action: 'ALREADY_HANDLED',
        detail:
          'platform-twitch already implements exponential-backoff reconnect (DEV-045); no additional watchdog action needed',
      };
    case 'RENDERER_CRASH':
      return {
        trigger,
        action: 'NOT_YET_WIRED',
        detail: 'no renderer crash detection/restart mechanism exists yet',
      };
    case 'RUNTIME_PROCESS_RESTART':
      return {
        trigger,
        action: 'NOT_YET_WIRED',
        detail: 'no production process exists yet that could be restarted',
      };
  }
}
