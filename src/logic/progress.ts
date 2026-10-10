/**
 * Progress shown while a code is made, as a percentage. QRX doesn't report
 * progress, so the bar is paced to the usual time: it reaches 90% at the
 * expected duration, then creeps towards 98% and never claims to be done
 * before the code actually is.
 */
export function estimateProgress(
  elapsedMs: number,
  expectedMs: number,
): number {
  if (elapsedMs <= 0 || expectedMs <= 0) return 0;
  if (elapsedMs <= expectedMs) {
    return (elapsedMs / expectedMs) * 90;
  }
  const overtime = elapsedMs - expectedMs;
  return 90 + 8 * (1 - Math.exp(-overtime / expectedMs));
}

/** Whether the wait has gone on noticeably longer than usual. */
export function isSlow(elapsedMs: number, expectedMs: number): boolean {
  return elapsedMs > expectedMs * 1.5;
}
