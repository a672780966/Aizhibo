/**
 * HOST / PLATFORM / SAFETY placeholder regions (CR-005 reconstruction).
 *
 * These three regions are pure single-state placeholders so the root machine's
 * parallel states structure is complete. They accept no meaningful events and
 * implement no behaviour — later milestones own them:
 *   - HOST      -> M5 (AI Host)
 *   - PLATFORM  -> M4 (Twitch/libFlow integration)
 *   - SAFETY    -> M6 (failover coordination)
 */

const idlePlaceholder = (id: string) => ({
  initial: 'IDLE' as const,
  states: { IDLE: { description: `${id} placeholder (M4/M5/M6)` } },
});

export const hostRegion = idlePlaceholder('HOST');
export const platformRegion = idlePlaceholder('PLATFORM');
export const safetyRegion = idlePlaceholder('SAFETY');
