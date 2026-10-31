"use client";

import {
  ArrowLeft,
  Check,
  ChevronRight,
  FileText,
  Printer,
  ShieldAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { AttendanceHeatRegister } from "@/components/students/AttendanceHeatRegister";
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
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/Tabs";
import { can, canAccessSection } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import {
  attendanceSummary,
  classTeacherFor,
  effectiveHistory,
  feeLedgerForStudent,
  rankForStudent,
  resultForStudent,
  riskFlagsForStudent,
  studentById,
  todayRecordForStudent,
} from "@/lib/data/selectors";
import {
  formatDate,
  formatINR,
  formatPercent,
  maskPhone,
} from "@/lib/format";
import type { Student } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const student = studentById(db, id);
  const staff = db.staff.find((person) => person.id === session?.staffId);

  if (!session || !can(session.role, "students.view")) {
    return <PermissionDenied />;
  }

  if (!student) {
    return (
      <EmptyState
        icon={FileText}
        title="Student record not found"
        description="This admission number does not exist in the demo records."
        action={
          <Button asChild variant="secondary">
            <Link href="/console/students">Back to students</Link>
          </Button>
        }
        className="mt-8"
      />
    );
  }

  if (!canAccessSection(staff, student.sectionId)) {
    return <PermissionDenied />;
  }

  const teacher = classTeacherFor(db, student.sectionId);

  return (
    <>
      <div className="no-print mb-5 flex items-center justify-between gap-3">
        <Link
          href="/console/students"
          className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[12px] font-semibold text-[var(--ink-secondary)] transition-colors hover:bg-[var(--fill)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Students
        </Link>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print record
        </Button>
      </div>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar
          name={student.nameEn}
          src={student.avatar}
          size={88}
          className="border-[3px] border-[var(--blue-tint)]"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-[var(--blue-text)]">
            Student record · {student.admissionNo}
          </p>
          <h1 className="font-bengali mt-1 text-[clamp(28px,3.4vw,38px)] leading-[1.25] font-semibold tracking-[-0.025em]" lang="bn">
            {student.nameBn}
          </h1>
          <p className="mt-0.5 text-[15px] text-[var(--ink-secondary)]">
            {student.nameEn}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge>Class {student.sectionId.split("-")[0]}</Badge>
            <Badge>Section {student.sectionId.split("-")[1]}</Badge>
            <Badge>Roll {student.rollNo}</Badge>
            <Badge tone="success">Active</Badge>
          </div>
        </div>
        <div className="shrink-0 rounded-[16px] border border-[var(--separator)] bg-[var(--surface)] p-3.5 text-[11px] leading-relaxed">
          <p className="font-semibold text-[var(--ink)]">Guardian</p>
          <p className="mt-1 text-[var(--ink-secondary)]">
            {student.guardianName}
          </p>
          <p className="text-[var(--ink-secondary)]">
            {maskPhone(student.guardianPhone)}
          </p>
          <p className="mt-2 font-semibold text-[var(--ink)]">Class teacher</p>
          <p className="mt-1 text-[var(--ink-secondary)]">
            {teacher?.nameEn ?? "Not assigned"}
          </p>
        </div>
      </header>

      <Tabs defaultValue="overview" className="mt-7">
        <div className="no-print overflow-x-auto pb-1">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
            <div className="grid gap-4">
              <AttendancePanel student={student} />
              <ResultsPanel student={student} />
            </div>
            <div className="grid gap-4">
              <FeePanel student={student} />
              <RiskPanel student={student} />
              <DocumentsPanel student={student} />
              <ProfileDetailsPanel student={student} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
            <AttendancePanel student={student} expanded />
            <div className="grid gap-4">
              <RiskPanel student={student} />
              <ProfileDetailsPanel student={student} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="results">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
            <ResultsPanel student={student} expanded />
            <Card>
              <CardContent>
                <p className="text-[13px] font-semibold">Report card</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--ink-secondary)]">
                  Print a bilingual Half-Yearly report card with subjects,
                  marks, grade, rank and attendance.
                </p>
                <Button
                  variant="secondary"
                  className="mt-4 w-full"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  Print report card
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fees">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
            <FeeDetails student={student} />
            <FeePanel student={student} />
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsPanel student={student} expanded />
        </TabsContent>
      </Tabs>

      <div className="print-only mt-8">
        <div className="flex items-center justify-between border-b border-black pb-3">
          <div>
            <p className="text-[18px] font-semibold">
              Nabagram Uchcha Vidyalaya (Demo)
            </p>
            <p className="text-[11px]">
              Purba Bardhaman · Est. 1948 · WB-NAB-001
            </p>
          </div>
          <p className="text-[11px]">Half-Yearly Examination 2026</p>
        </div>
        <p className="mt-4 text-[12px]">
          {student.nameEn} · Class {student.sectionId} · Roll {student.rollNo} ·{" "}
          {student.admissionNo}
        </p>
        <PrintReportBody student={student} />
      </div>
    </>
  );
}

