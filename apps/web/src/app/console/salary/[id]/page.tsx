"use client";

import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Printer,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
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

export default function SalaryBillPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const commit = useDemoStore((state) => state.commit);

  if (
    !session ||
    !can(session.role, "salary.view") ||
    !can(session.role, "salary.prepare")
  ) {
    return <PermissionDenied />;
  }

  const bill = db.salaryBills.find((item) => item.id === id);
  if (!bill) {
    return (
      <EmptyState
        icon={FileText}
        title="Salary bill not found"
        description="This monthly bill does not exist in the demo records."
        action={
          <Button asChild variant="secondary">
            <Link href="/console/salary">Back to salary</Link>
          </Button>
        }
        className="mt-8"
      />
    );
  }

  const currentBill = bill;
  const lines = db.salaryLines.filter(
    (line) => line.salaryBillId === currentBill.id,
  );
  const canApprove = can(session.role, "salary.approve");

  function updateStatus(
    status: "verified" | "approved" | "disbursed",
    action: string,
    summary: string,
  ) {
    if (!session) return;
    commit(
      (next) => {
        const target = next.salaryBills.find((item) => item.id === currentBill.id);
        if (!target) return;
        target.status = status;
        if (status === "verified") target.verifiedBy = session.staffId;
        if (status === "approved") target.approvedBy = session.staffId;
        if (status === "disbursed")
          target.disbursedAt = new Date().toISOString();
      },
      {
        action,
        entityType: "salary_bill",
        entityId: currentBill.id,
        summary,
      },
    );
    toast.success(
      status === "verified"
        ? "Bill verified"
        : status === "approved"
          ? "Bill approved"
          : "Disbursement recorded",
    );
  }

  return (
    <>
      <div className="no-print mb-5 flex items-center justify-between gap-3">
        <Link
          href="/console/salary"
          className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[12px] font-semibold text-[var(--ink-secondary)] hover:bg-[var(--fill)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Salary
        </Link>
        <div className="flex items-center gap-2">
          <StatusPill tone={tone[currentBill.status] ?? "neutral"}>
            {currentBill.status}
          </StatusPill>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print bill
          </Button>
        </div>
      </div>

      <PageHeader
        eyebrow={`Salary bill · ${currentBill.month}/${currentBill.year}`}
        title={`${currentBill.month}/${currentBill.year} salary`}
        subtitle={`${lines.length} staff lines · net ${formatINR(currentBill.netPayPaise)}. Approval locks the lines and writes an audit event.`}
        actions={
          <>
            {currentBill.status === "prepared" ? (
              <Button
                variant="secondary"
                onClick={() =>
                  updateStatus(
                    "verified",
                    "salary.verified",
                    `Salary bill verified for ${currentBill.month}/${currentBill.year}`,
                  )
                }
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Verify bill
              </Button>
            ) : null}
            {currentBill.status === "verified" && canApprove ? (
              <Button
                onClick={() =>
                  updateStatus(
                    "approved",
                    "salary.approved",
                    `Salary bill approved for ${currentBill.month}/${currentBill.year}`,
                  )
                }
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Approve bill
              </Button>
            ) : null}
            {currentBill.status === "approved" ? (
              <Button
                onClick={() =>
                  updateStatus(
                    "disbursed",
                    "salary.disbursed",
                    `Salary disbursement recorded for ${currentBill.month}/${currentBill.year}`,
                  )
                }
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Record disbursement
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Earnings"
          value={formatINR(currentBill.totalEarningsPaise)}
          subtitle="Basic, allowances and medical"
        />
        <SummaryCard
          title="Deductions"
          value={formatINR(currentBill.totalDeductionsPaise)}
          subtitle="GPF, tax and leave adjustment"
        />
        <SummaryCard
          title="Net payable"
          value={formatINR(currentBill.netPayPaise)}
          subtitle="After deductions"
        />
        <SummaryCard
          title="Staff"
          value={lines.length}
          subtitle="Lines in this bill"
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Salary lines</CardTitle>
          <Badge tone="neutral">{currentBill.status}</Badge>
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <div
            className="max-h-[560px] overflow-auto"
            tabIndex={0}
            aria-label="Salary lines, scrollable"
          >
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-[var(--surface)]">
                <tr className="border-b border-[var(--separator)] text-[10px] text-[var(--ink-tertiary)]">
                  <th className="px-5 py-2.5 font-semibold">Staff</th>
                  <th className="px-3 py-2.5 font-semibold">Payable days</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Earnings</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Deductions</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Net pay</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--separator)]">
                {lines.map((line) => {
                  const staff = staffById(db, line.staffId);
                  return (
                    <tr key={line.id} className="text-[11px]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          {staff ? (
                            <Avatar
                              name={staff.nameEn}
                              src={staff.avatar}
                              size={30}
                            />
                          ) : null}
                          <div>
                            <p className="font-bengali text-[12px] font-semibold" lang="bn">
                              {staff?.nameBn}
                            </p>
                            <p className="text-[10px] text-[var(--ink-secondary)]">
                              {staff?.nameEn} · {staff?.employeeId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[10px] text-[var(--ink-secondary)]">
                        {line.payableDays} · {line.leaveDays} leave
                      </td>
                      <td className="tabular px-3 py-3 text-right">
                        {formatINR(line.earningsPaise)}
                      </td>
                      <td className="tabular px-3 py-3 text-right">
                        {formatINR(line.deductionsPaise)}
                      </td>
                      <td className="tabular px-3 py-3 text-right font-semibold">
                        {formatINR(line.netPayPaise)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/console/salary/payslips/${line.id}`}
                          className="text-[11px] font-semibold text-[var(--blue-text)]"
                        >
                          Payslip
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
