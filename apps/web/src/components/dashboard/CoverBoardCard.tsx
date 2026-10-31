"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, UserRoundX } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useDemoStore } from "@/lib/data/repository";
import { sectionById, subjectById } from "@/lib/data/selectors";
import { coverSummary } from "@/lib/domain/timetable";
import { formatCopy, useCopy } from "@/lib/i18n/copy";

export function CoverBoardCard() {
  const copy = useCopy();
  const locale = useDemoStore((state) => state.locale);
  const db = useDemoStore((state) => state.db);
  const summary = coverSummary(db);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div>
          <CardTitle>{copy.cover.coverDesk}</CardTitle>
          <p className="mt-1 text-[11px] text-[var(--ink-secondary)]">
            {copy.cover.liveNow} ·{" "}
            {formatCopy(copy.cover.periodOf, {
              period: summary.current.period,
            })}
          </p>
        </div>
        <StatusPill tone={summary.uncovered.length ? "warning" : "success"}>
          {summary.uncovered.length
            ? copy.cover.needsCover
            : copy.cover.covered}
        </StatusPill>
      </CardHeader>
      <CardContent className="flex-1 p-0 pt-2">
        {summary.uncovered.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-8">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--green-tint)] text-[var(--green-text)]">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[12px] font-semibold">
                {copy.cover.allCovered}
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--ink-secondary)]">
                {copy.cover.noCoverDetail}
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--separator)]">
            {summary.uncovered.slice(0, 3).map((item) => {
              const section = sectionById(db, item.entry.sectionId);
              const subject = subjectById(db, item.entry.subjectId);
              const subjectName =
                locale === "bn" ? subject?.nameBn : subject?.nameEn;
              const absentName =
                locale === "bn"
                  ? item.absentTeacher?.nameBn
                  : item.absentTeacher?.nameEn;
              const suggestionName =
                locale === "bn"
                  ? item.suggestion?.staff.nameBn
                  : item.suggestion?.staff.nameEn;
              return (
                <li
                  key={item.entry.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full bg-[var(--orange-tint)] text-[var(--orange-strong)]">
                    <span className="text-[8px] font-bold">
                      P{item.entry.period}
                    </span>
                    <UserRoundX
                      className="mt-0.5 h-2.5 w-2.5"
                      aria-hidden="true"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold">
                      {(section?.id ?? item.entry.sectionId).replace("-", " ")}{" "}
                      · {subjectName}
                    </p>
                    <p className="truncate text-[10px] text-[var(--ink-secondary)]">
                      {absentName} · {copy.cover.fromLeave}
                    </p>
                    {item.suggestion ? (
                      <p className="mt-0.5 truncate text-[9px] font-medium text-[var(--green-text)] sm:hidden">
                        {copy.cover.suggested}: {suggestionName}
                      </p>
                    ) : null}
                  </div>
                  {item.suggestion ? (
                    <div className="hidden min-w-0 items-center gap-2 sm:flex">
                      <Avatar
                        name={item.suggestion.staff.nameEn}
                        src={item.suggestion.staff.avatar}
                        size={28}
                      />
                      <div className="min-w-0">
                        <p className="max-w-[94px] truncate text-[10px] font-semibold">
                          {suggestionName}
                        </p>
                        <p className="text-[8px] text-[var(--green-text)]">
                          {copy.cover.suggested}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  <Link
                    href="/console/timetable"
                    aria-label={`${copy.cover.assignCover}: ${section?.id ?? ""} ${subjectName ?? ""}`}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-[var(--blue-tint)] px-2.5 text-[10px] font-semibold text-[var(--blue-text)] transition-opacity hover:opacity-80"
                  >
                    {copy.cover.assign}
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--separator)] px-5 py-2.5">
        <span className="text-[10px] text-[var(--ink-secondary)]">
          {formatCopy(copy.cover.freeTeacherCount, {
            count: summary.freeNow.length,
          })}
        </span>
        <Link
          href="/console/timetable"
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--blue-text)]"
        >
          {copy.cover.viewCover}
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}
