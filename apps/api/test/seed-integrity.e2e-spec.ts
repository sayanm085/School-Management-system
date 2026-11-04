import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { eq, inArray } from "drizzle-orm";

import { seedDatabase, seedId } from "../src/db/seed";
import { demoSeedSchema, type DemoSeed } from "../src/db/seed-data";
import {
  schools,
  sections,
  staff,
  staffAssignments,
  students,
} from "../src/db/schema";
import { createTestApp, type TestApp } from "./app";
import { TEST_DATABASE_URL } from "./db";

// Regression coverage for Task 7's reference-integrity throws (seed.ts
// lines 250, 278, 287, 323). Two of the six throws named in the brief are
// internal "was not seeded" consistency checks that a fixture can never
// reach — the maps they read (sectionIds at seed.ts:255, staffIds at
// seed.ts:270) are populated in loops over the very same arrays that the
// checking loops iterate, so every key resolves by construction. They are
// documented as unreachable in the task-7b report instead of faked here.
//
// The legitimate-null half of the F2 ruling is locked by the last test: a
// section with no class teacher and an accountant assignment with no
// section/subject must still seed. If these checks are ever tightened, no
// real fixture can be imported and that test goes red.

// Synthetic sentinels standing in for PII. They exist only to prove the
// seeder's error messages never echo row contents back. Not real data.
const SENTINELS = {
  studentName: "INTEGRITY-SENTINEL-PUPIL-NAME",
  guardianName: "INTEGRITY-SENTINEL-GUARDIAN-NAME",
  guardianPhone: "INTEGRITY-SENTINEL-PHONE-0000",
  dob: "1900-01-01",
  address: "INTEGRITY-SENTINEL-ADDRESS-LINE",
} as const;

const DEMO_PASSWORD = "demo1234";
const NOT_REJECTED = "seedDatabase resolved; expected rejection";

let context: TestApp;
let fixtureDir: string;
let previousSeedFile: string | undefined;

function buildFixture(tag: string): DemoSeed {
  return {
    school: {
      id: `int-school-${tag}`,
      nameEn: `Integrity Test School ${tag}`,
      nameBn: `Integrity Test School ${tag}`,
      code: `ZZ-INT-${tag.toUpperCase()}`,
      type: "test",
      address: `Integrity Test Road ${tag}`,
      district: "Integrity Test District",
    },
    academicYear: {
      id: `int-year-${tag}`,
      label: `INTEGRITY-${tag}`,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      isActive: true,
    },
    subjects: [
      {
        id: `int-sub-${tag}`,
        code: `INTS-${tag.toUpperCase()}`,
        nameEn: "Test Subject",
        nameBn: "Test Subject",
      },
    ],
    sections: [
      {
        id: `int-sec-${tag}`,
        classLevel: "5",
        section: "A",
        room: "INT-R1",
        capacity: 40,
        classTeacherId: `int-teacher-${tag}`,
      },
    ],
    staff: [
      {
        id: `int-teacher-${tag}`,
        employeeId: `INT-EMP-${tag.toUpperCase()}`,
        nameEn: "Integrity Teacher",
        nameBn: "Integrity Teacher",
        role: "teacher",
        designation: "Test Teacher",
        status: "active",
        assignments: [
          {
            type: "subject_teacher",
            sectionId: `int-sec-${tag}`,
            subjectId: `int-sub-${tag}`,
          },
        ],
      },
      {
        // The legitimate null: an accountant with no section/subject.
        id: `int-accountant-${tag}`,
        employeeId: `INT-ACC-${tag.toUpperCase()}`,
        nameEn: "Integrity Accountant",
        nameBn: "Integrity Accountant",
        role: "support",
        designation: "Test Accountant",
        status: "active",
        assignments: [{ type: "accountant" }],
      },
    ],
    students: [1, 2].map((n) => ({
      id: `int-stu-${tag}-${n}`,
      admissionNo: `INT-ADM-${tag.toUpperCase()}-${n}`,
      rollNo: String(n),
      sectionId: `int-sec-${tag}`,
      nameEn: `${SENTINELS.studentName}-${n}`,
      nameBn: `${SENTINELS.studentName}-${n}`,
      gender: "other" as const,
      dob: SENTINELS.dob,
      guardianName: SENTINELS.guardianName,
      guardianPhone: SENTINELS.guardianPhone,
      address: SENTINELS.address,
      category: "general" as const,
      status: "active" as const,
      admissionDate: "2026-01-15",
    })),
  };
}

async function writeFixture(tag: string, doc: DemoSeed): Promise<void> {
  // Validate through the real schema first: a typo in this test's own
  // fixture must fail here, not masquerade as a seeder failure.
  demoSeedSchema.parse(doc);
  const path = join(fixtureDir, `${tag}.json`);
  await writeFile(path, JSON.stringify(doc), "utf8");
  process.env.DEMO_SEED_FILE = path;
}

async function seedExpectingRejection(tag: string, doc: DemoSeed): Promise<string> {
  await writeFixture(tag, doc);
  // Capture instead of `rejects.toThrow` so a future "log and continue"
  // refactor — seedDatabase resolving despite the broken reference — also
  // fails here, and assertNothingCommitted then sees the partial rows.
  const failure = await seedDatabase(TEST_DATABASE_URL, {
    demo: true,
    password: DEMO_PASSWORD,
  }).then(
    () => null,
    (error: unknown) => error as Error,
  );
  expect(Boolean(failure), NOT_REJECTED).toBe(true);
  return (failure as Error).message;
}

