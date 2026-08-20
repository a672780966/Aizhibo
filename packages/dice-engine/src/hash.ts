/**
 * FNV-1a 32-bit hash. Deterministic pure function: same input always yields
 * the same unsigned 32-bit integer in [0, 2^32). No state, no randomness —
 * this is the deterministic basis for all dice draws in this package.
 *
 * Reference: Fowler–Noll–Vo hash, FNV-1a variant with 32-bit offset basis
 * 0x811c9dc5 and prime 0x01000193. `Math.imul` keeps the multiply inside
 * 32-bit arithmetic; the final `>>> 0` normalizes to an unsigned result.
 */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
