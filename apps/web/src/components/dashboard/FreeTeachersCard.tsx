"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useDemoStore } from "@/lib/data/repository";
import { subjectById } from "@/lib/data/selectors";
import { coverSummary } from "@/lib/domain/timetable";
import { formatCopy, useCopy } from "@/lib/i18n/copy";

export function FreeTeachersCard() {
  const copy = useCopy();
  const locale = useDemoStore((state) => state.locale);
  const db = useDemoStore((state) => state.db);
  const summary = coverSummary(db);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div>
          <CardTitle>{copy.cover.freeTeachersNow}</CardTitle>
          <p className="mt-1 text-[11px] text-[var(--ink-secondary)]">
            {formatCopy(copy.cover.periodOf, {
              period: summary.current.period,
            })}{" "}
            · {summary.current.start}–{summary.current.end}
          </p>
        </div>
        <Badge tone="success">{summary.freeNow.length}</Badge>
      </CardHeader>
      <CardContent className="flex-1 p-0 pt-2">
        <ul
          tabIndex={0}
          aria-label={copy.cover.freeTeachersNow}
          className="max-h-[326px] divide-y divide-[var(--separator)] overflow-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--blue)]"
        >
          {summary.freeNow.map((candidate) => {
            const subject = subjectById(db, candidate.staff.primarySubjectId);
            const subjectName =
              locale === "bn" ? subject?.nameBn : subject?.nameEn;
            const name =
              locale === "bn"
                ? candidate.staff.nameBn
                : candidate.staff.nameEn;
            return (
              <li
                key={candidate.staff.id}
                className="flex items-center gap-3 px-5 py-2.5"
              >
                <Avatar
                  name={candidate.staff.nameEn}
                  src={candidate.staff.avatar}
                  size={32}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold">{name}</p>
                  <p className="truncate text-[9px] text-[var(--ink-secondary)]">
                    {subjectName} ·{" "}
                    {formatCopy(copy.cover.load, {
                      count: candidate.load,
                    })}
                  </p>
                </div>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--green)]" />
                <span className="text-[9px] font-semibold text-[var(--green-text)]">
                  {copy.cover.freeNow}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--separator)] px-5 py-2.5">
        <span className="text-[9px] text-[var(--ink-tertiary)]">
          {copy.cover.freeTeacherHint}
        </span>
        <Link
          href="/console/timetable"
          className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[var(--blue-text)]"
        >
          {copy.cover.viewCover}
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}
