import { afterAll, beforeAll, expect, test } from "vitest";
import { and, count, eq, inArray, isNotNull } from "drizzle-orm";

import { seedDatabase } from "../src/db/seed";
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
import { createTestApp, type TestApp } from "./app";
import { TEST_DATABASE_URL } from "./db";

const DEMO_ACCOUNTS = [
  "HM-001",
  "TCH-001",
  "TCH-027",
  "TCH-023",
  "CLK-014",
  "MC-003",
];

let context: TestApp;

async function runSeed() {
  return seedDatabase(TEST_DATABASE_URL, { demo: true });
}

beforeAll(async () => {
  context = await createTestApp();
});

afterAll(async () => {
  await context.close();
});

test("imports the demo school, staff and assignments", async () => {
  const result = await runSeed();
  expect(result.staff).toBe(32);
  expect(result.sections).toBe(12);
  expect(result.subjects).toBe(8);
  expect(result.assignments).toBe(117);
  expect(result.logins).toBe(27);

  const [school] = await context.db.select().from(schools);
  expect(school.code).toBe("WB-NAB-001");
  expect(school.nameEn).toContain("Nabagram");

  const [year] = await context.db
    .select()
    .from(academicYears)
    .where(eq(academicYears.schoolId, school.id));
  expect(year.label).toBe("2026–27");
  expect(year.isActive).toBe(true);

  const staffRows = await context.db
    .select({ id: staff.id })
    .from(staff)
    .where(eq(staff.schoolId, school.id));
  expect(staffRows).toHaveLength(32);

  const sectionRows = await context.db
    .select({ id: sections.id })
    .from(sections)
    .where(eq(sections.schoolId, school.id));
  expect(sectionRows).toHaveLength(12);

  const subjectRows = await context.db
    .select({ id: subjects.id })
    .from(subjects)
    .where(eq(subjects.schoolId, school.id));
  expect(subjectRows).toHaveLength(8);
});

test("creates demo logins for every staff role except support", async () => {
  await runSeed();
  const rows = await context.db
    .select({ employeeId: users.employeeId, role: users.role })
    .from(users)
    .where(inArray(users.employeeId, DEMO_ACCOUNTS));

  expect(rows.map((row) => row.employeeId).sort()).toEqual(
    [...DEMO_ACCOUNTS].sort(),
  );
  expect(rows.find((row) => row.employeeId === "HM-001")?.role).toBe(
    "headmaster",
  );
  expect(rows.find((row) => row.employeeId === "MC-003")?.role).toBe(
    "management",
  );

  const [support] = await context.db
    .select({ id: staff.id })
    .from(staff)
    .where(eq(staff.employeeId, "SUP-001"));
  const supportLogins = await context.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.staffId, support.id));
  expect(supportLogins).toHaveLength(0);
});

test("keeps teaching assignments resolvable to sections and subjects", async () => {
  await runSeed();
  const [ananya] = await context.db
    .select({ id: staff.id })
    .from(staff)
    .where(eq(staff.employeeId, "TCH-027"));

  const rows = await context.db
    .select({
      type: staffAssignments.type,
      sectionId: staffAssignments.sectionId,
      subjectId: staffAssignments.subjectId,
    })
    .from(staffAssignments)
    .where(eq(staffAssignments.staffId, ananya.id));

  expect(rows.length).toBeGreaterThan(0);
  expect(rows.every((row) => row.sectionId !== null)).toBe(true);
  expect(
    rows.some(
      (row) => row.type === "subject_teacher" && row.subjectId !== null,
    ),
  ).toBe(true);

  const assistant = await context.db
    .select({ id: staffAssignments.id })
    .from(staffAssignments)
    .innerJoin(staff, eq(staffAssignments.staffId, staff.id))
    .where(eq(staffAssignments.type, "assistant_headmaster"));
  expect(assistant).toHaveLength(1);
});

test("is idempotent: a second import neither duplicates nor drifts", async () => {
  const first = await runSeed();
  const second = await runSeed();
  expect(second).toEqual(first);

  const totals = await context.db
    .select({ value: count(staff.id) })
    .from(staff);
  expect(Number(totals[0].value)).toBe(32);
  const logins = await context.db
    .select({ value: count(users.id) })
    .from(users);
  expect(Number(logins[0].value)).toBe(27);
});

test("a seeded account signs in through the API", async () => {
  await runSeed();
  const response = await context.request({
    method: "POST",
    url: "/v1/auth/login",
    payload: {
      employeeId: "TCH-023",
      password: process.env.DEMO_PASSWORD ?? "demo1234",
      device: { platform: "android", name: "Seed check" },
    },
  });
  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.user.nameEn).toBe("Minori Das");
  expect(body.user.permissions).toContain("substitutions.claim");

  const me = await context.request({
    method: "GET",
    url: "/v1/auth/me",
    headers: { authorization: `Bearer ${body.accessToken}` },
  });
  expect(me.statusCode).toBe(200);
  expect(me.json().employeeId).toBe("TCH-023");
});

