"use client";

import {
  ArrowLeft,
  Check,
  GraduationCap,
  ShieldAlert,
  UserPlus,
  X,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { can } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import { TODAY } from "@/lib/data/selectors";
import { formatDate, formatShortDate, maskPhone } from "@/lib/format";

const statusTone = {
  submitted: "warning",
  verified: "info",
  approved: "success",
  waitlisted: "neutral",
  rejected: "danger",
  enrolled: "success",
} as const;

export default function AdmissionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const router = useRouter();
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const commit = useDemoStore((state) => state.commit);
  const [confirmApprove, setConfirmApprove] = useState(false);

  if (!session || !can(session.role, "admissions.view")) {
    return <PermissionDenied />;
  }

  const application = db.admissions.find((item) => item.id === id);
  if (!application) {
    return (
      <EmptyState
        icon={UserPlus}
        title="Application not found"
        description="This application does not exist in the demo records."
        action={
          <Button asChild variant="secondary">
            <Link href="/console/admissions">Back to admissions</Link>
          </Button>
        }
        className="mt-8"
      />
    );
  }

  const current = application;
  const canManage = can(session.role, "admissions.manage");
  const canApprove = can(session.role, "admissions.approve");
  const verified = current.documents.filter(
    (document) => document.verified,
  ).length;
  const allDocumentsVerified = current.documents.every(
    (document) => document.verified,
  );

  function verifyDocuments() {
    commit(
      (next) => {
        const target = next.admissions.find(
          (item) => item.id === current.id,
        );
        if (!target) return;
        target.documents = target.documents.map((document) => ({
          ...document,
          verified: true,
        }));
        target.status = "verified";
      },
      {
        action: "admission.verified",
        entityType: "admission",
        entityId: current.id,
        summary: `Documents verified for ${current.applicationNo}`,
      },
    );
    toast.success("Documents verified", {
      description: "The application is ready for the Headmaster's approval.",
    });
  }

  function waitlist() {
    commit(
      (next) => {
        const target = next.admissions.find(
          (item) => item.id === current.id,
        );
        if (!target) return;
        target.status = "waitlisted";
        target.decision = "Waitlisted — section capacity.";
      },
      {
        action: "admission.waitlisted",
        entityType: "admission",
        entityId: current.id,
        summary: `Application waitlisted · ${current.applicationNo}`,
      },
    );
    toast.success("Application waitlisted");
  }

  function approve() {
    if (!current.documents.every((document) => document.verified)) {
      toast.error("Verify every document before approving the admission.");
      return;
    }

    const section =
      db.sections.find(
        (item) =>
          item.classLevel === current.classApplied &&
          item.section === "A",
      ) ??
      db.sections.find(
        (item) => item.classLevel === current.classApplied,
      );

    if (!section) {
      toast.error("No section is available for this class.");
      return;
    }

    const sectionStudents = db.students.filter(
      (student) => student.sectionId === section.id,
    );
    const nextRoll = String(sectionStudents.length + 1).padStart(2, "0");
    const studentId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `stu-${Date.now()}`;
    const admissionNo = `NUV-${new Date().getFullYear()}-${String(
      db.students.length + 1,
    ).padStart(4, "0")}`;
    const avatar = `/avatars/student-${String(
      (db.students.length % 32) + 1,
    ).padStart(2, "0")}.svg`;

    commit(
      (next) => {
        next.students.push({
          id: studentId,
          admissionNo,
          rollNo: nextRoll,
          sectionId: section.id,
          nameBn: current.nameBn,
          nameEn: current.nameEn,
          gender: current.gender ?? "male",
          dob: current.dob ?? "2016-01-01",
          guardianName: current.guardianName,
          guardianPhone: current.guardianPhone,
          address: current.address,
          category: "general",
          status: "active",
          avatar,
          admissionDate: TODAY,
          attendanceSeed: 1000 + db.students.length,
          attendanceRisk: "normal",
          documents: current.documents,
        });
        const target = next.admissions.find(
          (item) => item.id === current.id,
        );
        if (target) {
          target.status = "enrolled";
          target.studentId = studentId;
          target.decision = `Enrolled in ${section.id} · Roll ${nextRoll} · ${admissionNo}`;
        }
      },
      {
        action: "admission.approved",
        entityType: "admission",
        entityId: current.id,
        summary: `Admission approved · ${current.nameEn} · ${section.id} · ${admissionNo}`,
      },
    );

    setConfirmApprove(false);
    toast.success("Student enrolled", {
      description: `${current.nameEn} · ${section.id} · Roll ${nextRoll}`,
    });
    router.push(`/console/students/${studentId}`);
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          href="/console/admissions"
          className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[12px] font-semibold text-[var(--ink-secondary)] transition-colors hover:bg-[var(--fill)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Admissions
        </Link>
        <StatusPill tone={statusTone[current.status] ?? "neutral"}>
          {current.status}
        </StatusPill>
      </div>

      <PageHeader
        eyebrow={`Application · ${current.applicationNo}`}
        title={current.nameEn}
        subtitle={`Applied for Class ${current.classApplied} · Received ${formatShortDate(current.createdAt)} · ${current.guardianName}`}
        actions={
          <>
            {canManage &&
            !allDocumentsVerified &&
            (current.status === "submitted" ||
              current.status === "verified") ? (
              <Button variant="secondary" onClick={verifyDocuments}>
                <Check className="h-4 w-4" aria-hidden="true" />
                Verify documents
              </Button>
            ) : null}
            {canManage &&
            (current.status === "submitted" ||
              current.status === "verified") ? (
              <Button variant="ghost" onClick={waitlist}>
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                Waitlist
              </Button>
            ) : null}
            {canApprove && current.status === "verified" ? (
              <Button
                onClick={() => setConfirmApprove(true)}
                disabled={!allDocumentsVerified}
              >
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
                Approve and enrol
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mt-6 grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Applicant</CardTitle>
              <Badge tone="neutral">
                {verified} / {current.documents.length} documents verified
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar name={current.nameEn} size={64} />
              <div className="min-w-0 flex-1">
                <p className="font-bengali text-[22px] font-semibold" lang="bn">
                  {current.nameBn}
                </p>
                <p className="text-[13px] text-[var(--ink-secondary)]">
                  {current.nameEn}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge>Class {current.classApplied}</Badge>
                  <Badge tone="info">{current.applicationNo}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <span className="text-[10px] text-[var(--ink-tertiary)]">
                Verification checklist
              </span>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {current.documents.map((document) => (
                  <li
                    key={document.type}
                    className="flex items-center justify-between gap-3 rounded-[12px] bg-[var(--fill)] px-3 py-2.5"
                  >
                    <span className="text-[12px]">{document.label}</span>
                    {document.verified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--green-text)]">
                        <Check className="h-3 w-3" aria-hidden="true" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--orange-strong)]">
                        <X className="h-3 w-3" aria-hidden="true" />
                        Pending
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Decision</CardTitle>
              <StatusPill tone={statusTone[current.status] ?? "neutral"}>
                {current.status}
              </StatusPill>
            </CardHeader>
            <CardContent className="space-y-2 text-[12px]">
              <p className="text-[var(--ink-secondary)]">
                {current.decision ??
                  current.notes ??
                  "No decision has been recorded yet."}
              </p>
              {current.studentId ? (
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/console/students/${current.studentId}`}>
                    Open student record
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Guardian and contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-[11px]">
            {[
              ["Guardian", current.guardianName],
              ["Phone", maskPhone(current.guardianPhone)],
              ["Address", current.address],
              ["Received", formatDate(current.createdAt)],
              ["Class applied", current.classApplied],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-3"
              >
                <span className="text-[var(--ink-secondary)]">{label}</span>
                <span className="max-w-[65%] text-right font-medium">
                  {value}
                </span>
              </div>
            ))}
            {!allDocumentsVerified ? (
              <div className="rounded-[12px] bg-[var(--orange-tint)] p-3 text-[10px] leading-relaxed text-[var(--orange-strong)]">
                Verify every document before approval. {verified} of{" "}
                {current.documents.length} are verified.
              </div>
            ) : !canApprove && current.status === "verified" ? (
              <div className="rounded-[12px] bg-[var(--blue-tint)] p-3 text-[10px] leading-relaxed text-[var(--blue-text)]">
                Documents are verified. The Headmaster must approve the
                admission before a student record is created.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmApprove} onOpenChange={setConfirmApprove}>
        <DialogContent>
          <DialogTitle>Approve this admission?</DialogTitle>
          <DialogDescription>
            This creates a student record for {current.nameEn} in Class{" "}
            {current.classApplied}, assigns the next roll number, and
            writes an audit event. The decision cannot be undone in the demo.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmApprove(false)}
            >
              Cancel
            </Button>
            <Button onClick={approve}>
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              Approve and create student
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