function AttendancePanel({
  student,
  expanded = false,
}: {
  student: Student;
  expanded?: boolean;
}) {
  const db = useDemoStore((state) => state.db);
  const summary = attendanceSummary(db, student);
  const history = effectiveHistory(db, student);
  const today = todayRecordForStudent(db, student.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance register</CardTitle>
        <StatusPill
          tone={summary.percentage >= 75 ? "success" : "danger"}
        >
          {summary.percentage >= 75 ? "On track" : "Below 75%"}
        </StatusPill>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="tabular text-[34px] leading-none font-semibold tracking-[-0.03em]">
              {formatPercent(summary.percentage)}
            </p>
            <p className="mt-1 text-[11px] text-[var(--ink-secondary)]">
              Term to date · 12 school weeks
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              ["Present", summary.present, "text-[var(--green-text)]"],
              ["Absent", summary.absent, "text-[var(--red-text)]"],
              ["Late", summary.late, "text-[var(--orange-strong)]"],
            ].map(([label, value, color]) => (
              <div key={label}>
                <p className={cn("tabular text-[18px] font-semibold", color)}>
                  {value}
                </p>
                <p className="text-[10px] text-[var(--ink-tertiary)]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <AttendanceHeatRegister rows={history} compact={!expanded} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-[var(--fill)] px-3.5 py-2.5 text-[11px]">
          <span className="font-semibold">Today · Sat 31 Oct</span>
          <span className="text-[var(--ink-secondary)]">
            {today ? today.status : "Not marked yet"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultsPanel({
  student,
  expanded = false,
}: {
  student: Student;
  expanded?: boolean;
}) {
  const db = useDemoStore((state) => state.db);
  const result = resultForStudent(db, student);
  const rank = rankForStudent(db, student);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Half-Yearly result</CardTitle>
        <StatusPill tone={result.pass ? "success" : "danger"}>
          {result.pass ? "Pass" : "Needs support"}
        </StatusPill>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="tabular text-[34px] leading-none font-semibold tracking-[-0.03em]">
              {formatPercent(result.percentage)}
            </p>
            <p className="mt-1 text-[11px] text-[var(--ink-secondary)]">
              {result.total} / {result.max} · Grade {result.grade}
            </p>
          </div>
          <div className="text-right">
            <p className="tabular text-[18px] font-semibold">
              Rank {rank.rank}
            </p>
            <p className="text-[10px] text-[var(--ink-tertiary)]">
              of {rank.total} in {student.sectionId}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {result.subjects.map((subject) => (
            <div key={subject.examSubject.id}>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="font-medium">
                  {subject.subject?.nameEn ?? "Subject"}
                </span>
                <span className="tabular text-[var(--ink-secondary)]">
                  {subject.total} / {subject.maxMarks}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--fill)]">
                <div
                  className={cn(
                    "h-full rounded-full",
                    subject.pass ? "bg-[var(--green)]" : "bg-[var(--red)]",
                  )}
                  style={{
                    width: `${(subject.total / subject.maxMarks) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {expanded ? (
          <div className="mt-5 rounded-[12px] bg-[var(--fill)] p-3.5 text-[11px] leading-relaxed text-[var(--ink-secondary)]">
            Pass rule: at least 33% in every subject and 40% aggregate. The
            Half-Yearly Examination was published on 10 October 2026.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FeePanel({ student }: { student: Student }) {
  const db = useDemoStore((state) => state.db);
  const ledger = feeLedgerForStudent(db, student.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee ledger</CardTitle>
        <Badge tone={ledger.duePaise > 0 ? "warning" : "success"}>
          {ledger.duePaise > 0 ? formatINR(ledger.duePaise) + " due" : "Paid"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {ledger.bills.map((bill) => (
            <div
              key={bill.id}
              className="flex items-center justify-between gap-3 rounded-[12px] bg-[var(--fill)] px-3 py-2.5 text-[11px]"
            >
              <span className="font-medium">{bill.period}</span>
              <span className="tabular text-[var(--ink-secondary)]">
                {formatINR(bill.totalPaise - bill.concessionPaise)}
              </span>
              <StatusPill
                tone={
                  bill.status === "paid"
                    ? "success"
                    : bill.status === "partial"
                      ? "warning"
                      : "danger"
                }
              >
                {bill.status}
              </StatusPill>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[var(--separator)] pt-3 text-[11px]">
          <span className="text-[var(--ink-secondary)]">Paid</span>
          <span className="tabular font-semibold">
            {formatINR(ledger.paidPaise)}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px]">
          <span className="text-[var(--ink-secondary)]">Balance</span>
          <span
            className={cn(
              "tabular font-semibold",
              ledger.duePaise > 0
                ? "text-[var(--orange-strong)]"
                : "text-[var(--green-text)]",
            )}
          >
            {formatINR(ledger.duePaise)}
          </span>
        </div>
        <Button asChild variant="secondary" className="mt-3 w-full" size="sm">
          <Link href="/console/fees">
            Open fee desk
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function FeeDetails({ student }: { student: Student }) {
  const db = useDemoStore((state) => state.db);
  const ledger = feeLedgerForStudent(db, student.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bills and payments</CardTitle>
        <Badge tone="neutral">{ledger.bills.length} bill</Badge>
      </CardHeader>
      <CardContent className="p-0 pt-2">
        <ul className="divide-y divide-[var(--separator)]">
          {ledger.bills.map((bill) => (
            <li key={bill.id} className="px-5 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold">{bill.billNo}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--ink-tertiary)]">
                    {bill.period} · due {formatDate(bill.dueDate)}
                  </p>
                </div>
                <StatusPill
                  tone={
                    bill.status === "paid"
                      ? "success"
                      : bill.status === "partial"
                        ? "warning"
                        : "danger"
                  }
                >
                  {bill.status}
                </StatusPill>
              </div>
              <div className="mt-3 space-y-1.5">
                {bill.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-[11px] text-[var(--ink-secondary)]"
                  >
                    <span>{item.nameEn}</span>
                    <span className="tabular">{formatINR(item.amountPaise)}</span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
        {ledger.payments.length > 0 ? (
          <div className="border-t border-[var(--separator)] px-5 py-3.5">
            <p className="text-[11px] font-semibold">Payments</p>
            <ul className="mt-2 space-y-2">
              {ledger.payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-center justify-between text-[11px] text-[var(--ink-secondary)]"
                >
                  <span>
                    {payment.receiptNo} · {payment.method.toUpperCase()}
                  </span>
                  <span className="tabular">
                    {formatINR(payment.amountPaise)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RiskPanel({ student }: { student: Student }) {
  const db = useDemoStore((state) => state.db);
  const flags = riskFlagsForStudent(db, student);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
        <Badge tone={flags.length ? "warning" : "success"}>
          {flags.length || "Clear"}
        </Badge>
      </CardHeader>
      <CardContent>
        {flags.length === 0 ? (
          <div className="flex items-center gap-2.5 text-[12px] text-[var(--ink-secondary)]">
            <Check className="h-4 w-4 text-[var(--green)]" aria-hidden="true" />
            No attendance, academic or fee flags this term.
          </div>
        ) : (
          <ul className="space-y-2.5">
            {flags.map((flag) => (
              <li key={flag.label} className="flex items-start gap-2.5">
                <ShieldAlert
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    flag.tone === "danger"
                      ? "text-[var(--red)]"
                      : flag.tone === "warning"
                        ? "text-[var(--orange)]"
                        : "text-[var(--blue)]",
                  )}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-[12px] font-semibold">{flag.label}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-secondary)]">
                    {flag.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentsPanel({
  student,
  expanded = false,
}: {
  student: Student;
  expanded?: boolean;
}) {
  return (
    <Card className={expanded ? "xl:col-span-2" : undefined}>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <Badge tone="neutral">
          {student.documents.filter((document) => document.verified).length} /{" "}
          {student.documents.length} verified
        </Badge>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {student.documents.map((document) => (
            <li
              key={document.type}
              className="flex items-center justify-between gap-3 rounded-[12px] bg-[var(--fill)] px-3 py-2.5"
            >
              <span className="flex items-center gap-2 text-[12px]">
                <FileText
                  className="h-3.5 w-3.5 text-[var(--ink-tertiary)]"
                  aria-hidden="true"
                />
                {document.label}
              </span>
              {document.verified ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--green-text)]">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--orange-strong)]">
                  <X className="h-3 w-3" aria-hidden="true" />
                  Missing
                </span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ProfileDetailsPanel({ student }: { student: Student }) {
  const db = useDemoStore((state) => state.db);
  const teacher = classTeacherFor(db, student.sectionId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {[
          ["Guardian", student.guardianName],
          ["Phone", maskPhone(student.guardianPhone)],
          ["Address", student.address],
          ["Date of birth", formatDate(student.dob)],
          ["Admitted", formatDate(student.admissionDate)],
          ["Category", student.category.toUpperCase()],
          ["Class teacher", teacher?.nameEn ?? "Not assigned"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex items-start justify-between gap-3 text-[11px]"
          >
            <span className="text-[var(--ink-secondary)]">{label}</span>
            <span className="max-w-[65%] text-right font-medium">{value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PrintReportBody({ student }: { student: Student }) {
  const db = useDemoStore((state) => state.db);
  const result = resultForStudent(db, student);
  const rank = rankForStudent(db, student);
  const attendance = attendanceSummary(db, student);

  return (
    <div className="mt-4">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-1.5">Subject</th>
            <th className="py-1.5 text-right">Marks</th>
            <th className="py-1.5 text-right">Max</th>
            <th className="py-1.5 text-right">Result</th>
          </tr>
        </thead>
        <tbody>
          {result.subjects.map((subject) => (
            <tr key={subject.examSubject.id} className="border-b border-black/20">
              <td className="py-1.5">{subject.subject?.nameEn}</td>
              <td className="py-1.5 text-right">{subject.total}</td>
              <td className="py-1.5 text-right">{subject.maxMarks}</td>
              <td className="py-1.5 text-right">
                {subject.pass ? "Pass" : "Fail"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <p>Total: {result.total} / {result.max}</p>
        <p>Percentage: {formatPercent(result.percentage)}</p>
        <p>Grade: {result.grade}</p>
        <p>Rank: {rank.rank} of {rank.total}</p>
        <p>Attendance: {formatPercent(attendance.percentage)}</p>
        <p>Overall: {result.pass ? "Pass" : "Needs support"}</p>
      </div>
    </div>
  );
}
