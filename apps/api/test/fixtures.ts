import { randomUUID, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import type { Database } from "../src/db/client";
import type { AssignmentType, Role } from "../src/common/authz/permissions";
import {
  academicYears,
  guardians,
  schools,
  sections,
  staff,
  staffAssignments,
  studentGuardians,
  students,
  subjects,
  users,
} from "../src/db/schema";

export type SeededSchool = {
  schoolId: string;
  academicYearId: string;
};

export type SeededUser = {
  staffId: string;
  userId: string;
  employeeId: string;
};

export async function seedSchool(
  db: Database,
  code = `WB-TST-${randomBytes(4).toString("hex")}`,
): Promise<SeededSchool> {
  const schoolId = uuidv7();
  await db.insert(schools).values({
    id: schoolId,
    nameEn: "Test School",
    nameBn: "পরীক্ষা বিদ্যালয়",
    code,
    address: "Test Road",
    district: "Test District",
  });
  const academicYearId = uuidv7();
  await db.insert(academicYears).values({
    id: academicYearId,
    schoolId,
    label: "2026–27",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    isActive: true,
  });
  return { schoolId, academicYearId };
}

export async function seedStaffUser(
  db: Database,
  input: {
    schoolId: string;
    employeeId?: string;
    role: Role;
    passwordHash: string;
    designation?: string;
    mfaEnabled?: boolean;
    status?: "active" | "disabled";
  },
): Promise<SeededUser> {
  const staffId = uuidv7();
  const employeeId = input.employeeId ?? `T-${randomUUID().slice(0, 8)}`;
  await db.insert(staff).values({
    id: staffId,
    schoolId: input.schoolId,
    employeeId,
    nameEn: `${input.role} ${employeeId}`,
    nameBn: `${input.role} ${employeeId}`,
    designation: input.designation ?? "Test Staff",
    status: "active",
  });
  const userId = uuidv7();
  await db.insert(users).values({
    id: userId,
    schoolId: input.schoolId,
    staffId,
    employeeId,
    passwordHash: input.passwordHash,
    role: input.role,
    mfaEnabled: input.mfaEnabled ?? false,
    status: input.status ?? "active",
  });
  return { staffId, userId, employeeId };
}

export async function seedSection(
  db: Database,
  input: {
    schoolId: string;
    academicYearId: string;
    classLevel: string;
    section: string;
  },
): Promise<string> {
  const id = uuidv7();
  await db.insert(sections).values({
    id,
    schoolId: input.schoolId,
    academicYearId: input.academicYearId,
    classLevel: input.classLevel,
    section: input.section,
    room: `R-${input.classLevel}${input.section}`,
  });
  return id;
}

export async function seedSubject(
  db: Database,
  input: { schoolId: string; code: string },
): Promise<string> {
  const id = uuidv7();
  await db.insert(subjects).values({
    id,
    schoolId: input.schoolId,
    code: input.code,
    nameEn: input.code,
    nameBn: input.code,
  });
  return id;
}

export async function seedAssignment(
  db: Database,
  input: {
    schoolId: string;
    staffId: string;
    type: AssignmentType;
    sectionId?: string | null;
    subjectId?: string | null;
  },
): Promise<string> {
  const id = uuidv7();
  await db.insert(staffAssignments).values({
    id,
    schoolId: input.schoolId,
    staffId: input.staffId,
    type: input.type,
    sectionId: input.sectionId ?? null,
    subjectId: input.subjectId ?? null,
  });
  return id;
}

export async function seedStudent(
  db: Database,
  input: {
    schoolId: string;
    sectionId: string;
    admissionNo?: string;
    rollNo?: string;
    nameEn?: string;
    nameBn?: string;
    gender?: "male" | "female" | "other";
    dob?: string;
    category?: "general" | "obc" | "sc" | "st";
    status?: "active" | "transferred" | "alumni";
    address?: string | null;
  },
): Promise<{ id: string; admissionNo: string; rollNo: string }> {
  const id = uuidv7();
  // Random, not id-derived: a uuidv7's first 8 hex chars are the millisecond
  // timestamp prefix, shared by every id minted within the same ~65.5 s
  // window, so two default-admission students in one school would collide on
  // students_school_admission_uq. A random v4 slice cannot collide that way.
  const admissionNo = input.admissionNo ?? `NUV-SEED-${randomUUID().slice(0, 8)}`;
  const rollNo = input.rollNo ?? randomUUID().slice(0, 4);
  await db.insert(students).values({
    id,
    schoolId: input.schoolId,
    sectionId: input.sectionId,
    admissionNo,
    rollNo,
    nameEn: input.nameEn ?? "Seed Student",
    nameBn: input.nameBn ?? "সিড শিক্ষার্থী",
    gender: input.gender ?? "female",
    dob: input.dob ?? "2016-01-01",
    category: input.category ?? "general",
    status: input.status ?? "active",
    address: input.address ?? "Nabagram",
    admissionDate: "2026-04-01",
  });
  return { id, admissionNo, rollNo };
}

export async function seedGuardian(
  db: Database,
  input: {
    schoolId: string;
    studentId: string;
    nameEn?: string;
    nameBn?: string;
    phone?: string;
    relationship?: "father" | "mother" | "guardian" | "other";
    isPrimary?: boolean;
  },
): Promise<{ guardianId: string; linkId: string }> {
  const guardianId = uuidv7();
  await db.insert(guardians).values({
    id: guardianId,
    schoolId: input.schoolId,
    nameEn: input.nameEn ?? "Seed Guardian",
    nameBn: input.nameBn ?? "সিড অভিভাবক",
    phone: input.phone ?? "9800000000",
    address: "Nabagram",
  });
  const linkId = uuidv7();
  await db.insert(studentGuardians).values({
    id: linkId,
    schoolId: input.schoolId,
    studentId: input.studentId,
    guardianId,
    relationship: input.relationship ?? "father",
    isPrimary: input.isPrimary ?? true,
  });
  return { guardianId, linkId };
}

export async function activeYearId(
  db: Database,
  schoolId: string,
): Promise<{ academicYearId: string }> {
  const [year] = await db
    .select({ academicYearId: academicYears.id })
    .from(academicYears)
    .where(
      and(eq(academicYears.schoolId, schoolId), eq(academicYears.isActive, true)),
    )
    .limit(1);
  if (!year) throw new Error("The seeded school has no active academic year");
  return year;
}
