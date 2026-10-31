import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

const periods = [
  { time: "07:45", label: "Assembly" },
  { time: "08:00", label: "Bengali" },
  { time: "08:40", label: "English" },
  { time: "09:20", label: "Mathematics" },
  { time: "10:00", label: "Break", muted: true },
  { time: "10:20", label: "Physical Science", current: true },
  { time: "11:05", label: "History" },
  { time: "11:50", label: "Lunch", muted: true },
  { time: "12:30", label: "Geography" },
  { time: "13:15", label: "Games" },
  { time: "14:00", label: "Dismissal", muted: true },
];

export function SchoolDayTimeline() {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>School day</CardTitle>
          <p className="mt-1 text-[11px] text-[var(--ink-secondary)]">
            Saturday · Half day · 31 October 2026
          </p>
        </div>
        <Badge tone="info">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--blue)]" />
          Live
        </Badge>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
          {periods.map((period) => (
            <div
              key={`${period.time}-${period.label}`}
              className={cn(
                "min-w-0 rounded-[12px] px-2.5 py-2.5",
                period.current
                  ? "bg-[var(--blue-strong)] text-white shadow-[0_6px_16px_rgba(0,113,227,0.2)]"
                  : period.muted
                    ? "bg-[var(--fill)] text-[var(--ink-tertiary)]"
                    : "bg-[var(--fill)] text-[var(--ink)]",
              )}
            >
              <p
                className={cn(
                  "font-mono text-[9px] tracking-[0.04em]",
                  period.current ? "text-white" : "text-[var(--ink-tertiary)]",
                )}
              >
                {period.time}
              </p>
              <p className="mt-0.5 text-[11px] leading-[1.3] font-semibold">
                {period.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-[var(--fill)] px-3.5 py-3">
          <p className="text-[12px] text-[var(--ink-secondary)]">
            <span className="font-semibold text-[var(--ink)]">
              P4 · Physical Science
            </span>{" "}
            · Class VIII B · Ananya Sen
          </p>
          <Link
            href="/console/attendance/VIII-B"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--blue-text)]"
          >
            Open register
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