async function assertNothingCommitted(doc: DemoSeed): Promise<void> {
  // Every throw is inside the single transaction and the schools row is
  // inserted first, so its deterministic id is the cheapest proof that the
  // import committed nothing. Students and staff are checked directly too:
  // the failure mode this task locks is a partial roster sneaking through.
  const schoolRows = await context.db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.id, seedId("school", doc.school.id)));
  expect(schoolRows).toHaveLength(0);

  const studentRows = await context.db
    .select({ id: students.id })
    .from(students)
    .where(inArray(students.id, doc.students.map((s) => seedId("student", s.id))));
  expect(studentRows).toHaveLength(0);

  const staffRows = await context.db
    .select({ id: staff.id })
    .from(staff)
    .where(inArray(staff.id, doc.staff.map((m) => seedId("staff", m.id))));
  expect(staffRows).toHaveLength(0);
}

function expectPiiFree(message: string): void {
  // The seeder is a place a stack trace can end up in a log: messages name
  // demo keys, never row contents. Compare booleans, not strings, so a
  // failure cannot echo a sentinel value into test output.
  for (const sentinel of Object.values(SENTINELS)) {
    expect(message.includes(sentinel), `message echoes fixture sentinel`).toBe(
      false,
    );
  }
}

beforeAll(async () => {
  context = await createTestApp();
  fixtureDir = await mkdtemp(join(tmpdir(), "baranda-seed-integrity-"));
  previousSeedFile = process.env.DEMO_SEED_FILE;
});

afterEach(() => {
  // seed.e2e-spec.ts depends on the real fixture path; a leaked
  // DEMO_SEED_FILE is how a green suite starts lying.
  if (previousSeedFile === undefined) delete process.env.DEMO_SEED_FILE;
  else process.env.DEMO_SEED_FILE = previousSeedFile;
});

afterAll(async () => {
  if (previousSeedFile === undefined) delete process.env.DEMO_SEED_FILE;
  else process.env.DEMO_SEED_FILE = previousSeedFile;
  await rm(fixtureDir, { recursive: true, force: true });
  await context.close();
});

test("section with a present-but-unknown classTeacherId aborts the import (seed.ts:250)", async () => {
  const doc = buildFixture("teacher");
  doc.sections[0].classTeacherId = "int-ghost-teacher";

  const message = await seedExpectingRejection("teacher", doc);

  expect(message).toContain("int-sec-teacher");
  expect(message).toContain("int-ghost-teacher");
  expectPiiFree(message);
  await assertNothingCommitted(doc);
});

test("staff assignment with a present-but-unknown sectionId aborts the import (seed.ts:278)", async () => {
  const doc = buildFixture("assignsec");
  doc.staff[0].assignments[0].sectionId = "int-ghost-section";

  const message = await seedExpectingRejection("assignsec", doc);

  expect(message).toContain("int-teacher-assignsec");
  expect(message).toContain("int-ghost-section");
  expectPiiFree(message);
  await assertNothingCommitted(doc);
});

test("staff assignment with a present-but-unknown subjectId aborts the import (seed.ts:287)", async () => {
  const doc = buildFixture("assignsub");
  doc.staff[0].assignments[0].subjectId = "int-ghost-subject";

  const message = await seedExpectingRejection("assignsub", doc);

  expect(message).toContain("int-teacher-assignsub");
  expect(message).toContain("int-ghost-subject");
  expectPiiFree(message);
  await assertNothingCommitted(doc);
});

test("student with an unmapped sectionId aborts the whole import (seed.ts:323)", async () => {
  const doc = buildFixture("studentsec");
  // Break only the second student: the pre-fix shape silently skipped the
  // bad row and committed the rest — the 479-of-480 failure mode. Nothing
  // may commit.
  doc.students[1].sectionId = "int-ghost-section";

  const message = await seedExpectingRejection("studentsec", doc);

  expect(message).toContain("int-stu-studentsec-2");
  expect(message).toContain("int-ghost-section");
  expectPiiFree(message);
  await assertNothingCommitted(doc);
});

test("legitimate nulls still seed: no class teacher, accountant without section/subject (seed.ts:247, 274)", async () => {
  const doc = buildFixture("valid");
  doc.sections[0].classTeacherId = null;

  await writeFixture("valid", doc);
  // If either legitimate null ever throws, this promise rejects and the
  // test fails — over-eager guards must not make real fixtures impossible.
  const result = await seedDatabase(TEST_DATABASE_URL, {
    demo: true,
    password: DEMO_PASSWORD,
  });
  expect(result.sections).toBe(1);
  expect(result.staff).toBe(2);
  expect(result.assignments).toBe(2);
  expect(result.students).toBe(2);
  expect(result.guardians).toBe(2);

  const schoolId = seedId("school", doc.school.id);

  const [section] = await context.db
    .select({ classTeacherId: sections.classTeacherId })
    .from(sections)
    .where(eq(sections.id, seedId("section", doc.sections[0].id)));
  expect(section.classTeacherId).toBeNull();

  const assignments = await context.db
    .select({
      type: staffAssignments.type,
      sectionId: staffAssignments.sectionId,
      subjectId: staffAssignments.subjectId,
    })
    .from(staffAssignments)
    .where(eq(staffAssignments.schoolId, schoolId));
  expect(assignments).toHaveLength(2);

  const accountant = assignments.find((row) => row.type === "accountant");
  expect(accountant).toBeDefined();
  expect(accountant?.sectionId).toBeNull();
  expect(accountant?.subjectId).toBeNull();

  const teaching = assignments.find((row) => row.type === "subject_teacher");
  expect(teaching?.sectionId).toBe(seedId("section", doc.sections[0].id));
  expect(teaching?.subjectId).toBe(seedId("subject", doc.subjects[0].id));

  const roster = await context.db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.schoolId, schoolId));
  expect(roster).toHaveLength(2);
});
