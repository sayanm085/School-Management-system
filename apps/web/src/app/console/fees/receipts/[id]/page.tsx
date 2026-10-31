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
import { studentById } from "@/lib/data/selectors";
import { formatDate, formatINR } from "@/lib/format";

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);

  if (!session || !can(session.role, "fees.view")) {
    return <PermissionDenied />;
  }

  const payment = db.payments.find((item) => item.id === id);
  const bill = payment
    ? db.bills.find((item) => item.id === payment.billId)
    : null;
  const student = payment ? studentById(db, payment.studentId) : null;

  if (!payment || !bill || !student) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="Receipt not found"
        description="This receipt does not exist in the demo records."
        action={
          <Button asChild variant="secondary">
            <Link href="/console/fees">Back to fees</Link>
          </Button>
        }
        className="mt-8"
      />
    );
  }

  const previousPaid = Math.max(
    0,
    bill.totalPaise -
      bill.concessionPaise -
      bill.duePaise -
      payment.amountPaise,
  );

  return (
    <>
      <div className="no-print mb-5 flex items-center justify-between gap-3">
        <Link
          href={`/console/fees/bills/${bill.id}`}
          className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[12px] font-semibold text-[var(--ink-secondary)] transition-colors hover:bg-[var(--fill)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to bill
        </Link>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print receipt
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
              FEE RECEIPT
            </p>
            <p className="font-bengali text-[13px] font-semibold" lang="bn">
              ফি রসিদ
            </p>
            <Badge tone="success" className="mt-2">
              Paid
            </Badge>
          </div>
        </header>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] text-[var(--ink-tertiary)]">
              Receipt No. / রসিদ নম্বর
            </p>
            <p className="font-mono text-[14px] font-semibold">
              {payment.receiptNo}
            </p>
            <p className="mt-3 text-[10px] text-[var(--ink-tertiary)]">
              Date / তারিখ
            </p>
            <p className="text-[12px] font-medium">
              {formatDate(payment.paidAt)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--ink-tertiary)]">
              Student / শিক্ষার্থী
            </p>
            <p className="font-bengali text-[15px] font-semibold" lang="bn">
              {student.nameBn}
            </p>
            <p className="text-[11px] text-[var(--ink-secondary)]">
              {student.nameEn}
            </p>
            <p className="mt-3 text-[10px] text-[var(--ink-tertiary)]">
              Class / শ্রেণি
            </p>
            <p className="text-[12px] font-medium">
              {student.sectionId} · Roll {student.rollNo} ·{" "}
              {student.admissionNo}
            </p>
          </div>
        </div>

        <table className="mt-6 w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-y border-[var(--separator)] text-left text-[10px] text-[var(--ink-tertiary)]">
              <th className="py-2 font-semibold">Particulars</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--separator)]">
                <td className="py-2">{item.nameEn}</td>
                <td className="tabular py-2 text-right">
                  {formatINR(item.amountPaise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto max-w-[320px] space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-[var(--ink-secondary)]">Bill total</span>
            <span className="tabular">{formatINR(bill.totalPaise)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--ink-secondary)]">Concession</span>
            <span className="tabular">
              − {formatINR(bill.concessionPaise)}
            </span>
          </div>
          {previousPaid > 0 ? (
            <div className="flex justify-between">
              <span className="text-[var(--ink-secondary)]">Paid earlier</span>
              <span className="tabular">{formatINR(previousPaid)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-[var(--separator)] pt-1.5 text-[13px] font-semibold">
            <span>This receipt</span>
            <span className="tabular">{formatINR(payment.amountPaise)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[var(--ink-secondary)]">
              Balance after payment
            </span>
            <span className="tabular">{formatINR(bill.duePaise)}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-[var(--separator)] pt-5 text-[10px]">
          <div>
            <p className="text-[var(--ink-tertiary)]">
              Method / মাধ্যম
            </p>
            <p className="mt-0.5 text-[12px] font-semibold uppercase">
              {payment.method}
            </p>
            <p className="mt-1 text-[var(--ink-secondary)]">
              Ref. {payment.reference}
            </p>
          </div>
          <div>
            <p className="text-[var(--ink-tertiary)]">
              Received by / গ্রহণকারী
            </p>
            <p className="mt-0.5 text-[12px] font-semibold">
              {db.staff.find((person) => person.id === payment.collectedBy)
                ?.nameEn ?? "Office"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="grid h-16 w-16 grid-cols-6 gap-[2px] rounded-[4px] border border-[var(--separator)] p-1">
              {Array.from({ length: 36 }).map((_, index) => (
                <span
                  key={index}
                  className={
                    (index * 7 + payment.receiptNo.length) % 3 === 0
                      ? "bg-[var(--ink)]"
                      : "bg-transparent"
                  }
                />
              ))}
            </div>
            <p className="text-[9px] text-[var(--ink-tertiary)]">
              Demo verification
            </p>
          </div>
        </div>

        <footer className="mt-6 border-t border-[var(--separator)] pt-3 text-[9px] leading-relaxed text-[var(--ink-tertiary)]">
          Computer-generated demo receipt. Not a government document. This
          receipt records a payment inside the Baranda demo only.
        </footer>
      </div>
    </>
  );
}
