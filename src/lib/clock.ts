const MINUTE_MS = 60_000;

export function millisecondsUntilNextMinute(nowMs: number): number {
  const remainder = nowMs % MINUTE_MS;
  return remainder === 0 ? MINUTE_MS : MINUTE_MS - remainder;
}
