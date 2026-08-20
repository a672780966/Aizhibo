import type { WorldState } from '@interactive-story/chapter-schema';

/**
 * The full, private runtime snapshot shape. Intentionally NOT exported from
 * the package: consumers must not reach into `world.flags.xxx` etc. directly
 * (CR-008 visibility partition — see DECISIONS D3).
 */
export interface InternalSnapshot {
  world: WorldState;
  sequenceCounter: number;
  firedRuleIds: string[];
  storyPhase: string;
  interactionPhase: string;
}

/**
 * Opaque, branded runtime snapshot type — the only snapshot type the package
 * exports. Structurally incompatible with `InternalSnapshot`, so external code
 * cannot field-access it; all reads go through the named accessors below
 * (DECISIONS D3).
 */
export type RuntimeSnapshot = { readonly __brand: 'RuntimeSnapshot' };

/** Brand an internal snapshot (used inside the package). */
export function wrapSnapshot(internal: InternalSnapshot): RuntimeSnapshot {
  return internal as unknown as RuntimeSnapshot;
}

/** Unbrand back to the internal shape (internal use only — NOT exported from index). */
export function unwrapSnapshot(snapshot: RuntimeSnapshot): InternalSnapshot {
  return snapshot as unknown as InternalSnapshot;
}

export function getStoryPhase(snapshot: RuntimeSnapshot): string {
  return unwrapSnapshot(snapshot).storyPhase;
}

export function getInteractionPhase(snapshot: RuntimeSnapshot): string {
  return unwrapSnapshot(snapshot).interactionPhase;
}

export function getSequenceNumber(snapshot: RuntimeSnapshot): number {
  return unwrapSnapshot(snapshot).sequenceCounter;
}
