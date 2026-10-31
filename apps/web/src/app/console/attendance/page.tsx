"use client";

import { CalendarCheck, ChevronRight, Users } from "lucide-react";
import Link from "next/link";

import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { can } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import {
  classTeacherFor,
  staffById,
  teacherSections,
  todayRecordsForSection,
} from "@/lib/data/selectors";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils/cn";

export default function AttendancePage() {
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const staff = staffById(db, session?.staffId);

  if (!session || !can(session.role, "attendance.view")) {
    return <PermissionDenied />;
  }

  const sections =
    session.role === "teacher" ? teacherSections(db, staff) : db.sections;
  const rows = sections.map((section) => {
    const records = todayRecordsForSection(db, section.id);
    const present = records.filter(
      (record) => record.status === "present" || record.status === "late",
    ).length;
    const absent = records.filter(
      (record) => record.status === "absent",
    ).length;
    return {
      section,
      teacher: classTeacherFor(db, section.id),
      present,
      absent,
      marked: records.length > 0,
    };
  });
  const submitted = rows.filter((row) => row.marked).length;

  if (sections.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No sections assigned"
        description="Your account has no class sections yet. Ask the Headmaster to assign a class."
        className="mt-8"
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={`${formatDate("2026-10-31")} · Half day`}
        title="Attendance"
        subtitle={`${submitted} of ${rows.length} registers submitted for today. Open a class to mark or review the register.`}
        actions={
          can(session.role, "staff_attendance.view") ? (
            <Button asChild variant="secondary">
              <Link href="/console/staff-attendance">
                <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                Staff attendance
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <Link key={row.section.id} href={`/console/attendance/${row.section.id}`}>
            <Card
              className={cn(
                "h-full cursor-pointer p-4 transition-colors duration-150 hover:bg-[var(--fill)]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[20px] font-semibold tracking-[-0.02em]">
                    {row.section.id}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-secondary)]">
                    {row.teacher?.nameEn ?? "Class teacher not assigned"}
                  </p>
                </div>
                <StatusPill tone={row.marked ? "success" : "warning"}>
                  {row.marked ? "Submitted" : "Not started"}
                </StatusPill>
              </div>
              <div className="mt-5 flex items-end justify-between gap-3">
                <div className="flex items-center gap-4 text-[11px]">
                  <span>
                    <span className="tabular block text-[18px] font-semibold text-[var(--green-text)]">
                      {row.marked ? row.present : "—"}
                    </span>
                    Present
                  </span>
                  <span>
                    <span className="tabular block text-[18px] font-semibold text-[var(--red-text)]">
                      {row.marked ? row.absent : "—"}
                    </span>
                    Absent
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--blue-text)]">
                  Open register
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-[var(--ink-tertiary)]">
        <Badge tone="neutral">Demo</Badge>
        Attendance submitted here is stored in this browser. Hazira uses its own
        offline register until the backend milestone.
      </div>
    </>
  );
}
