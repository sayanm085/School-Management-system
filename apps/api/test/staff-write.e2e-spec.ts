import { afterAll, beforeAll, expect, test } from "vitest";
import { and, eq } from "drizzle-orm";

import { auditEvents, staffAssignments } from "../src/db/schema";
import { hashPassword } from "../src/common/security/password-hash";
import { createTestApp, type TestApp } from "./app";
import {
  seedSchool,
  seedSection,
  seedStaffUser,
  seedSubject,
} from "./fixtures";

const SCHOOL_CODE = "WB-STA-02";
const PASSWORD = "demo1234";

let context: TestApp;
let sectionId: string;
let subjectId: string;
let otherSectionId: string;
let clerk: string;
let teacher: string;

async function tokenFor(employeeId: string) {
  const response = await context.request({
    method: "POST",
    url: "/v1/auth/login",
    payload: { schoolCode: SCHOOL_CODE, employeeId, password: PASSWORD },
  });
  expect(response.statusCode).toBe(200);
  return response.json().accessToken as string;
}

async function createStaff(token: string, payload: Record<string, unknown>) {
  return context.request({
    method: "POST",
    url: "/v1/staff",
    headers: { authorization: `Bearer ${token}` },
    payload,
  });
}

beforeAll(async () => {
  context = await createTestApp();
  const passwordHash = await hashPassword(PASSWORD);
  const school = await seedSchool(context.db, SCHOOL_CODE);
  sectionId = await seedSection(context.db, {
    schoolId: school.schoolId,
    academicYearId: school.academicYearId,
    classLevel: "IX",
    section: "A",
  });
  subjectId = await seedSubject(context.db, { schoolId: school.schoolId, code: "GEO" });
  const other = await seedSchool(context.db, "WB-STA-03");
  otherSectionId = await seedSection(context.db, {
    schoolId: other.schoolId,
    academicYearId: other.academicYearId,
    classLevel: "IX",
    section: "Z",
  });
  clerk = (
    await seedStaffUser(context.db, {
      schoolId: school.schoolId,
      employeeId: "CLK-STA-01",
      role: "clerk",
      passwordHash,
    })
  ).employeeId;
  teacher = (
    await seedStaffUser(context.db, {
      schoolId: school.schoolId,
      employeeId: "TCH-STA-01",
      role: "teacher",
      passwordHash,
    })
  ).employeeId;
});

afterAll(async () => {
  await context.close();
});

test("the clerk registers a staff member and the write is audited", async () => {
  const created = await createStaff(await tokenFor(clerk), {
    employeeId: "TCH-9001",
    nameEn: "Bithi Roy",
    nameBn: "বিথি রায়",
    designation: "Assistant Teacher · Geography",
    phone: "9830033001",
    email: "bithi.roy@nabagram-demo.example",
    payLevel: "Level 11",
    joinedAt: "2024-07-01",
  });

  expect(created.statusCode).toBe(201);
  expect(created.json()).toMatchObject({
    employeeId: "TCH-9001",
    status: "active",
    version: 1,
    assignments: [],
  });

  const rows = await context.db
    .select()
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.action, "staff.created"),
        eq(auditEvents.entityId, created.json().id),
      ),
    );
  expect(rows).toHaveLength(1);
});

test("a duplicate employee id in the same school is refused", async () => {
  const response = await createStaff(await tokenFor(clerk), {
    employeeId: "TCH-9001",
    nameEn: "Clone Person",
    nameBn: "ক্লোন",
    designation: "Clerk",
  });
  expect(response.statusCode).toBe(409);
  expect(response.json().code).toBe("EMPLOYEE_ID_TAKEN");
});

test("a teacher can neither create nor read the staff directory", async () => {
  const token = await tokenFor(teacher);
  const read = await context.request({
    method: "GET",
    url: "/v1/staff?limit=1",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(read.statusCode).toBe(403);

  const created = await createStaff(token, {
    employeeId: "TCH-9002",
    nameEn: "Nope",
    nameBn: "না",
    designation: "Teacher",
  });
  expect(created.statusCode).toBe(403);
});

test("amending a staff record needs a fresh entity tag", async () => {
  const token = await tokenFor(clerk);
  const member = await createStaff(token, {
    employeeId: "TCH-9010",
    nameEn: "Surojit Basak",
    nameBn: "সুরজিৎ বসাক",
    designation: "Teacher · Geography",
    payLevel: "Level 11",
  });
  const staffId = member.json().id as string;

  const patched = await context.request({
    method: "PATCH",
    url: `/v1/staff/${staffId}`,
    headers: {
      authorization: `Bearer ${token}`,
      "if-match": '"1"',
      "content-type": "application/json",
    },
    payload: { designation: "Senior Teacher · Geography", payLevel: "Level 12" },
  });
  expect(patched.statusCode).toBe(200);
  expect(patched.json()).toMatchObject({ version: 2, payLevel: "Level 12" });

  const stale = await context.request({
    method: "PATCH",
    url: `/v1/staff/${staffId}`,
    headers: {
      authorization: `Bearer ${token}`,
      "if-match": '"1"',
      "content-type": "application/json",
    },
    payload: { payLevel: "Level 13" },
  });
  expect(stale.statusCode).toBe(409);
  expect(stale.json().code).toBe("VERSION_CONFLICT");

  const rows = await context.db
    .select()
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.action, "staff.updated"),
        eq(auditEvents.entityId, staffId),
      ),
    );
  expect(rows).toHaveLength(1);
  expect(rows[0].before).toMatchObject({ payLevel: "Level 11" });
  expect(rows[0].after).toMatchObject({ payLevel: "Level 12", version: 2 });
});

