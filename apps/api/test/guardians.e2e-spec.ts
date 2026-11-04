import { afterAll, beforeAll, expect, test } from "vitest";
import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import {
  auditEvents,
  guardians,
  studentGuardians,
  students,
} from "../src/db/schema";
import { hashPassword } from "../src/common/security/password-hash";
import { createTestApp, type TestApp } from "./app";
import {
  activeYearId,
  seedGuardian,
  seedSchool,
  seedSection,
  seedStaffUser,
  seedStudent,
} from "./fixtures";

const SCHOOL_CODE = "WB-GUA-01";
const PASSWORD = "demo1234";

let context: TestApp;
let schoolId: string;
let sectionId: string;
let studentId: string;
let clerk: string;

async function tokenFor(employeeId: string) {
  const response = await context.request({
    method: "POST",
    url: "/v1/auth/login",
    payload: { schoolCode: SCHOOL_CODE, employeeId, password: PASSWORD },
  });
  expect(response.statusCode).toBe(200);
  return response.json().accessToken as string;
}

beforeAll(async () => {
  context = await createTestApp();
  const passwordHash = await hashPassword(PASSWORD);
  const school = await seedSchool(context.db, SCHOOL_CODE);
  schoolId = school.schoolId;
  sectionId = await seedSection(context.db, {
    schoolId,
    academicYearId: school.academicYearId,
    classLevel: "VI",
    section: "A",
  });
  studentId = (
    await seedStudent(context.db, { schoolId, sectionId, rollNo: "01" })
  ).id;
  clerk = (
    await seedStaffUser(context.db, {
      schoolId,
      employeeId: "CLK-GUA-01",
      role: "clerk",
      passwordHash,
    })
  ).employeeId;
});

afterAll(async () => {
  await context.close();
});

test("creating a guardian links it as primary", async () => {
  const token = await tokenFor(clerk);
  const created = await context.request({
    method: "POST",
    url: `/v1/students/${studentId}/guardians`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      nameEn: "Niladri Satra",
      nameBn: "নীলাদ্রি সাঁতরা",
      phone: "9894911322",
      relationship: "father",
      isPrimary: true,
    },
  });
  expect(created.statusCode).toBe(201);
  expect(created.json()).toMatchObject({
    nameEn: "Niladri Satra",
    phone: "9894911322",
    relationship: "father",
    isPrimary: true,
  });

  const rows = await context.db
    .select()
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.action, "guardian.attached"),
        eq(auditEvents.entityId, studentId),
      ),
    );
  expect(rows).toHaveLength(1);
});

test("linking an existing guardian reuses the person row for a sibling", async () => {
  const token = await tokenFor(clerk);
  const sibling = await seedStudent(context.db, {
    schoolId,
    sectionId,
    rollNo: "02",
    admissionNo: "NUV-SIBLING-01",
  });

  const [existing] = await context.db.select().from(guardians);
  const linked = await context.request({
    method: "POST",
    url: `/v1/students/${sibling.id}/guardians`,
    headers: { authorization: `Bearer ${token}` },
    payload: { guardianId: existing.id, relationship: "father" },
  });
  expect(linked.statusCode).toBe(201);
  expect(linked.json()).toMatchObject({ id: existing.id, isPrimary: false });

  const after = await context.db.select().from(guardians);
  expect(after).toHaveLength(1);

  const links = await context.db
    .select()
    .from(studentGuardians)
    .where(eq(studentGuardians.guardianId, existing.id));
  expect(links).toHaveLength(2);

  const duplicate = await context.request({
    method: "POST",
    url: `/v1/students/${sibling.id}/guardians`,
    headers: { authorization: `Bearer ${token}` },
    payload: { guardianId: existing.id, relationship: "mother" },
  });
  expect(duplicate.statusCode).toBe(409);
  expect(duplicate.json().code).toBe("GUARDIAN_ALREADY_LINKED");
});

