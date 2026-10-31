"use client";

import { ArrowLeft, Printer, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { SchoolSeal } from "@/components/brand/SchoolSeal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { can } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import { formatINR } from "@/lib/format";

export default function PayslipPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);

  if (!session || !can(session.role, "salary.view")) {
    return <PermissionDenied />;
  }

  const line = db.salaryLines.find((item) => item.id === id);
  if (!line) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="Payslip not found"
        description="This salary line does not exist in the demo records."
        action={
          <Button asChild variant="secondary">
            <Link href="/console/salary">Back to salary</Link>
          </Button>
        }
        className="mt-8"
      />
    );
  }

  if (session.role === "teacher" && line.staffId !== session.staffId) {
    return <PermissionDenied />;
  }

  const staff = db.staff.find((person) => person.id === line.staffId);
  const bill = db.salaryBills.find((item) => item.id === line.salaryBillId);
  const structure = db.salaryStructures.find(
    (item) => item.staffId === line.staffId,
  );

  if (!staff || !bill) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="Payslip unavailable"
        description="The staff or salary bill record is missing."
        className="mt-8"
      />
    );
  }

  const da = structure
    ? Math.round((structure.basicPayPaise * structure.daPercent) / 100)
    : 0;
  const hra = structure
    ? Math.round((structure.basicPayPaise * structure.hraPercent) / 100)
    : 0;

  return (
    <>
      <div className="no-print mb-5 flex items-center justify-between gap-3">
        <Link
          href={`/console/salary/${bill.id}`}
          className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[12px] font-semibold text-[var(--ink-secondary)] hover:bg-[var(--fill)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Salary bill
        </Link>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print payslip
        </Button>
      </div>

      <div className="mx-auto max-w-[760px] rounded-[20px] border border-[var(--separator)] bg-[var(--surface)] p-6 shadow-[var(--shadow-raised)] print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none sm:p-9">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--separator)] pb-5">
          <div className="flex items-center gap-3">
            <SchoolSeal size={56} />
            <div>
              <p className="font-bengali text-[18px] font-semibold" lang="bn">
                নবগ্রাম উচ্চ বিদ্যালয় (ডেমো)
              </p>
              <p className="text-[11px] text-[var(--ink-secondary)]">
                Nabagram Uchcha Vidyalaya (Demo) · Purba Bardhaman
              </p>
              <p className="text-[10px] text-[var(--ink-tertiary)]">
                WB-NAB-001 · Est. 1948
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold tracking-[0.08em] text-[var(--ink-tertiary)]">
              PAYSLIP
            </p>
            <p className="font-bengali text-[13px] font-semibold" lang="bn">
              বেতন স্লিপ
            </p>
            <Badge tone="success" className="mt-2">
              {bill.status}
            </Badge>
          </div>
        </header>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] text-[var(--ink-tertiary)]">
              Employee / কর্মী
            </p>
            <p className="font-bengali text-[15px] font-semibold" lang="bn">
              {staff.nameBn}
            </p>
            <p className="text-[11px] text-[var(--ink-secondary)]">
              {staff.nameEn}
            </p>
            <p className="mt-2 text-[10px] text-[var(--ink-tertiary)]">
              {staff.employeeId} · {staff.designation}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--ink-tertiary)]">
              Pay period / বেতনকাল
            </p>
            <p className="text-[13px] font-semibold">
              {bill.month}/{bill.year}
            </p>
            <p className="mt-2 text-[10px] text-[var(--ink-tertiary)]">
              Pay level / পে লেভেল
            </p>
            <p className="text-[12px] font-medium">
              {structure?.payLevel ?? staff.payLevel}
            </p>
            <p className="mt-2 text-[10px] text-[var(--ink-tertiary)]">
              Payable days
            </p>
            <p className="text-[12px] font-medium">
              {line.payableDays} · {line.leaveDays} leave
            </p>
          </div>
        </div>

        <table className="mt-6 w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-y border-[var(--separator)] text-left text-[10px] text-[var(--ink-tertiary)]">
              <th className="py-2 font-semibold">Earnings</th>
              <th className="py-2 text-right font-semibold">Amount</th>
              <th className="py-2 pl-6 font-semibold">Deductions</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--separator)]">
              <td className="py-2">Basic pay</td>
              <td className="tabular py-2 text-right">
                {formatINR(structure?.basicPayPaise ?? 0)}
              </td>
              <td className="py-2 pl-6">Standard deductions</td>
              <td className="tabular py-2 text-right">
                {formatINR(line.deductionsPaise)}
              </td>
            </tr>
            <tr className="border-b border-[var(--separator)]">
              <td className="py-2">Dearness allowance</td>
              <td className="tabular py-2 text-right">{formatINR(da)}</td>
              <td />
              <td />
            </tr>
            <tr className="border-b border-[var(--separator)]">
              <td className="py-2">House rent allowance</td>
              <td className="tabular py-2 text-right">{formatINR(hra)}</td>
              <td />
              <td />
            </tr>
            <tr className="border-b border-[var(--separator)]">
              <td className="py-2">Medical and other</td>
              <td className="tabular py-2 text-right">
                {formatINR(
                  (structure?.medicalPaise ?? 0) +
                    (structure?.otherAllowancePaise ?? 0),
                )}
              </td>
              <td />
              <td />
            </tr>
          </tbody>
        </table>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[12px] bg-[var(--fill)] p-3">
            <p className="text-[10px] text-[var(--ink-tertiary)]">Gross</p>
            <p className="tabular mt-1 text-[18px] font-semibold">
              {formatINR(line.earningsPaise)}
            </p>
          </div>
          <div className="rounded-[12px] bg-[var(--green-tint)] p-3">
            <p className="text-[10px] text-[var(--green-text)]">Net pay</p>
            <p className="tabular mt-1 text-[18px] font-semibold text-[var(--green-text)]">
              {formatINR(line.netPayPaise)}
            </p>
          </div>
        </div>

        <footer className="mt-7 flex flex-wrap items-end justify-between gap-4 border-t border-[var(--separator)] pt-4 text-[10px]">
          <div>
            <p className="text-[var(--ink-tertiary)]">Prepared by</p>
            <p className="mt-1 text-[12px] font-semibold">
              {db.staff.find((person) => person.id === bill.preparedBy)
                ?.nameEn ?? "Accounts"}
            </p>
          </div>
          <div>
            <p className="text-[var(--ink-tertiary)]">Approved by</p>
            <p className="mt-1 text-[12px] font-semibold">
              {bill.approvedBy
                ? db.staff.find((person) => person.id === bill.approvedBy)
                    ?.nameEn
                : "Pending"}
            </p>
          </div>
          <p className="max-w-[240px] text-[9px] leading-relaxed text-[var(--ink-tertiary)]">
            Computer-generated demo payslip. Not a government document.
          </p>
        </footer>
      </div>
    </>
  );
}
