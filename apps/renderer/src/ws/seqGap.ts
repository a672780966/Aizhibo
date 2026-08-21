/**
 * commandSeq 跳空检测（Task Package 2.3 / CR-012）。
 * 首条消息（lastSeq 为 undefined）永远不算跳空；否则 newSeq !== lastSeq + 1 即跳空
 * （跳号、重复、乱序均命中）。客户端收到每条命令调用一次。
 */
export function detectSeqGap(lastSeq: number | undefined, newSeq: number): boolean {
  if (lastSeq === undefined) return false;
  return newSeq !== lastSeq + 1;
}
