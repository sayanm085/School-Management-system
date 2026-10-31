"use client";

import {
  ArrowLeft,
  CalendarMinus,
  Check,
  Clock,
  Hand,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import {
  can,
  canMarkAttendanceForSection,
} from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import {
  classTeacherFor,
  sectionById,
  staffById,
  studentsInSection,
  TODAY,
  todayRecordsForSection,
} from "@/lib/data/selectors";
import { formatDate } from "@/lib/format";
import type { AttendanceStatus } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const options = [
  {
    status: "present" as const,
    label: "Present",
    icon: Check,
    selected: "border-transparent bg-[var(--green-strong)] text-white",
    idle: "text-[var(--green-text)] hover:bg-[var(--green-tint)]",
  },
  {
    status: "absent" as const,
    label: "Absent",
    icon: X,
    selected: "border-transparent bg-[var(--red-strong)] text-white",
    idle: "text-[var(--red-text)] hover:bg-[var(--red-tint)]",
  },
  {
    status: "late" as const,
    label: "Late",
    icon: Clock,
    selected: "border-transparent bg-[var(--orange-strong)] text-white",
    idle: "text-[var(--orange-strong)] hover:bg-[var(--orange-tint)]",
  },
  {
    status: "leave" as const,
    label: "Leave",
    icon: CalendarMinus,
    selected: "border-transparent bg-[var(--ink)] text-[var(--canvas)]",
    idle: "text-[var(--ink-secondary)] hover:bg-[var(--fill)]",
  },
];

export default function AttendanceRegisterPage() {
  const params = useParams<{ sectionId: string }>();
  const sectionId =
    typeof params.sectionId === "string"
      ? params.sectionId
      : params.sectionId?.[0];
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const commit = useDemoStore((state) => state.commit);
  const section = sectionById(db, sectionId);
  const staff = staffById(db, session?.staffId);
  const students = section ? studentsInSection(db, section.id) : [];
  const existing = section ? todayRecordsForSection(db, section.id) : [];
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(
      existing.map((record) => [record.studentId, record.status]),
    ),
  );
  const [submitted, setSubmitted] = useState(existing.length > 0);

  useEffect(() => {
    setDraft(
      Object.fromEntries(
        existing.map((record) => [record.studentId, record.status]),
      ),
    );
    setSubmitted(existing.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  if (!session || !can(session.role, "attendance.view")) {
    return <PermissionDenied />;
  }

  if (!section) {
    return (
      <EmptyState
        icon={Users}
        title="Section not found"
        description="This class section does not exist in the demo school."
        action={
          <Button asChild variant="secondary">
            <Link href="/console/attendance">Back to attendance</Link>
          </Button>
        }
        className="mt-8"
      />
    );
  }

  if (!canMarkAttendanceForSection(staff, section.id, db)) {
    return <PermissionDenied />;
  }

  const covering =
    staff === null
      ? null
      : (db.substitutions.find(
          (item) =>
            item.date === TODAY &&
            item.sectionId === section.id &&
            item.substituteTeacherId === staff.id,
        ) ?? null);
  const coveringNow = covering;

  const teacher = classTeacherFor(db, section.id);
  const targetSectionId = section.id;
  const actorId = session.staffId;
  const markedCount = students.filter((student) => draft[student.id]).length;
  const counts = students.reduce<Record<AttendanceStatus, number>>(
    (result, student) => {
      const status = draft[student.id];
      if (status) result[status] += 1;
      return result;
    },
    { present: 0, absent: 0, late: 0, leave: 0, holiday: 0 },
  );
  const allMarked = markedCount === students.length;

  function markAllPresent() {
    setDraft(
      Object.fromEntries(
        students.map((student) => [student.id, "present" as const]),
      ),
    );
  }

  function submit() {
    if (!allMarked) {
      toast.error("Mark every student before submitting.", {
        description: `${students.length - markedCount} students are still unmarked.`,
      });
      return;
    }

    const markedAt = new Date().toISOString();
    const summary = `${counts.present} present, ${counts.absent} absent, ${counts.late} late, ${counts.leave} leave`;
    const coverAuditId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `audit-${Date.now()}`;

    commit(
      (next) => {
        next.attendance = next.attendance.filter(
          (record) =>
            !(record.date === TODAY && record.sectionId === targetSectionId),
        );
        for (const student of students) {
          next.attendance.push({
            id: `att-${TODAY}-${targetSectionId}-${student.id}`,
            studentId: student.id,
            sectionId: targetSectionId,
            date: TODAY,
            session: "full_day",
            status: draft[student.id],
            markedBy: actorId,
            markedAt,
            source: "web",
          });
        }
        if (coveringNow && coveringNow.status !== "covered") {
          const record = next.substitutions.find(
            (item) => item.id === coveringNow.id,
          );
          if (record) {
            record.status = "covered";
            next.audit.unshift({
              id: coverAuditId,
              actorId,
              action: "substitution.covered",
              entityType: "substitution",
              entityId: record.id,
              summary: `Cover completed for ${targetSectionId} period ${record.period} after the register was submitted`,
              createdAt: markedAt,
            });
          }
        }
      },
      {
        action: submitted
          ? "attendance.updated"
          : "attendance.submitted",
        entityType: "attendance",
        entityId: targetSectionId,
        summary: `${submitted ? "Attendance updated" : "Attendance submitted"} for ${targetSectionId} · ${summary}${coveringNow && coveringNow.status !== "covered" ? " · cover completed" : ""}`,
      },
    );

    setSubmitted(true);
    toast.success(
      submitted ? "Attendance updated" : "Attendance submitted",
      { description: `${targetSectionId} · ${students.length} students · ${summary}` },
    );
  }

  return (
    <>
      <div className="no-print mb-5 flex items-center justify-between gap-3">
        <Link
          href="/console/attendance"
          className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[12px] font-semibold text-[var(--ink-secondary)] transition-colors hover:bg-[var(--fill)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Attendance
        </Link>
        <StatusPill tone={submitted ? "success" : "warning"}>
          {submitted ? "Submitted" : "Draft"}
        </StatusPill>
      </div>

      <PageHeader
        eyebrow={`${formatDate(TODAY)} · Half day`}
        title={`${section.id} register`}
        subtitle={`${students.length} students · Class teacher ${teacher?.nameEn ?? "not assigned"} · ${markedCount} of ${students.length} marked`}
        actions={
          <>
            <Button variant="secondary" onClick={markAllPresent}>
              <Check className="h-4 w-4" aria-hidden="true" />
              Mark all present
            </Button>
            <Button onClick={submit} disabled={!allMarked}>
              {submitted ? "Update register" : "Submit attendance"}
            </Button>
          </>
        }
      />

      {covering ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-[14px] border border-[var(--green)]/20 bg-[var(--green-tint)] px-4 py-3 text-[11px] leading-relaxed text-[var(--green-text)]">
          <Hand className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">
              {covering.status === "covered"
                ? "Cover completed."
                : "You are covering this class."}
            </span>{" "}
            {covering.status === "covered"
              ? "The substitute record is closed."
              : `You are the substitute for period ${covering.period}. Submitting this register will mark the cover as completed.`}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[14px] border border-[var(--separator)] bg-[var(--surface)] px-4 py-2.5 text-[11px]">
        <span className="font-semibold">Legend</span>
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <span
              key={option.status}
              className="inline-flex items-center gap-1.5 text-[var(--ink-secondary)]"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {option.label}
            </span>
          );
        })}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <Badge tone={allMarked ? "success" : "warning"}>
            {markedCount} / {students.length}
          </Badge>
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <ul className="divide-y divide-[var(--separator)]">
            {students.map((student) => (
              <li
                key={student.id}
                className="flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:px-5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar
                    name={student.nameEn}
                    src={student.avatar}
                    size={34}
                  />
                  <div className="min-w-0">
                    <p className="font-bengali truncate text-[14px] font-semibold" lang="bn">
                      {student.nameBn}
                    </p>
                    <p className="truncate text-[11px] text-[var(--ink-secondary)]">
                      {student.nameEn} · Roll {student.rollNo}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5 sm:flex">
                  {options.map((option) => {
                    const Icon = option.icon;
                    const active = draft[student.id] === option.status;
                    return (
                      <button
                        key={option.status}
                        type="button"
                        aria-label={`Mark ${student.nameEn} ${option.label.toLowerCase()}`}
                        aria-pressed={active}
                        title={option.label}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            [student.id]: option.status,
                          }))
                        }
                        className={cn(
                          "inline-flex h-11 w-full items-center justify-center rounded-[11px] border text-[var(--ink-tertiary)] transition-colors duration-150 active:scale-[0.97] sm:h-11 sm:w-11",
                          active
                            ? option.selected
                            : `border-[var(--separator)] bg-[var(--surface)] ${option.idle}`,
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-5 text-[11px]">
            {[
              ["Present", counts.present, "text-[var(--green-text)]"],
              ["Absent", counts.absent, "text-[var(--red-text)]"],
              ["Late", counts.late, "text-[var(--orange-strong)]"],
              ["Leave", counts.leave, "text-[var(--ink-secondary)]"],
            ].map(([label, value, color]) => (
              <span key={label}>
                <span className={cn("tabular block text-[18px] font-semibold", color)}>
                  {value}
                </span>
                {label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-[var(--ink-secondary)]">
              {allMarked
                ? "Ready to submit"
                : `${students.length - markedCount} students unmarked`}
            </p>
            <Button onClick={submit} disabled={!allMarked}>
              {submitted ? "Update register" : "Submit attendance"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="mt-3 text-[10px] text-[var(--ink-tertiary)]">
        Submitting writes an audit event. Corrections are retained in the audit
        trail. Demo data stays in this browser.
      </p>
    </>
  );
}
