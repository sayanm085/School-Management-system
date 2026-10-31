"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { can } from "@/lib/auth/permissions";
import { downloadCsv } from "@/lib/csv";
import { useDemoStore } from "@/lib/data/repository";
import {
  attendanceSummary,
  feeLedgerForStudent,
  feeSummary,
  resultForStudent,
  schoolAttendance,
  studentById,
  TODAY,
} from "@/lib/data/selectors";
import { formatINR } from "@/lib/format";

type Report = {
  id: string;
  title: string;
  description: string;
  format: string;
  count: string;
  action: () => void;
};

export default function ReportsPage() {
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const commit = useDemoStore((state) => state.commit);

  if (!session || !can(session.role, "reports.view")) {
    return <PermissionDenied />;
  }

  const isPii = session.role === "headmaster" || session.role === "clerk";
  const isTeacher = session.role === "teacher";

  function logReport(name: string, count: number) {
    commit(
      () => undefined,
      {
        action: "report.exported",
        entityType: "report",
        entityId: name,
        summary: `Exported ${name} · ${count} rows`,
      },
    );
  }

  const reports: Report[] = [];

  if (isPii) {
    reports.push({
      id: "students",
      title: "Student register",
      description:
        "Admission number, roll, class, term attendance and current fee balance.",
      format: "CSV",
      count: `${db.students.length} students`,
      action: () => {
        downloadCsv(
          "baranda-student-register.csv",
          ["Admission", "Name", "Class", "Roll", "Attendance", "Fee due"],
          db.students.map((student) => {
            const attendance = attendanceSummary(db, student);
            const ledger = feeLedgerForStudent(db, student.id);
            return [
              student.admissionNo,
              student.nameEn,
              student.sectionId,
              student.rollNo,
              attendance.percentage.toFixed(1),
              ledger.duePaise / 100,
            ];
          }),
        );
        logReport("Student register", db.students.length);
      },
    });

    reports.push({
      id: "fees",
      title: "Fee bills and dues",
      description:
        "Bill number, student, total, concession, balance, status and due date.",
      format: "CSV",
      count: `${db.bills.length} bills`,
      action: () => {
        downloadCsv(
          "baranda-fee-bills.csv",
          ["Bill", "Student", "Total", "Concession", "Due", "Status", "Due date"],
          db.bills.map((bill) => {
            const student = studentById(db, bill.studentId);
            return [
              bill.billNo,
              student?.nameEn ?? "",
              bill.totalPaise / 100,
              bill.concessionPaise / 100,
              bill.duePaise / 100,
              bill.status,
              bill.dueDate,
            ];
          }),
        );
        logReport("Fee bills", db.bills.length);
      },
    });

    reports.push({
      id: "salary",
      title: "Salary bill",
      description:
        "October 2026 earnings, deductions and net pay for every staff member.",
      format: "CSV",
      count: `${db.salaryLines.filter((line) => line.salaryBillId === "salary-2026-10").length} lines`,
      action: () => {
        const lines = db.salaryLines.filter(
          (line) => line.salaryBillId === "salary-2026-10",
        );
        downloadCsv(
          "baranda-salary-october-2026.csv",
          ["Staff", "Payable days", "Leave days", "Earnings", "Deductions", "Net pay"],
          lines.map((line) => {
            const staff = db.staff.find((person) => person.id === line.staffId);
            return [
              staff?.nameEn ?? "",
              line.payableDays,
              line.leaveDays,
              line.earningsPaise / 100,
              line.deductionsPaise / 100,
              line.netPayPaise / 100,
            ];
          }),
        );
        logReport("Salary bill", lines.length);
      },
    });
  }

  if (isPii || isTeacher) {
    reports.push({
      id: "attendance",
      title: "Today's attendance",
      description:
        "Every marked student, section and status for Saturday, 31 October 2026.",
      format: "CSV",
      count: `${db.attendance.filter((record) => record.date === TODAY).length} records`,
      action: () => {
        const records = db.attendance.filter(
          (record) => record.date === TODAY,
        );
        downloadCsv(
          "baranda-attendance-2026-10-31.csv",
          ["Section", "Student", "Roll", "Status", "Marked by"],
          records.map((record) => {
            const student = studentById(db, record.studentId);
            const staff = db.staff.find(
              (person) => person.id === record.markedBy,
            );
            return [
              record.sectionId,
              student?.nameEn ?? "",
              student?.rollNo ?? "",
              record.status,
              staff?.nameEn ?? "",
            ];
          }),
        );
        logReport("Today's attendance", records.length);
      },
    });

    reports.push({
      id: "results",
      title: "Half-Yearly results",
      description:
        "Subject totals, percentage, grade, rank and pass status for every student.",
      format: "CSV",
      count: `${db.students.length} results`,
      action: () => {
        const rows = db.students.map((student) => {
          const result = resultForStudent(db, student);
          return [
            student.admissionNo,
            student.nameEn,
            student.sectionId,
            result.total,
            result.percentage.toFixed(1),
            result.grade,
            result.pass ? "Pass" : "Needs support",
          ];
        });
        downloadCsv(
          "baranda-half-yearly-results.csv",
          ["Admission", "Student", "Class", "Total", "Percentage", "Grade", "Result"],
          rows,
        );
        logReport("Half-Yearly results", rows.length);
      },
    });
  }

  const attendance = schoolAttendance(db);
  const fees = feeSummary(db);

  return (
    <>
      <PageHeader
        eyebrow="Export centre"
        title="Reports"
        subtitle="Clean CSV exports from the same records the console uses. Management receives aggregate summaries, never student-level PII."
        actions={<Badge tone="info">Demo data</Badge>}
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{report.title}</CardTitle>
              <FileSpreadsheet
                className="h-4 w-4 text-[var(--ink-tertiary)]"
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between">
              <p className="text-[11px] leading-relaxed text-[var(--ink-secondary)]">
                {report.description}
              </p>
              <div className="mt-5 flex items-center justify-between gap-2">
                <Badge tone="neutral">
                  {report.format} · {report.count}
                </Badge>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={report.action}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {session.role === "management" ? (
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>School summary</CardTitle>
              <FileText
                className="h-4 w-4 text-[var(--ink-tertiary)]"
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between">
              <p className="text-[11px] leading-relaxed text-[var(--ink-secondary)]">
                Aggregate attendance, fee collection and pass rate for the
                governance view. No student or guardian records.
              </p>
              <div className="mt-5 flex items-center justify-between gap-2">
                <Badge tone="neutral">CSV · 1 summary</Badge>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    downloadCsv(
                      "baranda-school-summary.csv",
                      ["Metric", "Value"],
                      [
                        ["School", db.school.nameEn],
                        ["Academic year", db.academicYear.label],
                        ["Students", db.students.length],
                        ["Attendance", attendance.percentage.toFixed(1)],
                        ["Fee demand", feeSummary(db).demandPaise / 100],
                        ["Fee collected", fees.collectedPaise / 100],
                        ["Teaching staff", db.staff.filter((p) => p.role === "teacher").length + 1],
                      ],
                    );
                    logReport("School summary", 1);
                  }}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {isPii ? (
          <Card className="flex flex-col md:col-span-2 xl:col-span-1">
            <CardHeader>
              <CardTitle>Print centre</CardTitle>
              <FileText
                className="h-4 w-4 text-[var(--ink-tertiary)]"
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent>
              <p className="text-[11px] leading-relaxed text-[var(--ink-secondary)]">
                Report cards, receipts and payslips are printed from their own
                record pages. Open a student, a bill or a salary bill to print.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="success">Receipts</Badge>
                <Badge tone="info">Report cards</Badge>
                <Badge tone="neutral">Payslips</Badge>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
