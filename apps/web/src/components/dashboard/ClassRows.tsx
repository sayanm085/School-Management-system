"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { StatusPill } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useDatabase } from "@/lib/data/repository";
import { classesInSession } from "@/lib/data/selectors";

export function ClassRows() {
  const db = useDatabase();
  const rows = classesInSession(db);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classes in session</CardTitle>
        <Link
          href="/console/attendance"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--blue-text)]"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="p-0 pt-2">
        <ul className="divide-y divide-[var(--separator)]">
          {rows.map((row) => {
            const total = row.present + row.absent;
            const ratio = total === 0 ? 0 : (row.present / total) * 100;
            return (
              <li key={row.section.id}>
                <Link
                  href={`/console/attendance/${row.section.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-[var(--fill)]"
                >
                  <span className="w-12 shrink-0 text-[13px] font-semibold">
                    {row.section.id}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--ink-secondary)]">
                    {row.teacher?.nameEn ?? "Class teacher not assigned"}
                  </span>
                  <span className="hidden w-24 sm:block">
                    <span className="block h-1.5 overflow-hidden rounded-full bg-[var(--fill)]">
                      <span
                        className="block h-full rounded-full bg-[var(--green)]"
                        style={{ width: `${ratio}%` }}
                      />
                    </span>
                  </span>
                  <span className="tabular hidden w-[86px] text-right text-[11px] text-[var(--ink-secondary)] sm:block">
                    {row.marked
                      ? `${row.present} present / ${row.absent} absent`
                      : "Not marked"}
                  </span>
                  <StatusPill tone={row.marked ? "success" : "warning"}>
                    {row.marked ? "Marked" : "Pending"}
                  </StatusPill>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
