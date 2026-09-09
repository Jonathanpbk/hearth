const MINUTE_MS = 60_000;

const COMPACT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function millisecondsUntilNextMinute(nowMs: number): number {
  const remainder = nowMs % MINUTE_MS;
  return remainder === 0 ? MINUTE_MS : MINUTE_MS - remainder;
}

export function formatCompactDate(date: Date): string {
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  return `${weekday} ${COMPACT_MONTHS[date.getMonth()]} ${date.getDate()}`;
}
