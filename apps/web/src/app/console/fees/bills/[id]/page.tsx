"use client";

import { ArrowLeft, IndianRupee, Printer, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
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
import { Field, Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { Select } from "@/components/ui/Select";
import { can } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import {
  billStatusTone,
  studentById,
} from "@/lib/data/selectors";
import { formatDate, formatINR } from "@/lib/format";

export default function BillPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const router = useRouter();
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const commit = useDemoStore((state) => state.commit);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");

  if (!session || !can(session.role, "fees.view")) {
    return <PermissionDenied />;
  }

  const bill = db.bills.find((item) => item.id === id);
  const student = bill ? studentById(db, bill.studentId) : null;
  const payments = bill
    ? db.payments.filter((payment) => payment.billId === bill.id)
    : [];

  if (!bill || !student) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="Bill not found"
        description="This bill does not exist in the demo records."
        action={
          <Button asChild variant="secondary">
            <Link href="/console/fees">Back to fees</Link>
          </Button>
        }
        className="mt-8"
      />
    );
  }

  const paidPaise = payments
    .filter((payment) => payment.status === "posted")
    .reduce((sum, payment) => sum + payment.amountPaise, 0);

  function collect() {
    if (!bill || !student || !session) return;
    const rupees =
      amount.trim() === "" ? bill.duePaise / 100 : Number(amount);
    const paise = Math.round(rupees * 100);
    if (!Number.isFinite(paise) || paise <= 0) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    if (paise > bill.duePaise) {
      toast.error("The amount is more than the outstanding balance.");
      return;
    }
    const paymentId = `pay-${Date.now()}`;
    const receiptNo = `R-2026-${String(db.payments.length + 1).padStart(4, "0")}`;
    const paidAt = new Date().toISOString();

    commit(
      (next) => {
        next.payments.unshift({
          id: paymentId,
          receiptNo,
          billId: bill.id,
          studentId: student.id,
          amountPaise: paise,
          method: method as "cash" | "upi" | "cheque",
          reference: reference.trim() || `DEMO-${receiptNo}`,
          paidAt,
          collectedBy: session.staffId,
          status: "posted",
        });
        const target = next.bills.find((item) => item.id === bill.id);
        if (target) {
          target.duePaise = Math.max(0, target.duePaise - paise);
          target.status = target.duePaise === 0 ? "paid" : "partial";
        }
      },
      {
        action: "fee.payment.collected",
        entityType: "payment",
        entityId: paymentId,
        summary: `Fee payment collected · ${formatINR(paise)} · ${receiptNo} · ${student.nameEn}`,
      },
    );

    toast.success("Payment collected", {
      description: `${receiptNo} · ${formatINR(paise)} · ${student.nameEn}`,
    });
    router.push(`/console/fees/receipts/${paymentId}`);
  }

  return (
    <>
      <div className="no-print mb-5 flex items-center justify-between gap-3">
        <Link
          href="/console/fees"
          className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[12px] font-semibold text-[var(--ink-secondary)] transition-colors hover:bg-[var(--fill)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Fees
        </Link>
        <StatusPill tone={billStatusTone(bill.status)}>
          {bill.status}
        </StatusPill>
      </div>

      <PageHeader
        eyebrow={`Bill · ${bill.period}`}
        title={bill.billNo}
        subtitle={`${student.nameBn} · ${student.nameEn} · ${student.sectionId} · Due ${formatDate(bill.dueDate)}`}
        actions={
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print bill
          </Button>
        }
      />

      <div className="mt-6 grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Student</CardTitle>
              <Badge tone="neutral">{student.admissionNo}</Badge>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Avatar
                name={student.nameEn}
                src={student.avatar}
                size={46}
              />
              <div className="min-w-0 flex-1">
                <p className="font-bengali text-[16px] font-semibold" lang="bn">
                  {student.nameBn}
                </p>
                <p className="text-[11px] text-[var(--ink-secondary)]">
                  {student.nameEn} · Class {student.sectionId} · Roll{" "}
                  {student.rollNo}
                </p>
              </div>
              <Link
                href={`/console/students/${student.id}`}
                className="text-[11px] font-semibold text-[var(--blue-text)]"
              >
                Open record
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bill items</CardTitle>
              <span className="text-[11px] text-[var(--ink-tertiary)]">
                {bill.period}
              </span>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <ul className="divide-y divide-[var(--separator)]">
                {bill.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-5 py-3 text-[12px]"
                  >
                    <span>{item.nameEn}</span>
                    <span className="tabular">{formatINR(item.amountPaise)}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-2 border-t border-[var(--separator)] px-5 py-4 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[var(--ink-secondary)]">Total</span>
                  <span className="tabular font-semibold">
                    {formatINR(bill.totalPaise)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ink-secondary)]">
                    Concession
                  </span>
                  <span className="tabular">
                    − {formatINR(bill.concessionPaise)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ink-secondary)]">Paid</span>
                  <span className="tabular text-[var(--green-text)]">
                    {formatINR(paidPaise)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[var(--separator)] pt-2">
                  <span className="font-semibold">Balance</span>
                  <span className="tabular text-[15px] font-semibold text-[var(--orange-strong)]">
                    {formatINR(bill.duePaise)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Receipts</CardTitle>
              <Badge tone="neutral">{payments.length}</Badge>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              {payments.length === 0 ? (
                <p className="px-5 py-5 text-[12px] text-[var(--ink-secondary)]">
                  No payment has been recorded for this bill yet.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--separator)]">
                  {payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex items-center justify-between gap-3 px-5 py-3 text-[12px]"
                    >
                      <div>
                        <p className="font-semibold">{payment.receiptNo}</p>
                        <p className="text-[10px] text-[var(--ink-tertiary)]">
                          {formatDate(payment.paidAt)} ·{" "}
                          {payment.method.toUpperCase()}
                        </p>
                      </div>
                      <span className="tabular">
                        {formatINR(payment.amountPaise)}
                      </span>
                      <Link
                        href={`/console/fees/receipts/${payment.id}`}
                        className="text-[11px] font-semibold text-[var(--blue-text)]"
                      >
                        Receipt
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Collect payment</CardTitle>
            <IndianRupee
              className="h-4 w-4 text-[var(--ink-tertiary)]"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {bill.duePaise === 0 ? (
              <div className="rounded-[12px] bg-[var(--green-tint)] p-3.5 text-[12px] text-[var(--green-text)]">
                This bill is fully paid. A receipt is available above.
              </div>
            ) : (
              <>
                <Field
                  label="Amount (₹)"
                  hint={`Balance ${formatINR(bill.duePaise)}`}
                >
                  {(props) => (
                    <Input
                      {...props}
                      type="number"
                      inputMode="decimal"
                      min="1"
                      max={bill.duePaise / 100}
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder={String(bill.duePaise / 100)}
                    />
                  )}
                </Field>
                <div>
                  <p className="mb-1.5 text-[13px] font-semibold">Method</p>
                  <Select
                    value={method}
                    onChange={(event) => setMethod(event.target.value)}
                    aria-label="Payment method"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="cheque">Cheque</option>
                  </Select>
                </div>
                <Field
                  label="Reference"
                  hint="Optional for cash; use the UPI or cheque reference."
                >
                  {(props) => (
                    <Input
                      {...props}
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                      placeholder="TXN-201884"
                    />
                  )}
                </Field>
                <Button className="w-full" size="lg" onClick={collect}>
                  <ReceiptText className="h-4 w-4" aria-hidden="true" />
                  Collect {amount ? `₹${amount}` : formatINR(bill.duePaise)}
                </Button>
                <p className="text-[10px] leading-relaxed text-[var(--ink-tertiary)]">
                  Recording a payment issues a numbered receipt and writes an
                  audit event. No real money is processed in this demo.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