test("promoting a guardian demotes the previous primary", async () => {
  const token = await tokenFor(clerk);
  const second = await context.request({
    method: "POST",
    url: `/v1/students/${studentId}/guardians`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      nameEn: "Mita Das",
      nameBn: "মিতা দাস",
      phone: "9894911323",
      relationship: "mother",
    },
  });
  expect(second.statusCode).toBe(201);

  const promoted = await context.request({
    method: "POST",
    url: `/v1/students/${studentId}/guardians/${second.json().id}/primary`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(promoted.statusCode).toBe(204);

  const list = await context.request({
    method: "GET",
    url: `/v1/students/${studentId}/guardians`,
    headers: { authorization: `Bearer ${token}` },
  });
  const primaries = (list.json().data as GuardianLike[]).filter(
    (row) => row.isPrimary,
  );
  expect(primaries).toHaveLength(1);
  expect(primaries[0]?.nameEn).toBe("Mita Das");
});

test("setPrimary followed by a primary attach leaves exactly one primary", async () => {
  const token = await tokenFor(clerk);
  const student = await seedStudent(context.db, { schoolId, sectionId });

  const first = await context.request({
    method: "POST",
    url: `/v1/students/${student.id}/guardians`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      nameEn: "Order One A",
      nameBn: "এক",
      phone: "9894911401",
      relationship: "father",
      isPrimary: true,
    },
  });
  expect(first.statusCode).toBe(201);
  const second = await context.request({
    method: "POST",
    url: `/v1/students/${student.id}/guardians`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      nameEn: "Order One B",
      nameBn: "দুই",
      phone: "9894911402",
      relationship: "mother",
    },
  });
  expect(second.statusCode).toBe(201);

  const promoted = await context.request({
    method: "POST",
    url: `/v1/students/${student.id}/guardians/${second.json().id}/primary`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(promoted.statusCode).toBe(204);

  const third = await context.request({
    method: "POST",
    url: `/v1/students/${student.id}/guardians`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      nameEn: "Order One C",
      nameBn: "তিন",
      phone: "9894911403",
      relationship: "guardian",
      isPrimary: true,
    },
  });
  expect(third.statusCode).toBe(201);

  const links = await context.db
    .select()
    .from(studentGuardians)
    .where(eq(studentGuardians.studentId, student.id));
  const primaries = links.filter((link) => link.isPrimary);
  expect(primaries).toHaveLength(1);
  expect(primaries[0]?.guardianId).toBe(third.json().id);
});

test("a primary attach followed by setPrimary leaves exactly one primary", async () => {
  const token = await tokenFor(clerk);
  const student = await seedStudent(context.db, { schoolId, sectionId });

  const first = await context.request({
    method: "POST",
    url: `/v1/students/${student.id}/guardians`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      nameEn: "Order Two A",
      nameBn: "এক",
      phone: "9894911411",
      relationship: "father",
      isPrimary: true,
    },
  });
  expect(first.statusCode).toBe(201);
  const second = await context.request({
    method: "POST",
    url: `/v1/students/${student.id}/guardians`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      nameEn: "Order Two B",
      nameBn: "দুই",
      phone: "9894911412",
      relationship: "mother",
    },
  });
  expect(second.statusCode).toBe(201);
  const third = await context.request({
    method: "POST",
    url: `/v1/students/${student.id}/guardians`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      nameEn: "Order Two C",
      nameBn: "তিন",
      phone: "9894911413",
      relationship: "guardian",
      isPrimary: true,
    },
  });
  expect(third.statusCode).toBe(201);

  const promoted = await context.request({
    method: "POST",
    url: `/v1/students/${student.id}/guardians/${second.json().id}/primary`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(promoted.statusCode).toBe(204);

  const links = await context.db
    .select()
    .from(studentGuardians)
    .where(eq(studentGuardians.studentId, student.id));
  const primaries = links.filter((link) => link.isPrimary);
  expect(primaries).toHaveLength(1);
  expect(primaries[0]?.guardianId).toBe(second.json().id);
});

test("two concurrent primary attaches leave exactly one primary", async () => {
  const token = await tokenFor(clerk);
  const student = await seedStudent(context.db, { schoolId, sectionId });

  const attach = (nameEn: string, phone: string) =>
    context.request({
      method: "POST",
      url: `/v1/students/${student.id}/guardians`,
      headers: { authorization: `Bearer ${token}` },
      payload: { nameEn, nameBn: "সমান্তরাল", phone, relationship: "father", isPrimary: true },
    });
  const [a, b] = await Promise.all([
    attach("Concurrent A", "9894911421"),
    attach("Concurrent B", "9894911422"),
  ]);
  expect([a.statusCode, b.statusCode]).toEqual([201, 201]);

  const links = await context.db
    .select()
    .from(studentGuardians)
    .where(eq(studentGuardians.studentId, student.id));
  expect(links).toHaveLength(2);
  const primaries = links.filter((link) => link.isPrimary);
  expect(primaries).toHaveLength(1);
  expect([a.json().id, b.json().id]).toContain(primaries[0]?.guardianId);
});

