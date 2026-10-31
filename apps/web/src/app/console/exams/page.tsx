"use client";

import { ArrowRight, GraduationCap } from "lucide-react";
import Link from "next/link";

import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { can } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import {
  resultForStudent,
  staffById,
  teacherSections,
} from "@/lib/data/selectors";
import { formatPercent } from "@/lib/format";

const tone = {
  draft: "neutral",
  scheduled: "info",
  marks_entry: "warning",
  moderation: "warning",
  published: "success",
} as const;

export default function ExamsPage() {
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const staff = staffById(db, session?.staffId);

  if (!session || !can(session.role, "exams.view")) {
    return <PermissionDenied />;
  }

  const scopedSections =
    session.role === "teacher" ? teacherSections(db, staff) : db.sections;
  const sectionIds = new Set(scopedSections.map((section) => section.id));
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
  const average =
    results.length === 0
      ? 0
      : results.reduce((sum, item) => sum + item.result.percentage, 0) /
        results.length;
  const top = [...results]
    .sort((a, b) => b.result.total - a.result.total)
    .slice(0, 5);

  const half = db.exams.find((exam) => exam.id === "exam-half-2026");
  const annual = db.exams.find((exam) => exam.id === "exam-annual-2027");

  return (
    <>
      <PageHeader
        eyebrow="Examination workspace"
        title="Examinations"
        subtitle="A single view of exam schedules, readiness, marks and published results. Published exams remain locked until reopened with an audit."
        actions={<Badge tone="info">{db.exams.length} exams</Badge>}
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Pass rate"
          value={formatPercent(passRate)}
          subtitle="Half-Yearly Examination"
          visual={<ProgressRing value={passRate} size={46} />}
        />
        <SummaryCard
          title="Average"
          value={formatPercent(average)}
          subtitle="Across all subjects"
        />
        <SummaryCard
          title="Candidates"
          value={students.length}
          subtitle="In your scope"
        />
        <SummaryCard
          title="Annual readiness"
          value={
            annual?.readiness
              ? `${annual.readiness.ready} of ${annual.readiness.total}`
              : "—"
          }
          subtitle={
            annual?.readiness
              ? `${annual.readiness.pending.length} subjects pending`
              : "Not scheduled"
          }
          visual={<GraduationCap className="h-5 w-5 text-[var(--blue)]" />}
        />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.8fr)]">
        <div className="grid gap-4">
          {[half, annual].filter(Boolean).map((exam) => (
            <Card key={exam!.id}>
              <CardHeader>
                <div>
                  <CardTitle>{exam!.name}</CardTitle>
                  <p className="mt-1 text-[11px] text-[var(--ink-secondary)]">
                    {exam!.term} · {exam!.startDate} to {exam!.endDate}
                  </p>
                </div>
                <StatusPill tone={tone[exam!.status] ?? "neutral"}>
                  {exam!.status}
                </StatusPill>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="neutral">
                    {db.examSubjects.filter(
                      (subject) => subject.examId === exam!.id,
                    ).length}{" "}
                    class-subject groups
                  </Badge>
                  {exam!.readiness ? (
                    <Badge tone="warning">
                      {exam!.readiness.pending.length} pending
                    </Badge>
                  ) : null}
                  {exam!.status === "published" ? (
                    <Badge tone="success">Results published</Badge>
                  ) : null}
                </div>
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/console/exams/${exam!.id}`}>
                    Open workspace
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top results</CardTitle>
            <Badge tone="info">Half-Yearly</Badge>
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            {top.map(({ student, result }, index) => (
              <Link
                key={student.id}
                href={`/console/students/${student.id}`}
                className="flex items-center gap-3 rounded-[12px] px-2 py-2 transition-colors hover:bg-[var(--fill)]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--fill)] text-[10px] font-semibold text-[var(--ink-secondary)]">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bengali text-[12px] font-semibold" lang="bn">
                    {student.nameBn}
                  </span>
                  <span className="block text-[10px] text-[var(--ink-secondary)]">
                    {student.sectionId} · Roll {student.rollNo}
                  </span>
                </span>
                <span className="tabular text-[12px] font-semibold">
                  {result.percentage.toFixed(1)}%
                </span>
              </Link>
            ))}
            <p className="pt-1 text-[10px] text-[var(--ink-tertiary)]">
              Ranked by total marks within the visible scope. No guardian
              contact is shown here.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
