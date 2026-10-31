"use client";

import { ChevronRight, UserPlus, Users } from "lucide-react";
import Link from "next/link";

import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { can } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import { formatShortDate } from "@/lib/format";

const tone = {
  submitted: "warning",
  verified: "info",
  approved: "success",
  waitlisted: "neutral",
  rejected: "danger",
  enrolled: "success",
} as const;

export default function AdmissionsPage() {
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);

  if (!session || !can(session.role, "admissions.view")) {
    return <PermissionDenied />;
  }

  const waiting = db.admissions.filter(
    (application) =>
      application.status === "submitted" ||
      application.status === "verified",
  ).length;
  const verified = db.admissions.filter(
    (application) => application.status === "verified",
  ).length;
  const enrolled = db.admissions.filter(
    (application) => application.status === "enrolled",
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="Admissions · Session 2027"
        title="Admissions"
        subtitle="Verify documents, decide on applications and create the student record with its admission number and roll in one audited step."
        actions={
          can(session.role, "admissions.manage") ? (
            <Button asChild>
              <Link href="/console/admissions/new">
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                New application
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Applications"
          value={db.admissions.length}
          subtitle="This admission cycle"
          visual={<Users className="h-5 w-5 text-[var(--blue)]" />}
        />
        <SummaryCard
          title="Waiting"
          value={waiting}
          subtitle="Submitted or verified"
          visual={<Badge tone="warning">{waiting} open</Badge>}
        />
        <SummaryCard
          title="Ready to approve"
          value={verified}
          subtitle="Documents verified"
          visual={<Badge tone="info">{verified}</Badge>}
        />
        <SummaryCard
          title="Enrolled"
          value={enrolled}
          subtitle="Converted to student records"
          visual={<Badge tone="success">{enrolled}</Badge>}
        />
      </div>

      <Card className="mt-4">
        {db.admissions.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={UserPlus}
              title="No applications yet"
              description="New admission applications will appear here for verification."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--separator)] text-[10px] text-[var(--ink-tertiary)]">
                  <th className="px-5 py-2.5 font-semibold">Applicant</th>
                  <th className="px-3 py-2.5 font-semibold">Class</th>
                  <th className="px-3 py-2.5 font-semibold">Guardian</th>
                  <th className="px-3 py-2.5 font-semibold">Received</th>
                  <th className="px-3 py-2.5 font-semibold">Documents</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--separator)]">
                {db.admissions.map((application) => {
                  const verifiedDocs = application.documents.filter(
                    (document) => document.verified,
                  ).length;
                  return (
                    <tr
                      key={application.id}
                      className="transition-colors duration-150 hover:bg-[var(--fill)]"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/console/admissions/${application.id}`}
                          className="flex items-center gap-3"
                        >
                          <Avatar
                            name={application.nameEn}
                            size={34}
                          />
                          <span>
                            <span className="block font-bengali text-[13px] font-semibold" lang="bn">
                              {application.nameBn}
                            </span>
                            <span className="block text-[10px] text-[var(--ink-secondary)]">
                              {application.nameEn} · {application.applicationNo}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-[12px] font-semibold">
                        {application.classApplied}
                      </td>
                      <td className="px-3 py-3 text-[11px] text-[var(--ink-secondary)]">
                        {application.guardianName}
                      </td>
                      <td className="px-3 py-3 text-[10px] text-[var(--ink-secondary)]">
                        {formatShortDate(application.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--fill)]">
                            <span
                              className="block h-full rounded-full bg-[var(--green)]"
                              style={{
                                width: `${(verifiedDocs / application.documents.length) * 100}%`,
                              }}
                            />
                          </span>
                          <span className="text-[10px] text-[var(--ink-secondary)]">
                            {verifiedDocs}/{application.documents.length}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill
                          tone={tone[application.status] ?? "neutral"}
                        >
                          {application.status}
                        </StatusPill>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/console/admissions/${application.id}`}
                          aria-label={`Open ${application.nameEn}`}
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
      </Card>
    </>
  );
}
