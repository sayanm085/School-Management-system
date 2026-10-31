"use client";

import { ArrowLeft, Lock, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Select } from "@/components/ui/Select";
import { can } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import {
  resultForStudent,
  staffById,
  teacherSections,
} from "@/lib/data/selectors";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils/cn";

const statusTone = {
  draft: "neutral",
  scheduled: "info",
  marks_entry: "warning",
  moderation: "warning",
  published: "success",
} as const;

export default function ExamDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const staff = staffById(db, session?.staffId);
  const [selectedClass, setSelectedClass] = useState("VIII");
  const [selectedSubject, setSelectedSubject] = useState("math");

  if (!session || !can(session.role, "exams.view")) {
    return <PermissionDenied />;
  }

  const exam = db.exams.find((item) => item.id === id);
  if (!exam) {
    return (
      <EmptyState
        icon={Lock}
        title="Exam not found"
        description="This examination does not exist in the demo records."
        action={
          <Button asChild variant="secondary">
            <Link href="/console/exams">Back to examinations</Link>
          </Button>
        }
        className="mt-8"
      />
    );
  }

  const examSubjects = db.examSubjects.filter(
    (subject) => subject.examId === exam.id,
  );
  if (examSubjects.length === 0) {
    return (
      <>
        <div className="mb-5">
          <Link
            href="/console/exams"
            className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[12px] font-semibold text-[var(--ink-secondary)] hover:bg-[var(--fill)] hover:text-[var(--ink)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Examinations
          </Link>
        </div>
        <PageHeader
          eyebrow={exam.term}
          title={exam.name}
          subtitle={`${exam.startDate} to ${exam.endDate}`}
          actions={
            <StatusPill tone={statusTone[exam.status] ?? "neutral"}>
              {exam.status}
            </StatusPill>
          }
        />
        <Card className="mt-6 max-w-2xl p-6">
          <p className="text-[14px] font-semibold">Setup ready for scheduling</p>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--ink-secondary)]">
            The Annual Examination is still a draft. Its schedule and marks
            entry open after the exam coordinator sets the paper dates and
            groups.
          </p>
          {exam.readiness ? (
            <div className="mt-4">
              <Badge tone="warning">
                {exam.readiness.ready} of {exam.readiness.total} ready
              </Badge>
              <ul className="mt-3 space-y-1.5 text-[11px] text-[var(--ink-secondary)]">
                {exam.readiness.pending.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </>
    );
  }

  const classes = Array.from(
    new Set(examSubjects.map((subject) => subject.classLevel)),
  ).sort();
  const subjectsForClass = examSubjects.filter(
    (subject) => subject.classLevel === selectedClass,
  );
  const selectedExamSubject =
    subjectsForClass.find(
      (subject) => subject.subjectId === selectedSubject,
    ) ?? subjectsForClass[0];
  const sections =
    session.role === "teacher"
      ? teacherSections(db, staff).filter(
          (section) => section.classLevel === selectedClass,
        )
      : db.sections.filter((section) => section.classLevel === selectedClass);
  const sectionIds = new Set(sections.map((section) => section.id));
  const students = db.students
    .filter((student) => sectionIds.has(student.sectionId))
    .sort((a, b) => Number(a.rollNo) - Number(b.rollNo));
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

  const subjectAverages = examSubjects
    .filter((subject) => subject.classLevel === selectedClass)
    .map((subject) => {
      const marks = db.marks.filter(
        (mark) => mark.examSubjectId === subject.id,
      );
      const avg =
        marks.length === 0
          ? 0
          : marks.reduce((sum, mark) => sum + mark.total, 0) / marks.length;
      const info = db.subjects.find((item) => item.id === subject.subjectId);
      return { subject, info, avg };
    });

  return (
    <>
      <div className="no-print mb-5 flex items-center justify-between gap-3">
        <Link
          href="/console/exams"
          className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[12px] font-semibold text-[var(--ink-secondary)] hover:bg-[var(--fill)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Examinations
        </Link>
        <div className="flex items-center gap-2">
          <StatusPill tone={statusTone[exam.status] ?? "neutral"}>
            {exam.status}
          </StatusPill>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print
          </Button>
        </div>
      </div>

      <PageHeader
        eyebrow={`${exam.term} · ${exam.startDate} to ${exam.endDate}`}
        title={exam.name}
        subtitle="Published marks and results are locked. The marks grid is read-only in this build and every change would be audited."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Pass rate"
          value={formatPercent(passRate)}
          subtitle={`${students.length} candidates`}
          visual={<ProgressRing value={passRate} size={46} />}
        />
        <SummaryCard
          title="Average"
          value={formatPercent(average)}
          subtitle="All subjects"
        />
        <SummaryCard
          title="Subjects"
          value={subjectsForClass.length}
          subtitle={`Class ${selectedClass}`}
        />
        <SummaryCard
          title="Marks"
          value={`${db.marks.filter((mark) => examSubjects.some((subject) => subject.id === mark.examSubjectId)).length}`}
          subtitle="Recorded marks"
          visual={<Lock className="h-5 w-5 text-[var(--ink-tertiary)]" />}
        />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Marks grid</CardTitle>
            <Badge tone="neutral">Read-only</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Select
                value={selectedClass}
                onChange={(event) => {
                  setSelectedClass(event.target.value);
                  setSelectedSubject(
                    examSubjects.find(
                      (subject) => subject.classLevel === event.target.value,
                    )?.subjectId ?? "math",
                  );
                }}
                aria-label="Class"
                className="w-auto min-w-[120px]"
              >
                {classes.map((classLevel) => (
                  <option key={classLevel} value={classLevel}>
                    Class {classLevel}
                  </option>
                ))}
              </Select>
              <Select
                value={selectedExamSubject?.subjectId ?? selectedSubject}
                onChange={(event) => setSelectedSubject(event.target.value)}
                aria-label="Subject"
                className="w-auto min-w-[160px]"
              >
                {subjectsForClass.map((subject) => {
                  const info = db.subjects.find(
                    (item) => item.id === subject.subjectId,
                  );
                  return (
                    <option key={subject.subjectId} value={subject.subjectId}>
                      {info?.nameEn ?? subject.subjectId}
                    </option>
                  );
                })}
              </Select>
            </div>

            {selectedExamSubject ? (
              <div
                className="mt-4 max-h-[560px] overflow-auto rounded-[12px] border border-[var(--separator)]"
                tabIndex={0}
                aria-label="Marks grid, scrollable"
              >
                <table className="w-full min-w-[680px] border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-[var(--surface)]">
                    <tr className="border-b border-[var(--separator)] text-[10px] text-[var(--ink-tertiary)]">
                      <th className="px-2 py-2 font-semibold">Student</th>
                      <th className="px-2 py-2 font-semibold">Section</th>
                      <th className="px-2 py-2 text-right font-semibold">Theory</th>
                      <th className="px-2 py-2 text-right font-semibold">Internal</th>
                      <th className="px-2 py-2 text-right font-semibold">Total</th>
                      <th className="px-2 py-2 font-semibold">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--separator)]">
                    {students.map((student) => {
                      const mark = db.marks.find(
                        (item) =>
                          item.examSubjectId === selectedExamSubject.id &&
                          item.studentId === student.id,
                      );
                      return (
                        <tr key={student.id} className="text-[11px]">
                          <td className="px-2 py-2.5">
                            <div className="flex items-center gap-2">
                              <Avatar
                                name={student.nameEn}
                                src={student.avatar}
                                size={28}
                              />
                              <span className="font-bengali text-[12px] font-semibold" lang="bn">
                                {student.nameBn}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-[10px] text-[var(--ink-secondary)]">
                            {student.sectionId} · {student.rollNo}
                          </td>
                          <td className="tabular px-2 py-2.5 text-right">
                            {mark?.theory ?? "—"}
                          </td>
                          <td className="tabular px-2 py-2.5 text-right">
                            {mark?.internal ?? "—"}
                          </td>
                          <td className="tabular px-2 py-2.5 text-right font-semibold">
                            {mark?.total ?? "—"}
                          </td>
                          <td className="px-2 py-2.5">
                            <StatusPill
                              tone={
                                mark && mark.total >= selectedExamSubject.passMarks
                                  ? "success"
                                  : "danger"
                              }
                            >
                              {mark
                                ? mark.total >= selectedExamSubject.passMarks
                                  ? "Pass"
                                  : "Below pass"
                                : "Missing"}
                            </StatusPill>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Subject averages</CardTitle>
              <Badge tone="info">Class {selectedClass}</Badge>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {subjectAverages.map(({ subject, info, avg }) => (
                <div key={subject.id}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium">{info?.nameEn ?? subject.subjectId}</span>
                    <span className="tabular text-[var(--ink-secondary)]">
                      {avg.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--fill)]">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        avg >= 60 ? "bg-[var(--green)]" : "bg-[var(--orange)]",
                      )}
                      style={{ width: `${avg}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Class results</CardTitle>
              <Badge tone="success">{results.filter((item) => item.result.pass).length} pass</Badge>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {[...results]
                .sort((a, b) => b.result.total - a.result.total)
                .slice(0, 6)
                .map(({ student, result }) => (
                  <Link
                    key={student.id}
                    href={`/console/students/${student.id}`}
                    className="flex items-center justify-between gap-3 rounded-[10px] px-2 py-1.5 text-[11px] hover:bg-[var(--fill)]"
                  >
                    <span className="min-w-0 truncate font-bengali font-medium" lang="bn">
                      {student.nameBn}
                    </span>
                    <span className="tabular text-[var(--ink-secondary)]">
                      {result.total} · {formatPercent(result.percentage)}
                    </span>
                  </Link>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
