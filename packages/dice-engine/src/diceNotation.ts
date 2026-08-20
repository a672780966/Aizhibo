/**
 * Parse a dice notation string such as "d20", "2d6", "3d8" into a die count
 * and face count. Pattern: `^(\d*)d(\d+)$` (case-insensitive); an omitted
 * count defaults to 1.
 *
 * Defensive (constraint 4): anything that does not match — including a
 * matched-but-degenerate count/sides of 0 — degrades to `{ count: 1, sides: 1 }`
 * ("constantly draw 1"), never throws. See DECISIONS.md D2.
 */
export interface ParsedDiceNotation {
  count: number;
  sides: number;
}

const DEGRADED: ParsedDiceNotation = { count: 1, sides: 1 };

export function parseDiceNotation(diceType: string): ParsedDiceNotation {
  const match = /^(\d*)d(\d+)$/i.exec(diceType.trim());
  if (!match) {
    return DEGRADED;
  }
  const count = match[1] === '' ? 1 : parseInt(match[1] ?? '', 10);
  const sides = parseInt(match[2] ?? '', 10);
  if (count < 1 || sides < 1) {
    return DEGRADED;
  }
  return { count, sides };
}
