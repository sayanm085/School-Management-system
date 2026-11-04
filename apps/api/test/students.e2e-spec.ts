import { afterAll, beforeAll, expect, test } from "vitest";
import { and, eq } from "drizzle-orm";

import { auditEvents } from "../src/db/schema";
import { hashPassword } from "../src/common/security/password-hash";
import { createTestApp, type TestApp } from "./app";
import {
  seedAssignment,
  seedSchool,
  seedSection,
  seedStaffUser,
} from "./fixtures";

const SCHOOL_CODE = "WB-STU-01";
const PASSWORD = "demo1234";

let context: TestApp;
let schoolId: string;
let sectionVa: string;
let sectionVb: string;
let foreignSectionId: string;
let headmaster: string;
let clerk: string;
let teacher: string;
const createdIds: string[] = [];

async function signIn(employeeId: string) {
  const response = await context.request({
    method: "POST",
    url: "/v1/auth/login",
    payload: { schoolCode: SCHOOL_CODE, employeeId, password: PASSWORD },
  });
  expect(response.statusCode).toBe(200);
  return response.json().accessToken as string;
}

async function createStudent(token: string, payload: Record<string, unknown>) {
  const response = await context.request({
    method: "POST",
    url: "/v1/students",
    headers: { authorization: `Bearer ${token}` },
    payload,
  });
  if (response.statusCode === 201) createdIds.push(response.json().id as string);
  return response;
}

function basePayload(overrides: Record<string, unknown>) {
  return {
    sectionId: sectionVa,
    nameEn: "Purnima Satra",
    nameBn: "পূর্ণিমা সাঁতরা",
    gender: "female",
    dob: "2016-08-04",
    category: "general",
    ...overrides,
  };
}

beforeAll(async () => {
  context = await createTestApp();
  const passwordHash = await hashPassword(PASSWORD);
  const school = await seedSchool(context.db, SCHOOL_CODE);
  schoolId = school.schoolId;
  sectionVa = await seedSection(context.db, {
    schoolId,
    academicYearId: school.academicYearId,
    classLevel: "V",
    section: "A",
  });
  sectionVb = await seedSection(context.db, {
    schoolId,
    academicYearId: school.academicYearId,
    classLevel: "V",
    section: "B",
  });

  // A second school whose sections no account above may reach; for staff roles
  // the composite students_section_school_fk is the only enforcer of that.
  const foreignSchool = await seedSchool(context.db);
  foreignSectionId = await seedSection(context.db, {
    schoolId: foreignSchool.schoolId,
    academicYearId: foreignSchool.academicYearId,
    classLevel: "V",
    section: "Z",
  });

  headmaster = (
    await seedStaffUser(context.db, {
      schoolId,
      employeeId: "HM-STU-01",
      role: "headmaster",
      passwordHash,
    })
  ).employeeId;
  clerk = (
    await seedStaffUser(context.db, {
      schoolId,
      employeeId: "CLK-STU-01",
      role: "clerk",
      passwordHash,
    })
  ).employeeId;
  const teacherAccount = await seedStaffUser(context.db, {
    schoolId,
    employeeId: "TCH-STU-01",
    role: "teacher",
    passwordHash,
  });
  teacher = teacherAccount.employeeId;
  await seedAssignment(context.db, {
    schoolId,
    staffId: teacherAccount.staffId,
    type: "class_teacher",
    sectionId: sectionVa,
  });
});

afterAll(async () => {
  await context.close();
});

