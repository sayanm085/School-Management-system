"use client";

import { ChevronRight, Download, IndianRupee, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { Select } from "@/components/ui/Select";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { can } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import {
  billStatusTone,
  feeSummary,
  overdueBills,
  studentById,
} from "@/lib/data/selectors";
import { formatDate, formatINR } from "@/lib/format";

export default function FeesPage() {
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const commit = useDemoStore((state) => state.commit);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  if (!session || !can(session.role, "fees.view")) {
    return <PermissionDenied />;
  }

  const summary = feeSummary(db);
  const overdue = overdueBills(db);
  const outstanding = db.bills.reduce((sum, bill) => sum + bill.duePaise, 0);
  const filtered = db.bills
    .filter((bill) => {
      const student = studentById(db, bill.studentId);
      const haystack =
        `${bill.billNo} ${student?.nameEn ?? ""} ${student?.nameBn ?? ""} ${student?.admissionNo ?? ""}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    })
    .filter((bill) => status === "all" || bill.status === status)
    .sort((a, b) => a.billNo.localeCompare(b.billNo));
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  function exportCsv() {
    const header = ["Bill", "Student", "Admission", "Total", "Concession", "Due", "Status", "Due date"];
    const lines = filtered.map((bill) => {
      const student = studentById(db, bill.studentId);
      return [
        bill.billNo,
        student?.nameEn ?? "",
        student?.admissionNo ?? "",
        bill.totalPaise / 100,
        bill.concessionPaise / 100,
        bill.duePaise / 100,
        bill.status,
        bill.dueDate,
      ];
    });
    const csv = [header, ...lines]
      .map((line) =>
        line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "baranda-fee-bills.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    commit(
      () => undefined,
      {
        action: "fees.export",
        entityType: "bills",
        entityId: "list",
        summary: `Exported ${filtered.length} fee bills`,
      },
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Fee desk · 2026–27 · Term 1"
        title="Fees"
        subtitle="Collect recorded payments, issue receipts and keep the school's dues visible. Online payment belongs to the student app."
        actions={
          <Button variant="secondary" onClick={exportCsv}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export bills
          </Button>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Collected this month"
          value={formatINR(summary.collectedPaise)}
          subtitle={`of ${formatINR(summary.demandPaise)} demand`}
          visual={<IndianRupee className="h-5 w-5 text-[var(--blue)]" />}
        />
        <SummaryCard
          title="Outstanding"
          value={formatINR(outstanding)}
          subtitle={`${db.bills.filter((bill) => bill.duePaise > 0).length} open bills`}
          visual={<Badge tone="warning">Follow up</Badge>}
        />
        <SummaryCard
          title="Overdue"
          value={overdue.length}
          subtitle="Past their due date"
          visual={<Badge tone="danger">{overdue.length} due</Badge>}
        />
        <SummaryCard
          title="Bills issued"
          value={db.bills.length}
          subtitle="Term 1 · all sections"
        />
      </div>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--separator)] p-3.5">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-tertiary)]"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search bill, student or admission number"
              aria-label="Search bills"
              className="h-10 pl-9 text-[13px]"
            />
          </div>
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by bill status"
            className="w-auto min-w-[130px]"
          >
            <option value="all">All statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="waived">Waived</option>
          </Select>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={IndianRupee}
              title="No bills match"
              description="Try a different search or status."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--separator)] text-[10px] text-[var(--ink-tertiary)]">
                  <th className="px-4 py-2.5 font-semibold">Student</th>
                  <th className="px-3 py-2.5 font-semibold">Bill</th>
                  <th className="px-3 py-2.5 font-semibold">Total</th>
                  <th className="px-3 py-2.5 font-semibold">Concession</th>
                  <th className="px-3 py-2.5 font-semibold">Due</th>
                  <th className="px-3 py-2.5 font-semibold">Due date</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--separator)]">
                {rows.map((bill) => {
                  const student = studentById(db, bill.studentId);
                  return (
                    <tr
                      key={bill.id}
                      className="transition-colors duration-150 hover:bg-[var(--fill)]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/console/fees/bills/${bill.id}`}
                          className="flex items-center gap-3"
                        >
                          {student ? (
                            <Avatar
                              name={student.nameEn}
                              src={student.avatar}
                              size={34}
                            />
                          ) : null}
                          <span className="min-w-0">
                            <span className="block truncate font-bengali text-[13px] font-semibold" lang="bn">
                              {student?.nameBn ?? "Unknown"}
                            </span>
                            <span className="block truncate text-[10px] text-[var(--ink-secondary)]">
                              {student?.nameEn} · {student?.sectionId}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-[11px]">
                        <p className="font-semibold">{bill.billNo}</p>
                        <p className="text-[10px] text-[var(--ink-tertiary)]">
                          {bill.period}
                        </p>
                      </td>
                      <td className="tabular px-3 py-3 text-[11px]">
                        {formatINR(bill.totalPaise)}
                      </td>
                      <td className="tabular px-3 py-3 text-[11px] text-[var(--ink-secondary)]">
                        {bill.concessionPaise
                          ? formatINR(bill.concessionPaise)
                          : "—"}
                      </td>
                      <td className="tabular px-3 py-3 text-[11px] font-semibold">
                        {formatINR(bill.duePaise)}
                      </td>
                      <td className="px-3 py-3 text-[10px] text-[var(--ink-secondary)]">
                        {formatDate(bill.dueDate)}
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill tone={billStatusTone(bill.status)}>
                          {bill.status}
                        </StatusPill>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/console/fees/bills/${bill.id}`}
                          aria-label={`Open ${bill.billNo}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--ink-tertiary)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                        >
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--separator)] px-4 py-3">
          <p className="text-[11px] text-[var(--ink-secondary)]">
            Showing{" "}
            <span className="font-semibold text-[var(--ink)]">
              {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, filtered.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-[var(--ink)]">
              {filtered.length}
            </span>
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </Button>
            <span className="px-2 text-[11px] text-[var(--ink-secondary)]">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
