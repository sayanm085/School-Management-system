"use client";

import {
  ChevronRight,
  Download,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AttendanceHeatRegister } from "@/components/students/AttendanceHeatRegister";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { Select } from "@/components/ui/Select";
import { can, canAccessSection } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import {
  attendanceSummary,
  effectiveHistory,
  feeLedgerForStudent,
  staffById,
  teacherSections,
} from "@/lib/data/selectors";
import { formatINR, formatPercent } from "@/lib/format";

export default function StudentsPage() {
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const commit = useDemoStore((state) => state.commit);
  const [query, setQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const staff = staffById(db, session?.staffId);

  if (!session || !can(session.role, "students.view")) {
    return <PermissionDenied />;
  }

  const scoped = db.students.filter((student) =>
    canAccessSection(staff, student.sectionId),
  );
  const sections =
    session.role === "teacher"
      ? teacherSections(db, staff)
      : db.sections;

  const filtered = scoped
    .filter((student) => {
      const haystack =
        `${student.nameEn} ${student.nameBn} ${student.admissionNo} ${student.rollNo}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    })
    .filter(
      (student) =>
        sectionFilter === "all" || student.sectionId === sectionFilter,
    )
    .filter(
      (student) =>
        statusFilter === "all" || student.status === statusFilter,
    )
    .sort((a, b) =>
      `${a.sectionId}-${a.rollNo}`.localeCompare(`${b.sectionId}-${b.rollNo}`),
    );

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const activeCount = scoped.filter(
    (student) => student.status === "active",
  ).length;

  function exportCsv() {
    const header = [
      "Admission No",
      "English name",
      "Bengali name",
      "Class",
      "Roll",
      "Attendance",
      "Fee due",
      "Status",
    ];
    const lines = filtered.map((student) => {
      const attendance = attendanceSummary(db, student);
      const ledger = feeLedgerForStudent(db, student.id);
      return [
        student.admissionNo,
        student.nameEn,
        student.nameBn,
        student.sectionId,
        student.rollNo,
        formatPercent(attendance.percentage),
        formatINR(ledger.duePaise),
        student.status,
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
    anchor.download = "baranda-students.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    commit(
      () => undefined,
      {
        action: "students.export",
        entityType: "students",
        entityId: "list",
        summary: `Exported ${filtered.length} student records`,
      },
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Student records"
        title="Students"
        subtitle={`${activeCount} active students in your scope. Attendance and fee balances update from the same records the dashboards use.`}
        actions={
          can(session.role, "students.create") ? (
            <Button asChild>
              <Link href="/console/admissions">
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                New admission
              </Link>
            </Button>
          ) : undefined
        }
      />

      <Card className="mt-6">
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
              placeholder="Search name, roll or admission number"
              aria-label="Search students"
              className="h-10 pl-9 text-[13px]"
            />
          </div>
          <Select
            value={sectionFilter}
            onChange={(event) => {
              setSectionFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by section"
            className="w-auto min-w-[128px]"
          >
            <option value="all">All sections</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.id}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="w-auto min-w-[118px]"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="transferred">Transferred</option>
            <option value="alumni">Alumni</option>
          </Select>
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Users}
              title="No students match"
              description="Try a different name, section or status. New admissions appear here after approval."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--separator)] text-[10px] font-semibold text-[var(--ink-tertiary)]">
                  <th className="px-4 py-2.5 font-semibold">Student</th>
                  <th className="px-3 py-2.5 font-semibold">Class</th>
                  <th className="px-3 py-2.5 font-semibold">Attendance</th>
                  <th className="px-3 py-2.5 font-semibold">This week</th>
                  <th className="px-3 py-2.5 font-semibold">Fee due</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--separator)]">
                {rows.map((student) => {
                  const attendance = attendanceSummary(db, student);
                  const ledger = feeLedgerForStudent(db, student.id);
                  return (
                    <tr
                      key={student.id}
                      className="group transition-colors duration-150 hover:bg-[var(--fill)]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/console/students/${student.id}`}
                          className="flex items-center gap-3"
                        >
                          <Avatar
                            name={student.nameEn}
                            src={student.avatar}
                            size={36}
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-bengali text-[14px] font-semibold" lang="bn">
                              {student.nameBn}
                            </span>
                            <span className="block truncate text-[11px] text-[var(--ink-secondary)]">
                              {student.nameEn} · {student.admissionNo}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[12px] font-semibold">
                          {student.sectionId}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-[var(--ink-tertiary)]">
                          Roll {student.rollNo}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="tabular text-[12px] font-semibold">
                          {formatPercent(attendance.percentage)}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-[var(--ink-tertiary)]">
                          {attendance.absent} absent
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <AttendanceHeatRegister
                          rows={[
                            effectiveHistory(db, student).at(-1) ?? "------",
                          ]}
                          compact
                          showLegend={false}
                          hideWeekLabel
                        />
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={
                            ledger.duePaise > 0
                              ? "tabular text-[12px] font-semibold text-[var(--orange-strong)]"
                              : "tabular text-[12px] font-semibold text-[var(--green-text)]"
                          }
                        >
                          {ledger.duePaise > 0
                            ? formatINR(ledger.duePaise)
                            : "Paid"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill
                          tone={
                            student.status === "active" ? "success" : "neutral"
                          }
                        >
                          {student.status}
                        </StatusPill>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/console/students/${student.id}`}
                          aria-label={`Open ${student.nameEn}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--ink-tertiary)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)]"
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
              {filtered.length === 0
                ? 0
                : (currentPage - 1) * pageSize + 1}
              –{Math.min(currentPage * pageSize, filtered.length)}
            </span>{" "}
            of <span className="font-semibold text-[var(--ink)]">{filtered.length}</span>
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
