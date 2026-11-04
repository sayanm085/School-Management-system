// apps/api/src/common/time/clock.ts
const ZONE = "Asia/Kolkata";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const yearFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  year: "numeric",
});

export function businessToday(now: Date = new Date()): string {
  return dayFormatter.format(now);
}

export function businessYear(now: Date = new Date()): number {
  return Number(yearFormatter.format(now));
}
