/**
 * 把 `index` 夹到 `[0, lines.length - 1]`。空数组返回 `0`。`lines` 由调用方保证非空后
 * 才调用（`App.tsx` 仅在 `pickDialogueLines(commands).lines.length > 0` 时渲染对话框）。
 */
export function clampLineIndex(index: number, lines: string[]): number {
  if (lines.length === 0) return 0;
  if (index < 0) return 0;
  const last = lines.length - 1;
  if (index > last) return last;
  return index;
}

/** `index + 1` 后夹到同一范围；已在最后一行时不再前进。空数组返回 `0`。 */
export function nextLineIndex(index: number, lines: string[]): number {
  if (lines.length === 0) return 0;
  return clampLineIndex(index + 1, lines);
}