test("the clerk creates a student and the roll is allocated inside the section", async () => {
  const token = await signIn(clerk);
  const created = await createStudent(
    token,
    basePayload({
      admissionNo: "NUV-2026-0001",
      guardian: {
        nameEn: "Niladri Satra",
        nameBn: "নীলাদ্রি সাঁতরা",
        phone: "9894911322",
        relationship: "father",
      },
    }),
  );

  expect(created.statusCode).toBe(201);
  const first = created.json();
  expect(first.rollNo).toBe("01");
  expect(first.classLabel).toBe("V A");
  expect(first.admissionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(first.version).toBe(1);
  expect(first.guardians).toHaveLength(1);
  expect(first.guardians[0]).toMatchObject({
    nameEn: "Niladri Satra",
    phone: "9894911322",
    isPrimary: true,
  });

  const second = await createStudent(
    token,
    basePayload({ admissionNo: "NUV-2026-0002", nameEn: "Second Child" }),
  );
  expect(second.statusCode).toBe(201);
  expect(second.json().rollNo).toBe("02");
  expect(second.json().guardians).toHaveLength(0);

  const rows = await context.db
    .select()
    .from(auditEvents)
    .where(
      and(eq(auditEvents.schoolId, schoolId), eq(auditEvents.action, "student.created")),
    );
  expect(rows).toHaveLength(2);
});

test("duplicate admission numbers and explicit rolls are refused by name", async () => {
  const token = await signIn(clerk);

  const duplicateAdmission = await createStudent(
    token,
    basePayload({
      admissionNo: "NUV-2026-0001",
      sectionId: sectionVb,
      nameEn: "Duplicate Admission",
    }),
  );
  expect(duplicateAdmission.statusCode).toBe(409);
  expect(duplicateAdmission.json().code).toBe("ADMISSION_NO_TAKEN");

  const clash = await createStudent(
    token,
    basePayload({ admissionNo: "NUV-2026-0003", rollNo: "01", nameEn: "Roll Clash" }),
  );
  expect(clash.statusCode).toBe(409);
  expect(clash.json().code).toBe("ROLL_NO_TAKEN");
});

test("a teacher reaches only the sections they are assigned to", async () => {
  const token = await signIn(teacher);

  const inside = await context.request({
    method: "GET",
    url: `/v1/students?sectionId=${sectionVa}`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(inside.statusCode).toBe(200);
  expect(inside.json().data.length).toBeGreaterThan(0);
  expect(
    (inside.json().data as { sectionId: string }[]).every(
      (row) => row.sectionId === sectionVa,
    ),
  ).toBe(true);

  const outside = await context.request({
    method: "GET",
    url: `/v1/students?sectionId=${sectionVb}`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(outside.statusCode).toBe(403);

  const unfiltered = await context.request({
    method: "GET",
    url: "/v1/students?limit=100",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(unfiltered.statusCode).toBe(200);
  expect(
    (unfiltered.json().data as { sectionId: string }[]).every(
      (row) => row.sectionId === sectionVa,
    ),
  ).toBe(true);
});

test("the list projection carries no birth or contact data", async () => {
  const token = await signIn(clerk);
  const list = await context.request({
    method: "GET",
    url: "/v1/students?limit=100",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(list.statusCode).toBe(200);
  const body = JSON.stringify(list.json().data);
  expect(body).not.toContain("9894911322");
  expect(body).not.toContain("dob");
  expect(body).not.toContain("address");
  expect(body).not.toContain("guardians");
});

test("search matches name, admission number and roll", async () => {
  const token = await signIn(clerk);
  const cases: [string, boolean][] = [
    ["Purnima", true],
    ["NUV-2026-0002", true],
    ["02", true],
    ["NoSuchStudent", false],
  ];
  for (const [term, expected] of cases) {
    const response = await context.request({
      method: "GET",
      url: `/v1/students?search=${encodeURIComponent(term)}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.length > 0, term).toBe(expected);
  }
});

test("the detail route returns the guardians and an entity tag", async () => {
  const token = await signIn(headmaster);
  const list = await context.request({
    method: "GET",
    url: "/v1/students?limit=1",
    headers: { authorization: `Bearer ${token}` },
  });
  const summary = list.json().data[0] as { id: string; rollNo: string };

  const detail = await context.request({
    method: "GET",
    url: `/v1/students/${summary.id}`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(detail.statusCode).toBe(200);
  expect(detail.json().dob).toBe("2016-08-04");
  expect(String(detail.headers["etag"])).toBe('"1"');

  const searchByRoll = await context.request({
    method: "GET",
    url: `/v1/students?search=${summary.rollNo}`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(searchByRoll.json().data[0].id).toBe(summary.id);
});

test("patch needs the current tag, audits before and after, and freezes the admission number", async () => {
  const token = await signIn(clerk);
  const list = await context.request({
    method: "GET",
    url: "/v1/students?limit=1",
    headers: { authorization: `Bearer ${token}` },
  });
  const student = list.json().data[0] as { id: string };

  const patched = await context.request({
    method: "PATCH",
    url: `/v1/students/${student.id}`,
    headers: {
      authorization: `Bearer ${token}`,
      "if-match": '"1"',
      "content-type": "application/json",
    },
    payload: { category: "sc" },
  });
  expect(patched.statusCode).toBe(200);
  expect(patched.json()).toMatchObject({ category: "sc", version: 2 });

  const stale = await context.request({
    method: "PATCH",
    url: `/v1/students/${student.id}`,
    headers: {
      authorization: `Bearer ${token}`,
      "if-match": '"1"',
      "content-type": "application/json",
    },
    payload: { category: "st" },
  });
  expect(stale.statusCode).toBe(409);
  expect(stale.json().code).toBe("VERSION_CONFLICT");

  const immutable = await context.request({
    method: "PATCH",
    url: `/v1/students/${student.id}`,
    headers: {
      authorization: `Bearer ${token}`,
      "if-match": '"2"',
      "content-type": "application/json",
    },
    payload: { admissionNo: "NUV-1999-9999" },
  });
  expect(immutable.statusCode).toBe(422);
  expect(immutable.json().code).toBe("VALIDATION_FAILED");

  const rows = await context.db
    .select()
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.action, "student.updated"),
        eq(auditEvents.entityId, student.id),
      ),
    );
  expect(rows).toHaveLength(1);
  expect(rows[0].before).toMatchObject({ category: "general" });
  expect(rows[0].after).toMatchObject({ category: "sc" });
});

test("moving a student to another section allocates a roll there", async () => {
  const token = await signIn(headmaster);
  const list = await context.request({
    method: "GET",
    url: `/v1/students?sectionId=${sectionVa}&limit=1`,
    headers: { authorization: `Bearer ${token}` },
  });
  const student = list.json().data[0] as { id: string; version: number };

  const moved = await context.request({
    method: "PATCH",
    url: `/v1/students/${student.id}`,
    headers: {
      authorization: `Bearer ${token}`,
      "if-match": `"${student.version}"`,
      "content-type": "application/json",
    },
    payload: { sectionId: sectionVb },
  });
  expect(moved.statusCode).toBe(200);
  expect(moved.json().sectionId).toBe(sectionVb);
  expect(moved.json().rollNo).toBe("01");
});

test("retiring a student hides them from the default list but keeps the row", async () => {
  const token = await signIn(headmaster);
  const list = await context.request({
    method: "GET",
    url: `/v1/students?sectionId=${sectionVb}&limit=1`,
    headers: { authorization: `Bearer ${token}` },
  });
  const student = list.json().data[0] as { id: string; rollNo: string };

  const retired = await context.request({
    method: "POST",
    url: `/v1/students/${student.id}/retire`,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    payload: { status: "transferred", reason: "Family moved to Kolkata" },
  });
  expect(retired.statusCode).toBe(200);
  expect(retired.json().status).toBe("transferred");

  const active = await context.request({
    method: "GET",
    url: `/v1/students?sectionId=${sectionVb}`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(
    (active.json().data as { id: string }[]).some((row) => row.id === student.id),
  ).toBe(false);

  const filtered = await context.request({
    method: "GET",
    url: `/v1/students?sectionId=${sectionVb}&status=transferred`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(filtered.json().data).toHaveLength(1);

  const reuse = await createStudent(
    token,
    basePayload({
      admissionNo: "NUV-2026-0900",
      sectionId: sectionVb,
      rollNo: student.rollNo,
      nameEn: "Roll Reuse Attempt",
    }),
  );
  expect(reuse.statusCode).toBe(409);
  expect(reuse.json().code).toBe("ROLL_NO_TAKEN");
});

test("management is refused before any query runs", async () => {
  const passwordHash = await hashPassword(PASSWORD);
  const account = await seedStaffUser(context.db, {
    schoolId,
    employeeId: "MC-STU-01",
    role: "management",
    passwordHash,
  });
  const list = await context.request({
    method: "GET",
    url: "/v1/students",
    headers: { authorization: `Bearer ${await signIn(account.employeeId)}` },
  });
  expect(list.statusCode).toBe(403);

  const detail = await context.request({
    method: "GET",
    url: `/v1/students/${createdIds[0] ?? "00000000-0000-7000-8000-000000000001"}`,
    headers: { authorization: `Bearer ${await signIn(account.employeeId)}` },
  });
  expect(detail.statusCode).toBe(403);
});

test("an unknown or malformed student id is a 404 problem", async () => {
  const token = await signIn(headmaster);
  for (const id of [
    "not-a-uuid",
    "00000000-0000-7000-8000-000000000001",
  ]) {
    const response = await context.request({
      method: "GET",
      url: `/v1/students/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode, id).toBe(404);
    expect(response.json().code, id).toBe("NOT_FOUND");
  }
});

test("a cross-school section on create is a 403 problem, not a 500", async () => {
  const token = await signIn(clerk);
  const created = await createStudent(
    token,
    basePayload({
      admissionNo: "NUV-2026-1400",
      rollNo: "01",
      sectionId: foreignSectionId,
    }),
  );

  expect(created.statusCode).toBe(403);
  expect(created.json().code).toBe("FORBIDDEN");
  expect(created.json().detail).toBe("That record belongs to another school.");
  expect(created.json().constraint).toBe("students_section_school_fk");
});

test("moving a student to a foreign section is a 403 problem, not a 500", async () => {
  const token = await signIn(headmaster);
  const created = await createStudent(
    token,
    basePayload({ admissionNo: "NUV-2026-1401" }),
  );
  expect(created.statusCode).toBe(201);
  const student = created.json() as { id: string; version: number };

  const moved = await context.request({
    method: "PATCH",
    url: `/v1/students/${student.id}`,
    headers: {
      authorization: `Bearer ${token}`,
      "if-match": `"${student.version}"`,
      "content-type": "application/json",
    },
    payload: { sectionId: foreignSectionId },
  });
  expect(moved.statusCode).toBe(403);
  expect(moved.json().code).toBe("FORBIDDEN");
  expect(moved.json().constraint).toBe("students_section_school_fk");
});

test("a section id that exists in no school answers the same tenancy 403", async () => {
  const token = await signIn(clerk);
  // Migration 0004 dropped the single-column section FK, so a section that
  // exists in no school violates the very same students_section_school_fk as
  // a foreign one; the uniform 403 keeps the API from revealing whether a
  // foreign id exists. A 23503 on a non-school constraint (a missing parent)
  // is never mapped like this — covered in test/api-error.spec.ts.
  const created = await createStudent(
    token,
    basePayload({
      admissionNo: "NUV-2026-1402",
      rollNo: "01",
      sectionId: "00000000-0000-7000-8000-000000000000",
    }),
  );

  expect(created.statusCode).toBe(403);
  expect(created.json().code).toBe("FORBIDDEN");
  expect(created.json().constraint).toBe("students_section_school_fk");
});
