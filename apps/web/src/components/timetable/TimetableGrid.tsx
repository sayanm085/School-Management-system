"use client";

import { Check, UserRoundX } from "lucide-react";

import { useDemoStore } from "@/lib/data/repository";
import { staffById, subjectById } from "@/lib/data/selectors";
import {
  DEMO_DAY,
  DEMO_PERIOD,
  SATURDAY_PERIODS,
  isTeacherAbsent,
  substitutionForPeriod,
  uncoveredPeriods,
  type UncoveredPeriod,
} from "@/lib/domain/timetable";
import { formatCopy, useCopy } from "@/lib/i18n/copy";
import type { Database } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export function TimetableGrid({
  db,
  onSelectUncovered,
  highlightTeacherId,
}: {
  db: Database;
  onSelectUncovered: (item: UncoveredPeriod) => void;
  highlightTeacherId?: string | null;
}) {
  const copy = useCopy();
  const locale = useDemoStore((state) => state.locale);
  const uncovered = uncoveredPeriods(db);
  const uncoveredByEntry = new Map(
    uncovered.map((item) => [item.entry.id, item]),
  );
  const sections = db.sections;
  const entries = db.timetable.filter((entry) => entry.day === DEMO_DAY);

  return (
    <>
      <div
        role="region"
        aria-label={copy.cover.todayGrid}
        tabIndex={0}
        className="overflow-x-auto rounded-b-[var(--radius-lg)] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--blue)]"
      >
        <table className="w-full min-w-[920px] border-separate border-spacing-0">
          <caption className="sr-only">
            {copy.cover.todayGrid} · {copy.cover.todayGridSubtitle}
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-20 w-[120px] border-b border-r border-[var(--separator)] bg-[var(--surface)] px-3 py-2.5 text-left text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-tertiary)]"
              >
                {copy.cover.class}
              </th>
              {SATURDAY_PERIODS.map((period) => {
                const current = period.period === DEMO_PERIOD;
                return (
                  <th
                    key={period.period}
                    scope="col"
                    className={cn(
                      "border-b border-r border-[var(--separator)] px-2 py-2 text-left last:border-r-0",
                      current && "bg-[var(--blue-tint)]",
                    )}
                  >
                    <span
                      className={cn(
                        "block text-[10px] font-semibold",
                        current
                          ? "text-[var(--blue-text)]"
                          : "text-[var(--ink)]",
                      )}
                    >
                      {formatCopy(copy.cover.periodShort, {
                        period: period.period,
                      })}
                    </span>
                    <span className="mt-0.5 block text-[9px] font-medium text-[var(--ink-tertiary)]">
                      {period.start}–{period.end}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => {
              const sectionLabel = section.id.replace("-", " ");
              return (
                <tr key={section.id}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-b border-r border-[var(--separator)] bg-[var(--surface)] px-3 py-2.5 text-left align-top"
                  >
                    <span className="block text-[12px] font-semibold">
                      {sectionLabel}
                    </span>
                    <span className="mt-0.5 block text-[9px] font-medium text-[var(--ink-tertiary)]">
                      {section.room}
                    </span>
                  </th>
                  {SATURDAY_PERIODS.map((period) => {
                    const entry = entries.find(
                      (item) =>
                        item.sectionId === section.id &&
                        item.period === period.period,
                    );
                    const uncoveredItem = entry
                      ? uncoveredByEntry.get(entry.id)
                      : null;
                    const substitution = entry
                      ? substitutionForPeriod(
                          db,
                          DEMO_DAY,
                          period.period,
                          section.id,
                        )
                      : null;
                    const absent = entry
                      ? isTeacherAbsent(db, entry.teacherId)
                      : false;
                    const subject = entry
                      ? subjectById(db, entry.subjectId)
                      : null;
                    const teacher = entry
                      ? staffById(db, entry.teacherId)
                      : null;
                    const substitute = substitution
                      ? staffById(db, substitution.substituteTeacherId)
                      : null;
                    const own =
                      entry?.teacherId === highlightTeacherId ||
                      substitution?.substituteTeacherId === highlightTeacherId;
                    const subjectName =
                      locale === "bn" ? subject?.nameBn : subject?.nameEn;
                    const teacherName =
                      locale === "bn" ? teacher?.nameBn : teacher?.nameEn;
                    const substituteName =
                      locale === "bn" ? substitute?.nameBn : substitute?.nameEn;

                    if (!entry) {
                      return (
                        <td
                          key={period.period}
                          className={cn(
                            "border-b border-r border-[var(--separator)] p-1.5 align-top last:border-r-0",
                          )}
                        >
                          <div className="flex h-[58px] items-center justify-center text-[10px] text-[var(--ink-tertiary)]">
                            —
                          </div>
                        </td>
                      );
                    }

                    if (uncoveredItem) {
                      return (
                        <td
                          key={period.period}
                          className={cn(
                            "border-b border-r border-[var(--separator)] p-1.5 align-top last:border-r-0",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onSelectUncovered(uncoveredItem)}
                            aria-label={`${copy.cover.assignCover}: ${sectionLabel}, ${formatCopy(copy.cover.periodShort, { period: period.period })}, ${subjectName ?? ""}`}
                            className="flex h-[58px] w-full flex-col justify-between rounded-[9px] bg-[var(--orange-tint)] px-2 py-1.5 text-left ring-1 ring-inset ring-[var(--orange)]/25 transition-[filter,transform] duration-150 hover:brightness-[0.98] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange-strong)]"
                          >
                            <span className="flex items-center justify-between gap-1">
                              <span className="text-[8px] font-bold tracking-[0.04em] text-[var(--orange-strong)]">
                                {subject?.code}
                              </span>
                              <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[7px] font-bold text-[var(--orange-strong)]">
                                {copy.cover.needsCover}
                              </span>
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[10px] font-semibold text-[var(--ink)]">
                                {subjectName}
                              </span>
                              <span className="mt-0.5 flex items-center gap-1 truncate text-[8px] font-medium text-[var(--orange-strong)]">
                                <UserRoundX
                                  className="h-2.5 w-2.5 shrink-0"
                                  aria-hidden="true"
                                />
                                {teacherName}
                              </span>
                            </span>
                          </button>
                        </td>
                      );
                    }

                    if (substitution && absent) {
                      return (
                        <td
                          key={period.period}
                          className={cn(
                            "border-b border-r border-[var(--separator)] p-1.5 align-top last:border-r-0",
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-[58px] flex-col justify-between rounded-[9px] bg-[var(--green-tint)] px-2 py-1.5 ring-1 ring-inset ring-[var(--green)]/20",
                              own && "ring-2 ring-[var(--green-strong)]",
                            )}
                            title={`${sectionLabel} · ${subjectName} · ${substituteName}`}
                          >
                            <span className="flex items-center justify-between gap-1">
                              <span className="text-[8px] font-bold tracking-[0.04em] text-[var(--green-text)]">
                                {subject?.code}
                              </span>
                              <Check
                                className="h-2.5 w-2.5 text-[var(--green-text)]"
                                aria-hidden="true"
                              />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[10px] font-semibold text-[var(--ink)]">
                                {subjectName}
                              </span>
                              <span className="mt-0.5 block truncate text-[8px] font-medium text-[var(--green-text)]">
                                {substituteName} · {copy.cover.covering}
                              </span>
                            </span>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={period.period}
                        className={cn(
                          "border-b border-r border-[var(--separator)] p-1.5 align-top last:border-r-0",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-[58px] flex-col justify-between rounded-[9px] px-2 py-1.5",
                            own
                              ? "bg-[var(--blue-tint)] ring-1 ring-inset ring-[var(--blue)]/20"
                              : "bg-[var(--fill)]",
                          )}
                          title={`${sectionLabel} · ${subjectName} · ${teacherName}`}
                        >
                          <span
                            className={cn(
                              "text-[8px] font-bold tracking-[0.04em]",
                              own
                                ? "text-[var(--blue-text)]"
                                : "text-[var(--ink-tertiary)]",
                            )}
                          >
                            {subject?.code}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[10px] font-semibold">
                              {subjectName}
                            </span>
                            <span
                              className={cn(
                                "mt-0.5 block truncate text-[8px] font-medium",
                                own
                                  ? "text-[var(--blue-text)]"
                                  : "text-[var(--ink-secondary)]",
                              )}
                            >
                              {teacherName}
                            </span>
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--separator)] px-4 py-3 text-[9px] font-medium text-[var(--ink-secondary)] sm:px-5">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[3px] bg-[var(--orange)]" />
          {copy.cover.needsCover}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[3px] bg-[var(--green)]" />
          {copy.cover.covered}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[3px] bg-[var(--blue)]" />
          {copy.cover.myTimetable}
        </span>
        <span className="ml-auto hidden text-[var(--ink-tertiary)] sm:inline">
          {copy.cover.todayGridSubtitle}
        </span>
      </div>
    </>
  );
}
