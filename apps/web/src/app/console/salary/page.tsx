"use client";

import { ArrowRight, Wallet } from "lucide-react";
import Link from "next/link";

import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { can } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import { staffById } from "@/lib/data/selectors";
import { formatINR } from "@/lib/format";

const tone = {
  draft: "neutral",
  prepared: "warning",
  verified: "info",
  approved: "success",
  disbursed: "success",
} as const;

export default function SalaryPage() {
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);

  if (!session || !can(session.role, "salary.view")) {
    return <PermissionDenied />;
  }

  if (session.role === "teacher") {
    const october = db.salaryBills.find((bill) => bill.id === "salary-2026-10");
    const line = october
      ? db.salaryLines.find(
          (item) =>
            item.salaryBillId === october.id &&
            item.staffId === session.staffId,
        )
      : null;
    const staff = staffById(db, session.staffId);

    return (
      <>
        <PageHeader
          eyebrow="Salary · own record"
          title="My payslip"
          subtitle="Teachers can see their own salary record. The full school salary bill is available to the Headmaster and Clerk."
        />
        <Card className="mt-6 max-w-2xl">
          <CardHeader>
            <CardTitle>October 2026</CardTitle>
            <StatusPill tone={october ? tone[october.status] : "neutral"}>
              {october?.status ?? "not prepared"}
            </StatusPill>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold">{staff?.nameEn}</p>
                <p className="text-[11px] text-[var(--ink-secondary)]">
                  {staff?.employeeId} · {staff?.designation}
                </p>
              </div>
              {line ? (
                <div className="text-right">
                  <p className="tabular text-[28px] font-semibold tracking-[-0.03em]">
                    {formatINR(line.netPayPaise)}
                  </p>
                  <p className="text-[10px] text-[var(--ink-tertiary)]">
                    Net pay
                  </p>
                </div>
              ) : null}
            </div>
            {line ? (
              <Button asChild variant="secondary" className="mt-5">
                <Link href={`/console/salary/payslips/${line.id}`}>
                  Open payslip
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <p className="mt-5 text-[12px] text-[var(--ink-secondary)]">
                Your payslip will appear after the Clerk prepares the monthly
                bill.
              </p>
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  const october = db.salaryBills.find((bill) => bill.id === "salary-2026-10");
  const lines = db.salaryLines.filter(
    (line) => line.salaryBillId === "salary-2026-10",
  );

  return (
    <>
      <PageHeader
        eyebrow="Payroll · October 2026"
        title="Salary"
        subtitle="Prepare, verify, approve and record the monthly salary bill. Baranda records the bill; it does not move money."
        actions={
          october ? (
            <Button asChild>
              <Link href={`/console/salary/${october.id}`}>
                Open October bill
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="October net"
          value={october ? formatINR(october.netPayPaise) : "—"}
          subtitle="After deductions"
          visual={<Wallet className="h-5 w-5 text-[var(--blue)]" />}
        />
        <SummaryCard
          title="Bill status"
          value={october ? october.status : "—"}
          subtitle="Prepared by the Clerk"
          visual={
            october ? (
              <Badge tone={tone[october.status] ?? "neutral"}>
                {lines.length} lines
              </Badge>
            ) : undefined
          }
        />
        <SummaryCard
          title="Staff paid"
          value={lines.length}
          subtitle="Teaching and support"
        />
        <SummaryCard
          title="September"
          value={
            db.salaryBills.find((bill) => bill.id === "salary-2026-09")
              ?.status ?? "—"
          }
          subtitle="Previous month record"
        />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Monthly bills</CardTitle>
            <Badge tone="neutral">{db.salaryBills.length}</Badge>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <ul className="divide-y divide-[var(--separator)]">
              {db.salaryBills.map((bill) => {
                const lineCount = db.salaryLines.filter(
                  (line) => line.salaryBillId === bill.id,
                ).length;
                return (
                  <li key={bill.id}>
                    <Link
                      href={`/console/salary/${bill.id}`}
                      className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[var(--fill)]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold">
                          {bill.month}/{bill.year} salary bill
                        </p>
                        <p className="text-[10px] text-[var(--ink-secondary)]">
                          {lineCount} staff · net {formatINR(bill.netPayPaise)}
                        </p>
                      </div>
                      <StatusPill tone={tone[bill.status] ?? "neutral"}>
                        {bill.status}
                      </StatusPill>
                      <ArrowRight
                        className="h-4 w-4 text-[var(--ink-tertiary)]"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow</CardTitle>
            <Badge tone="info">4 steps</Badge>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-2">
            {[
              ["Prepared", "Clerk builds lines from pay structure, attendance and leave."],
              ["Verified", "Clerk or Headmaster checks totals and adjustments."],
              ["Approved", "Headmaster locks the bill."],
              ["Disbursed", "Office records the payment reference and payslips."],
            ].map(([step, description], index) => (
              <div key={step} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--fill)] text-[10px] font-semibold text-[var(--ink-secondary)]">
                  {index + 1}
                </span>
                <div>
                  <p className="text-[12px] font-semibold">{step}</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--ink-secondary)]">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
