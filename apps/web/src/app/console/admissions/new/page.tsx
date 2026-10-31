"use client";

import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { can } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";

export default function NewAdmissionPage() {
  const router = useRouter();
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const commit = useDemoStore((state) => state.commit);
  const [nameBn, setNameBn] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [classApplied, setClassApplied] = useState("V");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gender, setGender] = useState("male");
  const [dob, setDob] = useState("2016-01-01");
  const [notes, setNotes] = useState("");

  if (!session || !can(session.role, "admissions.manage")) {
    return <PermissionDenied />;
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !nameBn.trim() ||
      !nameEn.trim() ||
      !guardianName.trim() ||
      !guardianPhone.trim()
    ) {
      toast.error("Complete the applicant and guardian details.");
      return;
    }

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `adm-${Date.now()}`;
    const applicationNo = `ADM/2027/${String(
      db.admissions.length + 1,
    ).padStart(3, "0")}`;

    commit(
      (next) => {
        next.admissions.unshift({
          id,
          applicationNo,
          nameBn: nameBn.trim(),
          nameEn: nameEn.trim(),
          classApplied,
          guardianName: guardianName.trim(),
          guardianPhone: guardianPhone.trim(),
          address: address.trim() || "Nabagram, Purba Bardhaman",
          status: "submitted",
          documents: [
            { type: "birth_certificate", label: "Birth certificate", verified: false },
            { type: "aadhaar", label: "Aadhaar (masked)", verified: false },
            { type: "previous_report", label: "Previous report card", verified: false },
            { type: "guardian_id", label: "Guardian ID", verified: false },
          ],
          notes: notes.trim() || undefined,
          createdAt: new Date().toISOString(),
          gender: gender as "male" | "female",
          dob,
        });
      },
      {
        action: "admission.created",
        entityType: "admission",
        entityId: id,
        summary: `Application created · ${nameEn.trim()} · Class ${classApplied}`,
      },
    );

    toast.success("Application created", {
      description: `${applicationNo} · ${nameEn.trim()} · Class ${classApplied}`,
    });
    router.push(`/console/admissions/${id}`);
  }

  return (
    <>
      <div className="mb-5">
        <Link
          href="/console/admissions"
          className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[12px] font-semibold text-[var(--ink-secondary)] transition-colors hover:bg-[var(--fill)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Admissions
        </Link>
      </div>

      <PageHeader
        eyebrow="New admission · Session 2027"
        title="Create an application"
        subtitle="Record the applicant and guardian details. Documents are verified on the application record before approval."
      />

      <Card className="mt-6 max-w-3xl">
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bengali name">
                {(props) => (
                  <Input
                    {...props}
                    value={nameBn}
                    onChange={(event) => setNameBn(event.target.value)}
                    placeholder="ঐশিকী দাস"
                    className="font-bengali"
                    lang="bn"
                    required
                  />
                )}
              </Field>
              <Field label="English name">
                {(props) => (
                  <Input
                    {...props}
                    value={nameEn}
                    onChange={(event) => setNameEn(event.target.value)}
                    placeholder="Aishiki Das"
                    required
                  />
                )}
              </Field>
              <div>
                <p className="mb-1.5 text-[13px] font-semibold">
                  Class applied for
                </p>
                <Select
                  value={classApplied}
                  onChange={(event) => setClassApplied(event.target.value)}
                  aria-label="Class applied for"
                >
                  {["V", "VI", "VII", "VIII", "IX", "X"].map((classLevel) => (
                    <option key={classLevel} value={classLevel}>
                      Class {classLevel}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <p className="mb-1.5 text-[13px] font-semibold">Gender</p>
                <Select
                  value={gender}
                  onChange={(event) => setGender(event.target.value)}
                  aria-label="Gender"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </Select>
              </div>
              <Field label="Guardian name">
                {(props) => (
                  <Input
                    {...props}
                    value={guardianName}
                    onChange={(event) => setGuardianName(event.target.value)}
                    placeholder="Tapas Das"
                    required
                  />
                )}
              </Field>
              <Field label="Guardian phone">
                {(props) => (
                  <Input
                    {...props}
                    value={guardianPhone}
                    onChange={(event) => setGuardianPhone(event.target.value)}
                    placeholder="9831122001"
                    inputMode="tel"
                    required
                  />
                )}
              </Field>
              <Field label="Date of birth">
                {(props) => (
                  <Input
                    {...props}
                    type="date"
                    value={dob}
                    onChange={(event) => setDob(event.target.value)}
                  />
                )}
              </Field>
            </div>

            <Field label="Address">
              {(props) => (
                <Textarea
                  {...props}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="House 42, Kalitala, Nabagram, Purba Bardhaman"
                  className="min-h-[72px]"
                />
              )}
            </Field>
            <Field
              label="Notes"
              hint="Optional. Add anything the verification desk should know."
            >
              {(props) => (
                <Textarea
                  {...props}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Guardian will bring the previous report card on Monday."
                  className="min-h-[72px]"
                />
              )}
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--separator)] pt-4">
              <p className="text-[10px] text-[var(--ink-tertiary)]">
                Four document checks will be created and must be verified
                before the Headmaster can approve the admission.
              </p>
              <Button type="submit">
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Create application
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
