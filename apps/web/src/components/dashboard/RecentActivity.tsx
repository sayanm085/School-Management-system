"use client";

import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useDatabase } from "@/lib/data/repository";
import { recentActivity, staffById } from "@/lib/data/selectors";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils/cn";

export function RecentActivity({ limit = 4 }: { limit?: number }) {
  const db = useDatabase();
  const events = recentActivity(db, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <Link
          href="/console/audit"
          className="text-[11px] font-semibold text-[var(--blue-text)]"
        >
          Audit trail
        </Link>
      </CardHeader>
      <CardContent className="p-0 pt-2">
        <ul className="divide-y divide-[var(--separator)]">
          {events.map((event, index) => {
            const actor = staffById(db, event.actorId);
            return (
              <li
                key={event.id}
                className="flex items-start gap-3 px-5 py-3 text-[12px]"
              >
                <span
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    index === 0
                      ? "bg-[var(--blue)]"
                      : "bg-[var(--fill-secondary)]",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{event.summary}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--ink-tertiary)]">
                    {actor?.nameEn ?? "System"} · {formatTime(event.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
