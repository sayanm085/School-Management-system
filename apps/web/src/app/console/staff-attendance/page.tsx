"use client";

import { CalendarCheck, Clock, Users } from "lucide-react";

import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { can } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import { staffById } from "@/lib/data/selectors";
import { formatDate, formatShortDate } from "@/lib/format";

export default function StaffAttendancePage() {
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);

  if (!session || !can(session.role, "staff_attendance.view")) {
    return <PermissionDenied />;
  }

  const rows = db.staff
    .filter((person) => person.role !== "management")
    .map((person) => {
      const record = db.staffAttendance.find(
        (item) => item.staffId === person.id && item.date === "2026-10-31",
      );
      return { person, record };
    });
  const present = rows.filter((row) => row.record?.status === "present").length;
  const leave = rows.filter((row) => row.record?.status === "leave").length;
  const absent = rows.filter((row) => row.record?.status === "absent").length;
  const pendingLeave = db.leaveRequests.filter(
    (request) => request.status === "pending",
  );

  return (
    <>
      <PageHeader
        eyebrow={`${formatDate("2026-10-31")} · Half day`}
        title="Staff attendance"
        subtitle="Daily check-in, approved leave and the staff record that feeds the monthly salary bill."
        actions={<Badge tone="info">{rows.length} staff</Badge>}
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Present"
          value={present}
          subtitle="Checked in today"
          visual={<Users className="h-5 w-5 text-[var(--green-text)]" />}
        />
        <SummaryCard
          title="On leave"
          value={leave}
          subtitle="Approved leave"
          visual={<CalendarCheck className="h-5 w-5 text-[var(--orange-strong)]" />}
        />
        <SummaryCard
          title="Absent"
          value={absent}
          subtitle="No check-in, no approved leave"
          visual={<Badge tone={absent ? "danger" : "success"}>{absent}</Badge>}
        />
        <SummaryCard
          title="Leave requests"
          value={pendingLeave.length}
          subtitle="Waiting for approval"
          visual={<Clock className="h-5 w-5 text-[var(--blue)]" />}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Today's staff</CardTitle>
            <span className="text-[11px] text-[var(--ink-tertiary)]">
              Saturday · 31 Oct 2026
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <ul className="divide-y divide-[var(--separator)]">
              {rows.map(({ person, record }) => (
                <li
                  key={person.id}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  <Avatar
                    name={person.nameEn}
                    src={person.avatar}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bengali text-[13px] font-semibold" lang="bn">
                      {person.nameBn}
                    </p>
                    <p className="truncate text-[10px] text-[var(--ink-secondary)]">
                      {person.nameEn} · {person.designation}
                    </p>
                  </div>
                  <div className="hidden text-right text-[10px] text-[var(--ink-tertiary)] sm:block">
                    <p>{record?.checkIn ? `In ${record.checkIn}` : "No check-in"}</p>
                    <p>{record?.note ?? ""}</p>
                  </div>
                  <StatusPill
                    tone={
                      record?.status === "present"
                        ? "success"
                        : record?.status === "leave"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {record?.status ?? "absent"}
                  </StatusPill>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Leave requests</CardTitle>
              <Badge tone="neutral">{db.leaveRequests.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {db.leaveRequests.map((request) => {
                const person = staffById(db, request.staffId);
                return (
                  <div
                    key={request.id}
                    className="rounded-[12px] bg-[var(--fill)] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold">
                        {person?.nameEn ?? "Staff"}
                      </p>
                      <StatusPill
                        tone={
                          request.status === "approved"
                            ? "success"
                            : request.status === "pending"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {request.status}
                      </StatusPill>
                    </div>
                    <p className="mt-1 text-[10px] text-[var(--ink-secondary)]">
                      {formatShortDate(request.fromDate)} –{" "}
                      {formatShortDate(request.toDate)} · {request.type}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--ink-tertiary)]">
                      {request.reason}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <RecentActivity limit={3} />
        </div>
      </div>
    </>
  );
}