test("refuses to import demo data into production", async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    await expect(
      seedDatabase(TEST_DATABASE_URL, { demo: true }),
    ).rejects.toThrow(/production/);
  } finally {
    process.env.NODE_ENV = previous;
  }
});

test("imports the 480 demo students each with one primary guardian", async () => {
  const result = await runSeed();
  expect(result.students).toBe(480);
  expect(result.guardians).toBe(480);

  const rows = await context.db
    .select({
      admissionNo: students.admissionNo,
      rollNo: students.rollNo,
      sectionId: students.sectionId,
    })
    .from(students)
    .orderBy(students.admissionNo)
    .limit(3);
  expect(rows[0]).toMatchObject({ admissionNo: "NUV-2017-0001", rollNo: "01" });

  const perSection = await context.db
    .select({ sectionId: students.sectionId, value: count() })
    .from(students)
    .groupBy(students.sectionId);
  expect(perSection).toHaveLength(12);
  expect(
    perSection.every(
      (row) => Number(row.value) >= 38 && Number(row.value) <= 48,
    ),
  ).toBe(true);

  const links = await context.db.select({ value: count() }).from(studentGuardians);
  expect(Number(links[0].value)).toBe(480);

  const primary = await context.db
    .select({ value: count() })
    .from(studentGuardians)
    .where(eq(studentGuardians.isPrimary, true));
  expect(Number(primary[0].value)).toBe(480);
});

test("re-importing updates the same rows instead of duplicating", async () => {
  const first = await runSeed();
  const second = await runSeed();
  expect(second).toEqual(first);

  // The counters above move together by construction, so the row counts are
  // the load-bearing, independent proof that the second pass wrote into the
  // same 480 rows instead of duplicating anything.
  const total = await context.db.select({ value: count() }).from(students);
  expect(Number(total[0].value)).toBe(480);
  const guardianTotal = await context.db
    .select({ value: count() })
    .from(guardians);
  expect(Number(guardianTotal[0].value)).toBe(480);
  const linkTotal = await context.db
    .select({ value: count() })
    .from(studentGuardians);
  expect(Number(linkTotal[0].value)).toBe(480);
});

test("a class teacher sees only their own sections after the import", async () => {
  await runSeed();
  const login = await context.request({
    method: "POST",
    url: "/v1/auth/login",
    payload: {
      employeeId: "TCH-027",
      password: process.env.DEMO_PASSWORD ?? "demo1234",
    },
  });
  expect(login.statusCode).toBe(200);

  const list = await context.request({
    method: "GET",
    url: "/v1/students?limit=200",
    headers: { authorization: `Bearer ${login.json().accessToken}` },
  });
  expect(list.statusCode).toBe(200);
  const seen = new Set<string>(
    (list.json().data as { sectionId: string }[]).map((row) => row.sectionId),
  );

  // Pin the real invariant: the visible section set equals the sections
  // TCH-027 has an assignment to, read straight from staff_assignments.
  const [ananya] = await context.db
    .select({ id: staff.id })
    .from(staff)
    .where(eq(staff.employeeId, "TCH-027"));
  const assigned = await context.db
    .select({ sectionId: staffAssignments.sectionId })
    .from(staffAssignments)
    .where(
      and(
        eq(staffAssignments.staffId, ananya.id),
        isNotNull(staffAssignments.sectionId),
      ),
    );
  const expected = new Set(
    assigned.map((row) => row.sectionId as string),
  );
  expect(expected.size).toBeGreaterThan(0);
  expect([...seen].sort()).toEqual([...expected].sort());
});

test("the fixture wins: a re-seed restores manual edits and bumps version", async () => {
  await runSeed();
  const before = await context.db
    .select({ id: students.id, nameEn: students.nameEn, version: students.version })
    .from(students)
    .where(eq(students.admissionNo, "NUV-2017-0001"));
  expect(before).toHaveLength(1);
  const original = before[0];

  await context.db
    .update(students)
    .set({ nameEn: "SEED-MUTATION-CHECK" })
    .where(eq(students.id, original.id));

  await runSeed();

  const after = await context.db
    .select({ nameEn: students.nameEn, version: students.version })
    .from(students)
    .where(eq(students.id, original.id));
  // Compare booleans, not strings: a failure must not print a student name.
  expect(after[0].nameEn === original.nameEn).toBe(true);
  // Exactly one students write per seed pass, so the bump is deterministic.
  expect(Number(after[0].version)).toBe(Number(original.version) + 1);
});
