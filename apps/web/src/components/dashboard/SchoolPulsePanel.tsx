"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import {
  HeroChip,
  HeroPanel,
  HeroStat,
} from "@/components/dashboard/DashboardHero";
import { formatCopy, useCopy } from "@/lib/i18n/copy";
import {
  DEMO_NOW,
  DEMO_PERIOD,
  SATURDAY_PERIODS,
  currentPeriod,
  periodProgress,
} from "@/lib/domain/timetable";
import { cn } from "@/lib/utils/cn";

export function SchoolPulsePanel({
  uncoveredCount,
  freeNowCount,
  gapPeriods,
  nextCoverLabel,
}: {
  uncoveredCount: number;
  freeNowCount: number;
  gapPeriods: number[];
  nextCoverLabel: string | null;
}) {
  const copy = useCopy();
  const period = currentPeriod();
  const progress = periodProgress();

  return (
    <HeroPanel
      title={copy.dashboard.schoolDay}
      badge={<HeroChip tone="live">{copy.dashboard.live}</HeroChip>}
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium text-white/52">
            {formatCopy(copy.cover.periodOf, { period: period.period })} ·{" "}
            {period.start}–{period.end}
          </p>
          <p className="tabular mt-1.5 text-[30px] leading-none font-semibold tracking-[-0.04em]">
            {DEMO_NOW}
          </p>
          <p className="mt-1.5 text-[11px] text-white/56">
            {formatCopy(copy.cover.minutesLeft, {
              minutes: progress.minutesLeft,
            })}{" "}
            · {copy.common.halfDay}
          </p>
        </div>
        <div
          className="relative h-[62px] w-[62px] shrink-0 rounded-full"
          style={{
            background: `conic-gradient(#E8C66A 0 ${progress.percent}%, rgba(255,255,255,0.12) ${progress.percent}% 100%)`,
          }}
          aria-hidden="true"
        >
          <div className="absolute inset-[5px] grid place-items-center rounded-full bg-[#0B3155]">
            <span className="text-[11px] font-semibold text-white/82">
              {progress.percent}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-6 gap-1.5" aria-hidden="true">
        {SATURDAY_PERIODS.map((item) => {
          const active = item.period === DEMO_PERIOD;
          const past = item.period < DEMO_PERIOD;
          const gap = gapPeriods.includes(item.period);
          return (
            <div key={item.period} className="min-w-0">
              <div
                className={cn(
                  "h-1.5 rounded-full",
                  active
                    ? "bg-[#E8C66A]"
                    : gap
                      ? "bg-[var(--orange)]"
                      : past
                        ? "bg-white/30"
                        : "bg-white/12",
                )}
              />
              <p
                className={cn(
                  "mt-1.5 text-center text-[8px] font-semibold",
                  active ? "text-white/80" : "text-white/35",
                )}
              >
                {item.period}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <HeroStat
          value={uncoveredCount}
          label={copy.cover.classesNeedCover}
          accent={uncoveredCount > 0}
        />
        <HeroStat value={freeNowCount} label={copy.cover.freeTeachersNow} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
        <p className="min-w-0 truncate text-[10px] text-white/58">
          {nextCoverLabel ?? copy.cover.noCoverDetail}
        </p>
        <Link
          href="/console/timetable"
          className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#F2D588] transition-opacity hover:opacity-80"
        >
          {copy.cover.viewCover}
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </HeroPanel>
  );
}