test("assignments are deduplicated, audited, and scoped to this school", async () => {
  const token = await tokenFor(clerk);
  const member = await createStaff(token, {
    employeeId: "TCH-9003",
    nameEn: "Anirban Ghosh",
    nameBn: "অনির্বাণ ঘোষ",
    designation: "Teacher · Geography",
  });
  const staffId = member.json().id as string;

  const first = await context.request({
    method: "POST",
    url: `/v1/staff/${staffId}/assignments`,
    headers: { authorization: `Bearer ${token}` },
    payload: { type: "subject_teacher", sectionId, subjectId },
  });
  expect(first.statusCode).toBe(201);

  const replay = await context.request({
    method: "POST",
    url: `/v1/staff/${staffId}/assignments`,
    headers: { authorization: `Bearer ${token}` },
    payload: { type: "subject_teacher", sectionId, subjectId },
  });
  expect(replay.statusCode).toBe(409);
  expect(replay.json().code).toBe("ASSIGNMENT_EXISTS");

  const assistant = await context.request({
    method: "POST",
    url: `/v1/staff/${staffId}/assignments`,
    headers: { authorization: `Bearer ${token}` },
    payload: { type: "assistant_headmaster" },
  });
  expect(assistant.statusCode).toBe(201);

  const rows = await context.db
    .select()
    .from(staffAssignments)
    .where(eq(staffAssignments.staffId, staffId));
  expect(rows).toHaveLength(2);

  const audit = await context.db
    .select()
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.action, "staff.assignment_created"),
        eq(auditEvents.entityId, staffId),
      ),
    );
  expect(audit).toHaveLength(2);

  const foreignSection = await context.request({
    method: "POST",
    url: `/v1/staff/${staffId}/assignments`,
    headers: { authorization: `Bearer ${token}` },
    payload: { type: "class_teacher", sectionId: otherSectionId },
  });
  expect(foreignSection.statusCode).toBe(404);

  const malformed = await context.request({
    method: "POST",
    url: `/v1/staff/${staffId}/assignments`,
    headers: { authorization: `Bearer ${token}` },
    payload: { type: "subject_teacher" },
  });
  expect(malformed.statusCode).toBe(422);
  expect(malformed.json().errors[0].path).toBe("sectionId");
});

test("two identical concurrent assignments leave one row and one audit", async () => {
  const token = await tokenFor(clerk);
  const member = await createStaff(token, {
    employeeId: "TCH-9004",
    nameEn: "Rupali Saha",
    nameBn: "রূপালী সাহা",
    designation: "Teacher · Geography",
  });
  const staffId = member.json().id as string;

  const assign = () =>
    context.request({
      method: "POST",
      url: `/v1/staff/${staffId}/assignments`,
      headers: { authorization: `Bearer ${token}` },
      payload: { type: "subject_teacher", sectionId, subjectId },
    });
  const [a, b] = await Promise.all([assign(), assign()]);

  // The invariant, not the ordering: whichever request lands first, exactly
  // one create succeeds and the other is refused as a duplicate.
  const statuses = [a.statusCode, b.statusCode].sort((x, y) => x - y);
  expect(statuses).toEqual([201, 409]);
  const rejected = a.statusCode === 409 ? a : b;
  expect(rejected.json().code).toBe("ASSIGNMENT_EXISTS");

  const rows = await context.db
    .select()
    .from(staffAssignments)
    .where(eq(staffAssignments.staffId, staffId));
  expect(rows).toHaveLength(1);

  const audits = await context.db
    .select()
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.action, "staff.assignment_created"),
        eq(auditEvents.entityId, staffId),
      ),
    );
  const created = audits.filter(
    (row) => (row.after as { type?: string } | null)?.type === "subject_teacher",
  );
  expect(created).toHaveLength(1);
});

test("an unknown staff id is a 404 problem for both patch and assign", async () => {
  const token = await tokenFor(clerk);
  const missing = "00000000-0000-7000-8000-000000000042";

  const patched = await context.request({
    method: "PATCH",
    url: `/v1/staff/${missing}`,
    headers: {
      authorization: `Bearer ${token}`,
      "if-match": '"1"',
      "content-type": "application/json",
    },
    payload: { designation: "Ghost" },
  });
  expect(patched.statusCode).toBe(404);

  const assigned = await context.request({
    method: "POST",
    url: `/v1/staff/${missing}/assignments`,
    headers: { authorization: `Bearer ${token}` },
    payload: { type: "accountant" },
  });
  expect(assigned.statusCode).toBe(404);
});
