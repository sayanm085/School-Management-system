"use client";

import { RotateCcw, Settings as SettingsIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { can } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import { formatINR } from "@/lib/format";

export default function SettingsPage() {
  const router = useRouter();
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const commit = useDemoStore((state) => state.commit);
  const resetDemo = useDemoStore((state) => state.resetDemo);
  const [phone, setPhone] = useState(db.school.phone);
  const [email, setEmail] = useState(db.school.email);
  const [address, setAddress] = useState(db.school.address);
  const [confirmReset, setConfirmReset] = useState(false);

  if (
    !session ||
    (!can(session.role, "settings.manage") &&
      !can(session.role, "settings.fees"))
  ) {
    return <PermissionDenied />;
  }

  const canManage = can(session.role, "settings.manage");

  function saveSchool() {
    commit(
      (next) => {
        next.school.phone = phone.trim();
        next.school.email = email.trim();
        next.school.address = address.trim();
      },
      {
        action: "settings.school.updated",
        entityType: "school",
        entityId: db.school.id,
        summary: "School contact details updated",
      },
    );
    toast.success("School profile saved");
  }

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        subtitle={
          canManage
            ? "School identity, academic structure, fee heads and the demo reset."
            : "You can review fee heads. School-level changes require the Headmaster."
        }
        actions={<Badge tone="info">{db.academicYear.label}</Badge>}
      />

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>School profile</CardTitle>
              <SettingsIcon
                className="h-4 w-4 text-[var(--ink-tertiary)]"
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone">
                  {(props) => (
                    <Input
                      {...props}
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      disabled={!canManage}
                    />
                  )}
                </Field>
                <Field label="Email">
                  {(props) => (
                    <Input
                      {...props}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={!canManage}
                      type="email"
                    />
                  )}
                </Field>
              </div>
              <Field label="Address">
                {(props) => (
                  <Input
                    {...props}
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    disabled={!canManage}
                  />
                )}
              </Field>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[10px] text-[var(--ink-tertiary)]">
                  {db.school.nameEn} · {db.school.code} · UDISE{" "}
                  {db.school.udise}
                </p>
                <Button onClick={saveSchool} disabled={!canManage}>
                  Save school profile
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Academic structure</CardTitle>
              <Badge tone="neutral">{db.sections.length} sections</Badge>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[12px] font-semibold">Classes and sections</p>
                <ul className="mt-2 space-y-1.5 text-[11px] text-[var(--ink-secondary)]">
                  {db.sections.map((section) => (
                    <li key={section.id} className="flex justify-between gap-3">
                      <span>{section.id}</span>
                      <span>Room {section.room} · capacity {section.capacity}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[12px] font-semibold">Subjects</p>
                <ul className="mt-2 space-y-1.5 text-[11px] text-[var(--ink-secondary)]">
                  {db.subjects.map((subject) => (
                    <li key={subject.id} className="flex justify-between gap-3">
                      <span className="font-bengali" lang="bn">
                        {subject.nameBn}
                      </span>
                      <span>{subject.nameEn}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Fee heads</CardTitle>
              <Badge tone="neutral">{db.feeHeads.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {db.feeHeads.map((head) => {
                const structure = db.feeStructures.find(
                  (item) => item.feeHeadId === head.id,
                );
                return (
                  <div
                    key={head.id}
                    className="flex items-center justify-between gap-3 rounded-[12px] bg-[var(--fill)] px-3 py-2.5"
                  >
                    <div>
                      <p className="text-[12px] font-medium">{head.nameEn}</p>
                      <p className="font-bengali text-[10px] text-[var(--ink-tertiary)]" lang="bn">
                        {head.nameBn}
                      </p>
                    </div>
                    <span className="tabular text-[12px] font-semibold">
                      {formatINR(structure?.amountPaise ?? 0)}
                    </span>
                  </div>
                );
              })}
              <p className="pt-1 text-[10px] text-[var(--ink-tertiary)]">
                Fee heads are shown for reference in this build. Editing
                structures will arrive with the fee-structure workspace.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Roles</CardTitle>
              <Badge tone="info">4 sign-in roles</Badge>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {[
                ["Headmaster", "Full school operations and approvals"],
                ["Teacher", "Assigned classes, attendance and marks"],
                ["Clerk", "Admissions, fees, salary preparation"],
                ["Management", "Aggregate governance and audit"],
              ].map(([role, description]) => (
                <div key={role} className="rounded-[12px] bg-[var(--fill)] p-3">
                  <p className="text-[12px] font-semibold">{role}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--ink-secondary)]">
                    {description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {canManage ? (
            <Card>
              <CardHeader>
                <CardTitle>Demo</CardTitle>
                <Badge tone="warning">Local only</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-[11px] leading-relaxed text-[var(--ink-secondary)]">
                  Reset restores the seeded school, signs you out and clears
                  local attendance and collection changes.
                </p>
                <Button
                  variant="destructive"
                  className="mt-3 w-full"
                  onClick={() => setConfirmReset(true)}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Reset demo data
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogTitle>Reset the demo?</DialogTitle>
          <DialogDescription>
            All local changes in this browser will be cleared and you will be
            signed out.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmReset(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetDemo();
                router.push("/login");
              }}
            >
              Reset demo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
