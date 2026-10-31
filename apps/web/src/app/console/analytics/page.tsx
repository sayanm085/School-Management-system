"use client";

import { BarChart3, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";

import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { can } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import {
  attendanceSummary,
  effectiveHistory,
  feeLedgerForStudent,
  feeSummary,
  resultForStudent,
  riskFlagsForStudent,
  staffById,
  teacherSections,
} from "@/lib/data/selectors";
import { formatINR, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils/cn";

export default function AnalyticsPage() {
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const staff = staffById(db, session?.staffId);

  if (!session || !can(session.role, "analytics.view")) {
    return <PermissionDenied />;
  }

  const isManagement = session.role === "management";
  const canFees =
    can(session.role, "fees.view") || session.role === "management";
  const sections =
    session.role === "teacher" ? teacherSections(db, staff) : db.sections;
  const sectionIds = new Set(sections.map((section) => section.id));
  const students = db.students.filter((student) =>
    sectionIds.has(student.sectionId),
  );
  const results = students.map((student) => ({
    student,
    result: resultForStudent(db, student),
  }));
  const passRate =
    results.length === 0
      ? 0
      : (results.filter((item) => item.result.pass).length / results.length) *
        100;
  const fees = feeSummary(db);

  let present = 0;
  let marked = 0;
  for (const student of students) {
    const summary = attendanceSummary(db, student);
    present += summary.present;
    marked += summary.marked;
  }
  const attendanceRate = marked === 0 ? 0 : (present / marked) * 100;

  const weekly = Array.from({ length: 12 }).map((_, weekIndex) => {
    let weekPresent = 0;
    let weekMarked = 0;
    for (const student of students) {
      const row = effectiveHistory(db, student)[weekIndex] ?? "";
      for (const char of row) {
        if (char === "P") {
          weekPresent += 1;
          weekMarked += 1;
        } else if (char === "A" || char === "L") {
          weekMarked += 1;
        }
      }
    }
    return {
      week: weekIndex + 1,
      percentage: weekMarked === 0 ? 0 : (weekPresent / weekMarked) * 100,
    };
  });

  const subjectAverages = db.subjects
    .map((subject) => {
      const examSubjectIds = new Set(
        db.examSubjects
          .filter(
            (examSubject) =>
              examSubject.examId === "exam-half-2026" &&
              examSubject.subjectId === subject.id,
          )
          .map((examSubject) => examSubject.id),
      );
      const studentIds = new Set(students.map((student) => student.id));
      const marks = db.marks.filter(
        (mark) =>
          examSubjectIds.has(mark.examSubjectId) &&
          studentIds.has(mark.studentId),
      );
      const average =
        marks.length === 0
          ? 0
          : marks.reduce((sum, mark) => sum + mark.total, 0) / marks.length;
      return { subject, average };
    })
    .sort((a, b) => b.average - a.average);

  const classRows = sections.map((section) => {
    const classStudents = students.filter(
      (student) => student.sectionId === section.id,
    );
    const classResults = classStudents.map((student) =>
      resultForStudent(db, student),
    );
    const classPass =
      classResults.length === 0
        ? 0
        : (classResults.filter((result) => result.pass).length /
            classResults.length) *
          100;
    let classPresent = 0;
    let classMarked = 0;
    for (const student of classStudents) {
      const summary = attendanceSummary(db, student);
      classPresent += summary.present;
      classMarked += summary.marked;
    }
    const feeDue = classStudents.reduce(
      (sum, student) => sum + feeLedgerForStudent(db, student.id).duePaise,
      0,
    );
    return {
      section,
      attendance:
        classMarked === 0 ? 0 : (classPresent / classMarked) * 100,
      pass: classPass,
      feeDue,
      count: classStudents.length,
    };
  });

  const riskStudents = students
    .map((student) => ({
      student,
      flags: riskFlagsForStudent(db, student),
    }))
    .filter((item) => item.flags.length > 0)
    .sort((a, b) => b.flags.length - a.flags.length);

  const riskCounts = {
    attendance: riskStudents.filter((item) =>
      item.flags.some((flag) => flag.label.toLowerCase().includes("attendance")),
    ).length,
    academic: riskStudents.filter((item) =>
      item.flags.some((flag) => flag.label.toLowerCase().includes("subject")),
    ).length,
    fees: riskStudents.filter((item) =>
      item.flags.some((flag) => flag.label.toLowerCase().includes("fee")),
    ).length,
  };

  return (
    <>
      <PageHeader
        eyebrow="School intelligence · 2026–27"
        title="Analytics"
        subtitle="Attendance, subject performance, class comparison and explainable risk flags. Every flag states its rule; there is no opaque score."
        actions={
          <Badge tone="info">
            {isManagement ? "Aggregate only" : "Student-level"}
          </Badge>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Attendance"
          value={formatPercent(attendanceRate)}
          subtitle="Term to date · your scope"
          visual={<ProgressRing value={attendanceRate} size={46} />}
        />
        <SummaryCard
          title="Pass rate"
          value={formatPercent(passRate)}
          subtitle="Half-Yearly Examination"
          visual={<ProgressRing value={passRate} size={46} tone="blue" />}
        />
        <SummaryCard
          title="Risk flags"
          value={riskStudents.length}
          subtitle="Students with at least one flag"
          visual={<ShieldAlert className="h-5 w-5 text-[var(--orange)]" />}
        />
        <SummaryCard
          title={canFees ? "Fee collection" : "Classes"}
          value={
            canFees
              ? formatINR(fees.collectedPaise)
              : String(sections.length)
          }
          subtitle={
            canFees
              ? `of ${formatINR(fees.demandPaise)} this month`
              : `${students.length} students in scope`
          }
          visual={<Users className="h-5 w-5 text-[var(--ink-tertiary)]" />}
        />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Attendance trend</CardTitle>
            <Badge tone="neutral">12 weeks</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex h-44 items-end gap-1.5">
              {weekly.map((week) => (
                <div
                  key={week.week}
                  className="group flex flex-1 flex-col items-center gap-1"
                  title={`Week ${week.week}: ${week.percentage.toFixed(1)}%`}
                >
                  <span className="text-[8px] font-medium text-[var(--ink-tertiary)]">
                    {week.percentage.toFixed(0)}
                  </span>
                  <div className="flex h-32 w-full items-end rounded-[6px] bg-[var(--fill)]">
                    <div
                      className={cn(
                        "w-full rounded-[6px]",
                        week.percentage >= 90
                          ? "bg-[var(--green)]"
                          : week.percentage >= 80
                            ? "bg-[var(--orange)]"
                            : "bg-[var(--red)]",
                      )}
                      style={{
                        height: `${Math.max(
                          6,
                          ((week.percentage - 80) / 20) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="font-mono text-[8px] text-[var(--ink-tertiary)]">
                    W{week.week}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-[var(--ink-tertiary)]">
              Present as a share of marked student-days · scale 80–100%. Hover
              a bar for the exact figure.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subject averages</CardTitle>
            <BarChart3
              className="h-4 w-4 text-[var(--ink-tertiary)]"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {subjectAverages.map(({ subject, average }) => (
              <div key={subject.id}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium">{subject.nameEn}</span>
                  <span className="tabular text-[var(--ink-secondary)]">
                    {average.toFixed(1)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--fill)]">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      average >= 70
                        ? "bg-[var(--green)]"
                        : average >= 55
                          ? "bg-[var(--orange)]"
                          : "bg-[var(--red)]",
                    )}
                    style={{ width: `${average}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Class comparison</CardTitle>
            <Badge tone="neutral">{classRows.length} sections</Badge>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--separator)] text-[10px] text-[var(--ink-tertiary)]">
                    <th className="px-5 py-2 font-semibold">Section</th>
                    <th className="px-3 py-2 text-right font-semibold">Students</th>
                    <th className="px-3 py-2 text-right font-semibold">Attendance</th>
                    <th className="px-3 py-2 text-right font-semibold">Pass rate</th>
                    {canFees ? (
                      <th className="px-5 py-2 text-right font-semibold">Fee due</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--separator)]">
                  {classRows.map((row) => (
                    <tr key={row.section.id} className="text-[11px]">
                      <td className="px-5 py-2.5 font-semibold">
                        {row.section.id}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right">
                        {row.count}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right">
                        {formatPercent(row.attendance)}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right">
                        {formatPercent(row.pass)}
                      </td>
                      {canFees ? (
                        <td className="tabular px-5 py-2.5 text-right text-[var(--orange-strong)]">
                          {formatINR(row.feeDue)}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk flags</CardTitle>
            <Badge tone="warning">{riskStudents.length}</Badge>
          </CardHeader>
          <CardContent className="pt-2">
            {isManagement ? (
              <div className="space-y-2 text-[11px]">
                <p className="text-[var(--ink-secondary)]">
                  Aggregate risk counts only. Student names and guardian
                  contacts are hidden for governance.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["Attendance", riskCounts.attendance],
                    ["Academic", riskCounts.academic],
                    ["Fees", riskCounts.fees],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-[12px] bg-[var(--fill)] p-2.5 text-center"
                    >
                      <p className="tabular text-[18px] font-semibold">
                        {value}
                      </p>
                      <p className="text-[9px] text-[var(--ink-tertiary)]">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : riskStudents.length === 0 ? (
              <p className="text-[12px] text-[var(--ink-secondary)]">
                No rule-based flags in this scope.
              </p>
            ) : (
              <ul className="space-y-2">
                {riskStudents.slice(0, 6).map(({ student, flags }) => (
                  <li key={student.id}>
                    <Link
                      href={`/console/students/${student.id}`}
                      className="flex items-start justify-between gap-3 rounded-[10px] px-2 py-2 hover:bg-[var(--fill)]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-bengali text-[12px] font-semibold" lang="bn">
                          {student.nameBn}
                        </span>
                        <span className="block text-[10px] text-[var(--ink-secondary)]">
                          {student.sectionId} · {flags[0].label}
                          {flags.length > 1 ? ` +${flags.length - 1}` : ""}
                        </span>
                      </span>
                      <StatusPill
                        tone={flags.some((flag) => flag.tone === "danger") ? "danger" : "warning"}
                      >
                        {flags.length}
                      </StatusPill>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[9px] leading-relaxed text-[var(--ink-tertiary)]">
              Flags: attendance below 75%, consecutive absence, two or more
              failing subjects, or fees overdue. Each rule is auditable.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