test("detaching keeps the person row for the other children", async () => {
  const token = await tokenFor(clerk);
  const before = await context.db.select().from(guardians);
  const list = await context.request({
    method: "GET",
    url: `/v1/students/${studentId}/guardians`,
    headers: { authorization: `Bearer ${token}` },
  });
  const target = list.json().data[0] as GuardianLike;

  const detached = await context.request({
    method: "DELETE",
    url: `/v1/students/${studentId}/guardians/${target.id}`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(detached.statusCode).toBe(204);

  const after = await context.db.select().from(guardians);
  expect(after).toHaveLength(before.length);
  const links = await context.db
    .select()
    .from(studentGuardians)
    .where(eq(studentGuardians.guardianId, target.id));
  expect(links).toHaveLength(0);
});

test("a guardian without a phone is refused and an unknown link is a 404", async () => {
  const token = await tokenFor(clerk);
  const invalid = await context.request({
    method: "POST",
    url: `/v1/students/${studentId}/guardians`,
    headers: { authorization: `Bearer ${token}` },
    payload: { nameEn: "Missing Contact", nameBn: "অসম্পূর্ণ" },
  });
  expect(invalid.statusCode).toBe(422);
  expect(
    (invalid.json().errors as { path: string }[]).map((issue) => issue.path),
  ).toContain("phone");

  const missing = await context.request({
    method: "DELETE",
    url: `/v1/students/${studentId}/guardians/00000000-0000-7000-8000-000000000009`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(missing.statusCode).toBe(404);
});

test("contact data stays out of the student list and out of the wrong hands", async () => {
  const clerkToken = await tokenFor(clerk);
  const list = await context.request({
    method: "GET",
    url: "/v1/students?limit=100",
    headers: { authorization: `Bearer ${clerkToken}` },
  });
  expect(JSON.stringify(list.json())).not.toContain("9894911322");

  const passwordHash = await hashPassword(PASSWORD);
  const outsider = await seedStaffUser(context.db, {
    schoolId,
    employeeId: "TCH-GUA-02",
    role: "teacher",
    passwordHash,
  });
  const outsiderSection = await seedSection(context.db, {
    schoolId,
    academicYearId: (await activeYearId(context.db, schoolId)).academicYearId,
    classLevel: "VI",
    section: "B",
  });
  const outsiderStudent = await seedStudent(context.db, {
    schoolId,
    sectionId: outsiderSection,
    rollNo: "01",
  });
  await seedGuardian(context.db, {
    schoolId,
    studentId: outsiderStudent.id,
    phone: "9894911399",
  });

  const response = await context.request({
    method: "GET",
    url: `/v1/students/${studentId}/guardians`,
    headers: { authorization: `Bearer ${await tokenFor(outsider.employeeId)}` },
  });
  expect(response.statusCode).toBe(403);
});

test("attaching a guardian from another school is a tenancy 403, not a 500", async () => {
  const token = await tokenFor(clerk);
  const foreign = await seedSchool(context.db);
  const foreignGuardianId = uuidv7();
  await context.db.insert(guardians).values({
    id: foreignGuardianId,
    schoolId: foreign.schoolId,
    nameEn: "Foreign Guardian",
    nameBn: "বিদেশী অভিভাবক",
    phone: "9800000001",
  });

  const response = await context.request({
    method: "POST",
    url: `/v1/students/${studentId}/guardians`,
    headers: { authorization: `Bearer ${token}` },
    payload: { guardianId: foreignGuardianId, relationship: "father" },
  });
  expect(response.statusCode).toBe(403);
  expect(response.json().code).toBe("FORBIDDEN");
  expect(response.json().detail).toBe(
    "That record belongs to another school.",
  );
  expect(response.json().constraint).toBe(
    "student_guardians_guardian_school_fk",
  );
});

type GuardianLike = { id: string; nameEn: string; isPrimary: boolean };
