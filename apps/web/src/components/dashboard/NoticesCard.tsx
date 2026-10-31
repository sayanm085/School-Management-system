"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useDatabase } from "@/lib/data/repository";
import { formatShortDate } from "@/lib/format";

function audienceLabel(audience: string) {
  if (audience === "all") return "All school";
  if (audience === "teachers") return "Teachers";
  if (audience === "management") return "Management";
  if (audience === "class") return "Class";
  return "Staff";
}

export function NoticesCard({ limit = 3 }: { limit?: number }) {
  const db = useDatabase();
  const notices = db.notices
    .filter((notice) => notice.status === "published")
    .slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notices</CardTitle>
        <Link
          href="/console/notices"
          className="text-[11px] font-semibold text-[var(--blue-text)]"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-0 pt-2">
        <ul className="divide-y divide-[var(--separator)]">
          {notices.map((notice) => (
            <li key={notice.id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[12px] font-semibold">{notice.title}</p>
                <span className="shrink-0 text-[10px] text-[var(--ink-tertiary)]">
                  {formatShortDate(notice.publishedAt)}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--ink-secondary)]">
                {notice.bodyEn}
              </p>
              <Badge
                tone={notice.audience === "all" ? "info" : "neutral"}
                className="mt-2"
              >
                {audienceLabel(notice.audience)}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
