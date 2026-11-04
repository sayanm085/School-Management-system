# B2a Master Data API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Baranda API its master-data layer — school profile, academic years, sections, subjects, staff records with assignments, and students with guardians — as permissioned, audited, paginated REST endpoints with a deterministic demo import.

**Architecture:** The B1 modular monolith in `apps/api` (NestJS 11 + Fastify + Drizzle over PostgreSQL 16) already ships config validation, Argon2id auth with rotating refresh tokens and TOTP MFA, global `AuthGuard`/`PermissionsGuard`, transactional append-only audit, RFC 9457 problem-details, cursor pagination, idempotent POST replay and optimistic-concurrency helpers. B2a adds the `school` and `students` modules plus the mutation side of `staff`. Every query is scoped by `school_id` from the access token, and teachers are additionally scoped to their assigned sections.

**Tech Stack:** Node.js 22 LTS, TypeScript strict, NestJS 11, Fastify, Drizzle ORM + Drizzle Kit, PostgreSQL 16, Zod 4 + `nestjs-zod`, Vitest, OpenAPI 3.0.3, Argon2id.

**Spec:** `docs/superpowers/specs/2026-10-31-backend-architecture.md` (§5 module map, §6 data model, §7 authorization, §8 API surface, §10 security, §13 B2 gate) and `docs/superpowers/specs/2026-10-31-baranda-school-operations-design.md` (§3.2 permission matrix, §3.3 privacy boundary, §8.1 entities, §8.2 rules). B1's executed plan: `docs/superpowers/plans/2026-10-31-backend-foundation.md`.

## Scope of this plan (read first)

The spec's B2 line is "School, staff, sections, subjects, students, guardians, admissions, files; web remote reads" — four subsystems, so it is split into separately shippable plans:

- **B2a (this plan):** master-data schema, master-data APIs, demo import of students and guardians, contract regeneration. Verified entirely with Vitest over HTTP; no browser.
- **B2b:** `files`, `student_documents`, `admission_documents`, presigned upload/complete/download against MinIO or S3 in an India region, private downloads audited.
- **B2c:** admissions queue → verify → decide → **enrol**, with server-side admission-number and roll allocation.
- **B2d:** the web console's `DATA_SOURCE=api` remote read path — the part of the B2 gate that is visible in a browser.

B2a is a shippable increment: after it, the API serves real master data and CI proves the privacy boundary.

## Global Constraints

- Node.js 22 LTS in CI and production; engine range `>=22 <25`. Regenerate `apps/api/package-lock.json` **inside** `node:22-bookworm-slim` (`npm install --package-lock-only`); npm 11 on macOS writes a lock npm 10 rejects with `Missing: webpack@… from lock file`.
- PostgreSQL 16 and Redis 7, pinned in `apps/api/docker-compose.yml`.
- TypeScript strict; no `any` in public interfaces; no `@ts-ignore`; no non-null assertions where a value can genuinely be absent.
- `school_id` comes from the authenticated `CurrentUser` only — never from a body, query or path parameter.
- Money is integer paise; storage timestamps are UTC `timestamptz`; business dates use `Asia/Kolkata` through `src/common/time/clock.ts`.
- Every mutation writes an audit event in the same transaction as the write.
- Paths are `/v1/...`; errors are `application/problem+json`; every response carries `x-request-id`.
- Sub-resources live beside their parent, so a module with more than one path segment uses `@Controller()` and writes full method paths (`@Get("school")`, `@Get("academic-years")`, `@Post("academic-years/:id/activate")`); `@Controller("school")` + `@Get("academic-years")` would silently produce `/v1/school/academic-years`.
- Every controller whose routes sit behind `AuthGuard` carries `@ApiBearerAuth("access_token")` at class level, or the generated contract advertises them as unauthenticated. Public controllers (`HealthController`, `OpenApiController`, the public `auth` routes) do not.
- No new runtime dependency without a stated reason.
- PII rule (design §3.3): list and search projections never include guardian phone, guardian address, date of birth, or Aadhaar. Only the detail endpoint returns contact data, and only to a caller whose scope covers the section. Management holds no `students.*` permission and must receive `403`.
- Student and staff records are soft-deleted (`deleted_at`); history is never destroyed.
- An optimistic-concurrency write is not a read-then-save. Inside its transaction it must lock the row (`SELECT … FOR UPDATE`), re-check the version, and apply the update with `WHERE id = … AND version = expected`, answering `409 VERSION_CONFLICT` when zero rows change. A pre-transaction version check alone loses concurrent writes under READ COMMITTED.
- A foreign-key value taken from a request body (`classTeacherId`, `sectionId`, `subjectId`, `guardianId`) is validated against the caller's school before it is written, and where the database can express it, the composite `(school_id, …)` foreign key does the enforcing.
- Test isolation: `test/db.ts` truncates a fixed table list. Any task that creates a new table adds it to that list in the same commit, or its rows leak into the next test file.
- Migrations are generated, read by a human, then committed. Never auto-migrate in the API startup path.
- A migration that adds a **composite foreign key** must create its composite unique index *before* the constraint: `drizzle-kit generate` emits `ADD CONSTRAINT` ahead of `CREATE INDEX`, and PostgreSQL rejects the constraint with error `42830` in that order. Reorder the generated statements (content unchanged) and say so in the migration's opening comment.
- Verification gates before each commit: `npm run typecheck`, `npx vitest run`, and for contract work `npm run openapi:generate` followed by `git diff --exit-code -- apps/api/openapi.json`.
- Commits stay local. Do not push, and do not commit until the human partner approves committing this work.
- No secrets or PII in git, logs, fixtures or test output. `apps/api/.env` is gitignored; the two `.env*.example` files hold placeholders only.

## File Structure

```
apps/api/
  src/
    common/
      time/clock.ts                        Asia/Kolkata business date
      authz/permissions.ts                 + staff.create, staff.edit, sections.manage
      http/version.ts                      + requireIfMatch()
    db/
      schema/student.ts                    students, guardians, student_guardians
      schema/index.ts                      re-export student.ts
      schema/school.ts                     schools gain version + sealKey
      schema/academic.ts                   sections and subjects gain version
      seed-data.ts                         student shape validation
      seed.ts                              exports seedId; imports students + guardians
    modules/
      school/
        school.schemas.ts                  profile, year, section, subject DTOs + page DTOs
        school.service.ts                  reads and audited writes
        school.controller.ts               /v1/school, /v1/academic-years, /v1/sections, /v1/subjects
        school.module.ts
      students/
        guardian.schemas.ts                guardian row + attach input
        guardian.mapper.ts                 joined row → wire row
        student.schemas.ts                 list query, summary, detail, create, patch
        student.service.ts                 scoping, roll allocation, retire, search
        student.controller.ts              /v1/students…
        guardian.service.ts                attach, detach, setPrimary
        guardian.controller.ts             /v1/students/:studentId/guardians…
        students.module.ts
      staff/
        staff.schemas.ts                   + record, create, patch, assignment DTOs
        staff.service.ts                   + create, update, addAssignment
        staff.controller.ts                + POST, PATCH, POST /:id/assignments
    app.module.ts                          + SchoolModule, StudentsModule
    openapi.cli.ts                         unchanged
  test/
    clock.spec.ts
    master-data-schema.e2e-spec.ts
    school.e2e-spec.ts
    students.e2e-spec.ts
    guardians.e2e-spec.ts
    staff-write.e2e-spec.ts
    seed.e2e-spec.ts                       extended
    pii.e2e-spec.ts
    openapi.e2e-spec.ts                    extended
    fixtures.ts                            + seedStudent, seedGuardian
  drizzle/                                 migrations 0003 (versions) and 0004 (student domain)
```

`StudentService` owns student rows and their scoping rules; `GuardianService` owns guardian
rows and the link table. Controllers stay thin argument-mapping shells so the services stay
directly testable, matching B1's `AuthService`/`SessionService` split.

---

## Task 1: Business-date kernel and B2 permissions

**Files:**
- Create: `apps/api/src/common/time/clock.ts`
- Modify: `apps/api/src/common/authz/permissions.ts`
- Test: `apps/api/test/clock.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `businessToday(now?: Date): string` → `YYYY-MM-DD` in `Asia/Kolkata`
  - `businessYear(now?: Date): number`
  - `Permission` union and `ALL_PERMISSIONS` extended with `"staff.create" | "staff.edit" | "sections.manage"`; `ROLE_PERMISSIONS.clerk` gains the two staff permissions.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/test/clock.spec.ts
import { describe, expect, test } from "vitest";

import { ROLE_PERMISSIONS } from "../src/common/authz/permissions";
import { businessToday, businessYear } from "../src/common/time/clock";

describe("business clock", () => {
  test("uses the Kolkata date, not the UTC date", () => {
    // 22:30 UTC on 31 October is already 1 November in Kolkata.
    const instant = new Date("2026-10-31T22:30:00Z");
    expect(businessToday(instant)).toBe("2026-11-01");
    expect(businessYear(instant)).toBe(2026);
  });

  test("rolls the year at the Kolkata new year", () => {
    const instant = new Date("2026-12-31T18:30:00Z");
    expect(businessToday(instant)).toBe("2027-01-01");
    expect(businessYear(instant)).toBe(2027);
  });
});

describe("B2 permissions", () => {
  test("staff and section management land on the expected roles", () => {
    expect(ROLE_PERMISSIONS.headmaster).toContain("staff.edit");
    expect(ROLE_PERMISSIONS.headmaster).toContain("sections.manage");
    expect(ROLE_PERMISSIONS.clerk).toContain("staff.create");
    expect(ROLE_PERMISSIONS.clerk).toContain("staff.edit");
    expect(ROLE_PERMISSIONS.teacher).not.toContain("staff.create");
    expect(ROLE_PERMISSIONS.teacher).not.toContain("sections.manage");
    expect(ROLE_PERMISSIONS.management).not.toContain("staff.view");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd apps/api && npx vitest run test/clock.spec.ts`
Expected: FAIL — `Cannot find module '../src/common/time/clock'`.

- [ ] **Step 3: Write the clock**

```ts
// apps/api/src/common/time/clock.ts
const ZONE = "Asia/Kolkata";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const yearFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  year: "numeric",
});

export function businessToday(now: Date = new Date()): string {
  return dayFormatter.format(now);
}

export function businessYear(now: Date = new Date()): number {
  return Number(yearFormatter.format(now));
}
```

- [ ] **Step 4: Extend the permission table**

In `src/common/authz/permissions.ts`, add three members to the `Permission` union and the
identical three to `ALL_PERMISSIONS`, right after `"staff.view"`:

```ts
  | "staff.view"
  | "staff.create"
  | "staff.edit"
  | "sections.manage"
  | "audit.view"
  | "roles.manage";
```

Then add `"staff.create"` and `"staff.edit"` to the `clerk` array in `ROLE_PERMISSIONS`
(design §3.2 gives the Clerk "Full create/edit" over records). `headmaster` derives from
`ALL_PERMISSIONS`, so it picks all three up automatically; `teacher` and `management` are
unchanged.

- [ ] **Step 5: Run the test**

Run: `cd apps/api && npx vitest run test/clock.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Verify nothing regressed, then commit**

Run: `cd apps/api && npm run typecheck && npx vitest run`
Expected: typecheck clean, every suite green.

```bash
git add apps/api/src/common/time/clock.ts apps/api/src/common/authz/permissions.ts apps/api/test/clock.spec.ts
git commit -m "feat(api): add business clock and master-data permissions"
```

---

## Task 2: Master-data schema and migrations

**Files:**
- Create: `apps/api/src/db/schema/student.ts`
- Modify: `apps/api/src/db/schema/index.ts`
- Modify: `apps/api/src/db/schema/school.ts` (`version`, `sealKey`)
- Modify: `apps/api/src/db/schema/academic.ts` (`version` on `sections` and `subjects`)
- Create: `apps/api/drizzle/0003_*.sql`, `apps/api/drizzle/0004_*.sql` (generated, then reviewed)
- Test: `apps/api/test/master-data-schema.e2e-spec.ts`
- Modify: `apps/api/test/schema.e2e-spec.ts` (expected table list)

**Interfaces:**
- Consumes: `schools`, `sections` from `src/db/schema`.
- Produces:
  - tables `students`, `guardians`, `student_guardians`
  - columns later tasks rely on: `students.admissionNo`, `students.rollNo`, `students.sectionId`, `students.status`, `students.version`, `students.deletedAt`, `guardians.phone`, `studentGuardians.relationship`, `studentGuardians.isPrimary`
  - unions `StudentGender`, `StudentCategory`, `StudentStatus`, `GuardianRelationship`

- [ ] **Step 1: Write the failing schema test**

```ts
// apps/api/test/master-data-schema.e2e-spec.ts
import { afterAll, beforeAll, expect, test } from "vitest";
import { sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import { createTestApp, type TestApp } from "./app";
import { errorChain } from "./errors";

let context: TestApp;
let schoolId: string;
let sectionId: string;

function rows<T>(result: unknown): T[] {
  return result as T[];
}

beforeAll(async () => {
  context = await createTestApp();
  schoolId = uuidv7();
  await context.db.execute(sql`
    insert into schools (id, name_en, name_bn, code, type, address, district)
    values (${schoolId}, 'Test', 'টেস্ট', 'WB-SCH-01', 'x', 'y', 'z')
  `);
  const yearId = uuidv7();
  await context.db.execute(sql`
    insert into academic_years (id, school_id, label, start_date, end_date, is_active)
    values (${yearId}, ${schoolId}, '2026–27', '2026-04-01', '2027-03-31', true)
  `);
  sectionId = uuidv7();
  await context.db.execute(sql`
    insert into sections (id, school_id, academic_year_id, class_level, section, room)
    values (${sectionId}, ${schoolId}, ${yearId}, 'VIII', 'B', 'R-201')
  `);
});

afterAll(async () => {
  await context.close();
});

function insertStudent(rollNo: string, admissionNo: string) {
  return context.db.execute(sql`
    insert into students (id, school_id, section_id, admission_no, roll_no, name_en, name_bn,
                          gender, dob, category, status, admission_date)
    values (${uuidv7()}, ${schoolId}, ${sectionId}, ${admissionNo}, ${rollNo},
            'Purnima Satra', 'পূর্ণিমা সাঁতরা', 'female', '2016-08-04', 'general',
            'active', '2017-04-01')
  `);
}

test("the student domain tables exist", async () => {
  const result = await context.db.execute(sql`
    select table_name from information_schema.tables where table_schema = 'public'
  `);
  const names = rows<{ table_name: string }>(result).map((row) => row.table_name);
  expect(names).toEqual(
    expect.arrayContaining(["students", "guardians", "student_guardians"]),
  );
});

test("a student cannot be placed in another school's section", async () => {
  const other = uuidv7();
  await context.db.execute(sql`
    insert into schools (id, name_en, name_bn, code, type, address, district)
    values (${other}, 'Other', 'অন্য', 'WB-SCH-02', 'x', 'y', 'z')
  `);
  const otherYear = uuidv7();
  await context.db.execute(sql`
    insert into academic_years (id, school_id, label, start_date, end_date, is_active)
    values (${otherYear}, ${other}, '2026–27', '2026-04-01', '2027-03-31', true)
  `);
  const stolen = uuidv7();
  await context.db.execute(sql`
    insert into sections (id, school_id, academic_year_id, class_level, section, room)
    values (${stolen}, ${other}, ${otherYear}, 'VIII', 'Z', 'R-999')
  `);

  const failure = await context.db.execute(sql`
    insert into students (id, school_id, section_id, admission_no, roll_no, name_en, name_bn,
                          gender, dob, category, status, admission_date)
    values (${uuidv7()}, ${schoolId}, ${stolen}, 'NUV-2017-0500', '50',
            'Cross Tenant', 'ক্রস', 'male', '2016-01-01', 'general', 'active', '2017-04-01')
  `)
    .then(() => null)
    .catch((error: unknown) => error);
  expect(errorChain(failure)).toContain("students_section_school_fk");
});

test("roll numbers are unique per section and admission numbers per school", async () => {
  await insertStudent("07", "NUV-2017-0101");

  const duplicateRoll = await insertStudent("07", "NUV-2017-0102")
    .then(() => null)
    .catch((error: unknown) => error);
  expect(duplicateRoll).toBeInstanceOf(Error);

  const duplicateAdmission = await insertStudent("08", "NUV-2017-0101")
    .then(() => null)
    .catch((error: unknown) => error);
  expect(duplicateAdmission).toBeInstanceOf(Error);

  const count = await context.db.execute(sql`select count(*)::int as total from students`);
  expect(rows<{ total: number }>(count)[0]?.total).toBe(1);
});

test("a soft-deleted student still holds the roll", async () => {
  await context.db.execute(sql`update students set deleted_at = now() where roll_no = '07'`);
  const active = await context.db.execute(
    sql`select count(*)::int as total from students where deleted_at is null`,
  );
  expect(rows<{ total: number }>(active)[0]?.total).toBe(0);

  const reuse = await insertStudent("07", "NUV-2017-0103")
    .then(() => null)
    .catch((error: unknown) => error);
  expect(reuse).toBeInstanceOf(Error);
});

test("schools, sections, subjects, students and guardians all carry a version", async () => {
  const result = await context.db.execute(sql`
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'version'
      and table_name in ('schools', 'sections', 'subjects', 'students', 'guardians')
    order by table_name
  `);
  expect(rows<{ table_name: string }>(result).map((row) => row.table_name)).toEqual([
    "guardians",
    "schools",
    "sections",
    "students",
    "subjects",
  ]);
});

test("a guardian link is unique per pair and disappears with the student", async () => {
  const guardianId = uuidv7();
  await context.db.execute(sql`
    insert into guardians (id, school_id, name_en, name_bn, phone, address)
    values (${guardianId}, ${schoolId}, 'Niladri Satra', 'নীলাদ্রি সাঁতরা', '9894911322', 'Nabagram')
  `);
  const studentId = uuidv7();
  await context.db.execute(sql`
    insert into students (id, school_id, section_id, admission_no, roll_no, name_en, name_bn,
                          gender, dob, category, status, admission_date)
    values (${studentId}, ${schoolId}, ${sectionId}, 'NUV-2017-0201', '09',
            'Aisha Khatun', 'আইশা খাতুন', 'female', '2016-01-12', 'obc', 'active', '2017-04-01')
  `);
  await context.db.execute(sql`
    insert into student_guardians (id, school_id, student_id, guardian_id, relationship, is_primary)
    values (${uuidv7()}, ${schoolId}, ${studentId}, ${guardianId}, 'father', true)
  `);

  const duplicate = await context.db.execute(sql`
    insert into student_guardians (id, school_id, student_id, guardian_id, relationship, is_primary)
    values (${uuidv7()}, ${schoolId}, ${studentId}, ${guardianId}, 'mother', false)
  `)
    .then(() => null)
    .catch((error: unknown) => error);
  expect(duplicate).toBeInstanceOf(Error);

  await context.db.execute(sql`delete from students where id = ${studentId}`);
  const links = await context.db.execute(
    sql`select count(*)::int as total from student_guardians where student_id = ${studentId}`,
  );
  expect(rows<{ total: number }>(links)[0]?.total).toBe(0);
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd apps/api && npx vitest run test/master-data-schema.e2e-spec.ts`
Expected: FAIL — `relation "students" does not exist`.

- [ ] **Step 3: Write the student schema**

```ts
// apps/api/src/db/schema/student.ts
import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { sections } from "./academic";
import { schools } from "./school";

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const studentCategoryEnum = pgEnum("student_category", [
  "general",
  "obc",
  "sc",
  "st",
]);
export const studentStatusEnum = pgEnum("student_status", [
  "active",
  "transferred",
  "alumni",
]);
export const guardianRelationshipEnum = pgEnum("guardian_relationship", [
  "father",
  "mother",
  "guardian",
  "other",
]);

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id").notNull(),
    admissionNo: text("admission_no").notNull(),
    rollNo: text("roll_no").notNull(),
    nameEn: text("name_en").notNull(),
    nameBn: text("name_bn").notNull(),
    gender: genderEnum("gender").notNull(),
    dob: date("dob", { mode: "string" }).notNull(),
    category: studentCategoryEnum("category").notNull(),
    status: studentStatusEnum("status").notNull().default("active"),
    address: text("address"),
    avatarKey: text("avatar_key"),
    admissionDate: date("admission_date", { mode: "string" }).notNull(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    admissionUnique: uniqueIndex("students_school_admission_uq").on(
      table.schoolId,
      table.admissionNo,
    ),
    rollUnique: uniqueIndex("students_section_roll_uq").on(
      table.sectionId,
      table.rollNo,
    ),
    rosterIndex: index("students_school_section_idx").on(
      table.schoolId,
      table.sectionId,
      table.rollNo,
    ),
    nameIndex: index("students_school_name_idx").on(table.schoolId, table.nameEn),
    // Needed so a guardian link can pin (school_id, id) together.
    schoolPairUnique: uniqueIndex("students_school_id_uq").on(
      table.schoolId,
      table.id,
    ),
    // A student may only sit in a section of their own school.
    sectionSchoolFk: foreignKey({
      name: "students_section_school_fk",
      columns: [table.schoolId, table.sectionId],
      foreignColumns: [sections.schoolId, sections.id],
    }).onDelete("restrict"),
  }),
);

export const guardians = pgTable(
  "guardians",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    nameEn: text("name_en").notNull(),
    nameBn: text("name_bn").notNull(),
    phone: text("phone").notNull(),
    altPhone: text("alt_phone"),
    address: text("address"),
    occupation: text("occupation"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    phoneIndex: index("guardians_school_phone_idx").on(table.schoolId, table.phone),
    schoolPairUnique: uniqueIndex("guardians_school_id_uq").on(
      table.schoolId,
      table.id,
    ),
  }),
);

export const studentGuardians = pgTable(
  "student_guardians",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    // Composite keys below pin the link to a student and guardian of the same
    // school; a plain single-column FK cannot express that.
    studentId: uuid("student_id").notNull(),
    guardianId: uuid("guardian_id").notNull(),
    relationship: guardianRelationshipEnum("relationship").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pairUnique: uniqueIndex("student_guardians_pair_uq").on(
      table.studentId,
      table.guardianId,
    ),
    studentIndex: index("student_guardians_student_idx").on(table.studentId),
    guardianIndex: index("student_guardians_guardian_idx").on(
      table.guardianId,
    ),
    studentSchoolFk: foreignKey({
      name: "student_guardians_student_school_fk",
      columns: [table.schoolId, table.studentId],
      foreignColumns: [students.schoolId, students.id],
    }).onDelete("cascade"),
    guardianSchoolFk: foreignKey({
      name: "student_guardians_guardian_school_fk",
      columns: [table.schoolId, table.guardianId],
      foreignColumns: [guardians.schoolId, guardians.id],
    }).onDelete("cascade"),
  }),
);

export type StudentGender = typeof genderEnum.enumValues[number];
export type StudentCategory = typeof studentCategoryEnum.enumValues[number];
export type StudentStatus = typeof studentStatusEnum.enumValues[number];
export type GuardianRelationship =
  typeof guardianRelationshipEnum.enumValues[number];
```

Re-export it so `createDb()` includes the new tables in the Drizzle schema map:

```ts
// apps/api/src/db/schema/index.ts
export * from "./school";
export * from "./identity";
export * from "./academic";
export * from "./student";
export * from "./audit";
export * from "./platform";
```

- [ ] **Step 4: Add the missing common columns**

In `school.ts`, add to the `schools` table (its import list already carries `text` and needs
`integer`):

```ts
    sealKey: text("seal_key"),
    version: integer("version").notNull().default(1),
```

In `academic.ts`, add `version: integer("version").notNull().default(1)` to both `sections`
and `subjects`, immediately before each table's `createdAt`, and add
`schoolPairUnique: uniqueIndex("sections_school_id_uq").on(table.schoolId, table.id)` to the
`sections` table config — it is the target of the `(school_id, section_id)` foreign key below.

The reason for that composite key pair is tenancy: a single-column `section_id` foreign key
lets a clerk insert a student into another school's section, because
`PolicyService.canAccessSection` returns `true` for Headmaster and Clerk on any id. The
database, not the service, must make that impossible.

- [ ] **Step 5: Generate, read, then apply the migrations**

```bash
cd apps/api
npx drizzle-kit generate
npm run db:migrate
```

Expected: new SQL files under `drizzle/` and `Database migrations applied.`
Read every generated line before continuing and confirm:

- four `CREATE TYPE`, three `CREATE TABLE`, and the `students_school_admission_uq`,
  `students_section_roll_uq`, `student_guardians_pair_uq` unique indexes;
- `students_section_school_fk` is `ON DELETE restrict`, and the three composite foreign keys
  (`students_section_school_fk`, `student_guardians_student_school_fk`,
  `student_guardians_guardian_school_fk`) exist alongside `student_guardians_guardian_idx`;
- `ADD COLUMN "version" integer DEFAULT 1 NOT NULL` for `schools`, `sections` and `subjects`;
- no `DROP` statement anywhere.

If the generated SQL drops or renames anything from B1, stop and fix the schema definition
rather than editing the SQL by hand.

- [ ] **Step 6: Run the schema test**

Run: `cd apps/api && npx vitest run test/master-data-schema.e2e-spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 7: Update B1's table-list test**

`apps/api/test/schema.e2e-spec.ts` compares the public schema against a fixed list. Add
`"guardians"`, `"student_guardians"` and `"students"` to that `expected` array in
alphabetical position, then run it.

Run: `cd apps/api && npx vitest run test/schema.e2e-spec.ts`
Expected: PASS.

- [ ] **Step 8: Verify nothing regressed, then commit**

Run: `cd apps/api && npm run typecheck && npx vitest run`
Expected: green.

```bash
git add apps/api/src/db/schema apps/api/drizzle apps/api/test/master-data-schema.e2e-spec.ts apps/api/test/schema.e2e-spec.ts
git commit -m "feat(api): add student, guardian and section master data schema"
```

---

## Task 3: School profile, academic years, sections, subjects

**Files:**
- Create: `apps/api/src/modules/school/school.schemas.ts`
- Create: `apps/api/src/modules/school/school.service.ts`
- Create: `apps/api/src/modules/school/school.controller.ts`
- Create: `apps/api/src/modules/school/school.module.ts`
- Modify: `apps/api/src/common/http/version.ts` (add `requireIfMatch`)
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/modules/openapi/openapi.factory.ts` (add the `school` tag)
- Test: `apps/api/test/school.e2e-spec.ts`

**Interfaces:**
- Consumes: `DatabaseService`, `AuditService`, `CurrentUser`, `RequestContext`
  (exported by `src/modules/auth/auth.service.ts`), `ApiException`, `notFound`,
  `isUniqueViolation`, `pageOf` (`src/common/http/api-schemas`), `CursorPage`,
  `encodeCursor`, `decodeCursor`, `assertVersion`, `bumpVersion`, `entityTag`,
  `createZodDto`, `ZodValidationPipe`.
- Produces:
  - `SchoolProfile = { id, nameEn, nameBn, code, udise, type, address, district, established, phone, email, sealKey, version, academicYear: AcademicYearRow | null }`
  - `AcademicYearRow = { id, label, startDate, endDate, isActive }`
  - `SectionRow = { id, classLevel, section, room, capacity, classTeacherId, version }`
  - `SubjectRow = { id, code, nameEn, nameBn, version }`
  - `ListQuery = { limit: number; cursor?: string }`
  - `SchoolService.profile(db, schoolId)`, `.listYears(schoolId, query)`,
    `.updateProfile(user, patch, expectedVersion, context)`, `.createYear(user, input, context)`,
    `.activateYear(user, id, context)`, `.listSections(schoolId, query)`,
    `.createSection(user, input, context)`, `.listSubjects(schoolId, query)`,
    `.createSubject(user, input, context)`
  - `requireIfMatch(header: string | undefined): number`
  - REST `GET/PATCH /v1/school`, `GET/POST /v1/academic-years`,
    `POST /v1/academic-years/:id/activate`, `GET/POST /v1/sections`, `GET/POST /v1/subjects`

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/test/school.e2e-spec.ts
import { afterAll, beforeAll, expect, test } from "vitest";
import { and, eq } from "drizzle-orm";

import { auditEvents } from "../src/db/schema";
import { hashPassword } from "../src/common/security/password-hash";
import { createTestApp, type TestApp } from "./app";
import { errorChain } from "./errors";
import { seedSchool, seedStaffUser } from "./fixtures";

const SCHOOL_CODE = "WB-SCH-09";
const PASSWORD = "demo1234";

let context: TestApp;
let schoolId: string;
let headmaster: string;
let clerk: string;

async function signIn(employeeId: string) {
  const response = await context.request({
    method: "POST",
    url: "/v1/auth/login",
    payload: { schoolCode: SCHOOL_CODE, employeeId, password: PASSWORD },
  });
  expect(response.statusCode).toBe(200);
  return response.json().accessToken as string;
}

async function patchSchool(token: string, ifMatch: string | null, payload: unknown) {
  return context.request({
    method: "PATCH",
    url: "/v1/school",
    headers: {
      authorization: `Bearer ${token}`,
      ...(ifMatch ? { "if-match": ifMatch } : {}),
      "content-type": "application/json",
    },
    payload,
  });
}

beforeAll(async () => {
  context = await createTestApp();
  const passwordHash = await hashPassword(PASSWORD);
  schoolId = (await seedSchool(context.db, SCHOOL_CODE)).schoolId;
  headmaster = (
    await seedStaffUser(context.db, {
      schoolId,
      employeeId: "HM-SCH-01",
      role: "headmaster",
      passwordHash,
    })
  ).employeeId;
  clerk = (
    await seedStaffUser(context.db, {
      schoolId,
      employeeId: "CLK-SCH-01",
      role: "clerk",
      passwordHash,
    })
  ).employeeId;
});

afterAll(async () => {
  await context.close();
});

test("reads the school profile with its active academic year", async () => {
  const response = await context.request({
    method: "GET",
    url: "/v1/school",
    headers: { authorization: `Bearer ${await signIn(headmaster)}` },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
    code: SCHOOL_CODE,
    nameEn: "Test School",
    version: 1,
    academicYear: { label: "2026–27", isActive: true },
  });
  expect(String(response.headers["etag"])).toBe('"1"');
});

test("the headmaster patches the profile and the write is audited", async () => {
  const token = await signIn(headmaster);
  const updated = await patchSchool(token, '"1"', {
    phone: "03452 255014",
    udise: "19000000009",
  });
  expect(updated.statusCode).toBe(200);
  expect(updated.json()).toMatchObject({ phone: "03452 255014", version: 2 });
  expect(String(updated.headers["etag"])).toBe('"2"');

  const rows = await context.db
    .select()
    .from(auditEvents)
    .where(
      and(eq(auditEvents.schoolId, schoolId), eq(auditEvents.action, "school.updated")),
    );
  expect(rows).toHaveLength(1);
  expect(rows[0].after).toMatchObject({ phone: "03452 255014", version: 2 });
  expect(JSON.stringify(rows[0].before)).toContain('"version":1');
});

test("a stale entity tag is refused and a missing one is a precondition failure", async () => {
  const token = await signIn(headmaster);
  const stale = await patchSchool(token, '"1"', { district: "Bardhaman" });
  expect(stale.statusCode).toBe(409);
  expect(stale.json().code).toBe("VERSION_CONFLICT");
  expect(stale.json().current).toBe(2);

  const missing = await patchSchool(token, null, { district: "Bardhaman" });
  expect(missing.statusCode).toBe(428);
  expect(missing.json().code).toBe("PRECONDITION_REQUIRED");
});

test("a clerk cannot change the school profile", async () => {
  const response = await patchSchool(await signIn(clerk), '"2"', {
    nameEn: "Hijacked School",
  });
  expect(response.statusCode).toBe(403);
  expect(response.json().code).toBe("FORBIDDEN");
});

test("sections are created once, by the headmaster only, and page by id", async () => {
  const token = await signIn(headmaster);
  const created = await context.request({
    method: "POST",
    url: "/v1/sections",
    headers: { authorization: `Bearer ${token}` },
    payload: { classLevel: "VIII", section: "C", room: "R-204", capacity: 40 },
  });
  expect(created.statusCode).toBe(201);
  expect(created.json()).toMatchObject({
    classLevel: "VIII",
    section: "C",
    room: "R-204",
    version: 1,
  });

  const replay = await context.request({
    method: "POST",
    url: "/v1/sections",
    headers: { authorization: `Bearer ${token}` },
    payload: { classLevel: "VIII", section: "C", room: "R-204", capacity: 40 },
  });
  expect(replay.statusCode).toBe(409);
  expect(replay.json().code).toBe("SECTION_EXISTS");

  const first = await context.request({
    method: "GET",
    url: "/v1/sections?limit=1",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(first.statusCode).toBe(200);
  expect(first.json().data).toHaveLength(1);
  expect(first.json().nextCursor).toBeTruthy();

  const next = await context.request({
    method: "GET",
    url: `/v1/sections?limit=1&cursor=${encodeURIComponent(first.json().nextCursor)}`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(next.json().data[0].id).not.toBe(first.json().data[0].id);

  const forbidden = await context.request({
    method: "POST",
    url: "/v1/sections",
    headers: { authorization: `Bearer ${await signIn(clerk)}` },
    payload: { classLevel: "VIII", section: "D", room: "R-205" },
  });
  expect(forbidden.statusCode).toBe(403);
});

test("subjects are upper-cased on the way in and unique by code", async () => {
  const token = await signIn(headmaster);
  const created = await context.request({
    method: "POST",
    url: "/v1/subjects",
    headers: { authorization: `Bearer ${token}` },
    payload: { code: "hpe", nameEn: "Physical Education", nameBn: "শারীরিক শিক্ষা" },
  });
  expect(created.statusCode).toBe(201);
  expect(created.json().code).toBe("HPE");

  const duplicate = await context.request({
    method: "POST",
    url: "/v1/subjects",
    headers: { authorization: `Bearer ${token}` },
    payload: { code: "HPE", nameEn: "Duplicate", nameBn: "ডুপ্লিকেট" },
  });
  expect(duplicate.statusCode).toBe(409);
  expect(duplicate.json().code).toBe("SUBJECT_EXISTS");
});

test("activating a year deactivates the previous one and the profile follows", async () => {
  const token = await signIn(headmaster);
  const created = await context.request({
    method: "POST",
    url: "/v1/academic-years",
    headers: { authorization: `Bearer ${token}` },
    payload: { label: "2027–28", startDate: "2027-04-01", endDate: "2028-03-31" },
  });
  expect(created.statusCode).toBe(201);
  expect(created.json().isActive).toBe(false);

  const activated = await context.request({
    method: "POST",
    url: `/v1/academic-years/${created.json().id}/activate`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(activated.statusCode).toBe(204);

  const profile = await context.request({
    method: "GET",
    url: "/v1/school",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(profile.json().academicYear.label).toBe("2027–28");

  const years = await context.request({
    method: "GET",
    url: "/v1/academic-years",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(
    years.json().data.filter((row: { isActive: boolean }) => row.isActive),
  ).toHaveLength(1);

  const reversed = await context.request({
    method: "POST",
    url: "/v1/academic-years",
    headers: { authorization: `Bearer ${token}` },
    payload: { label: "2030–31", startDate: "2031-04-01", endDate: "2030-03-31" },
  });
  expect(reversed.statusCode).toBe(422);
  expect(reversed.json().code).toBe("INVALID_ACADEMIC_YEAR");
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd apps/api && npx vitest run test/school.e2e-spec.ts`
Expected: FAIL — `GET /v1/school` returns `404`.

- [ ] **Step 3: Add `requireIfMatch` to the version helpers**

Append to `apps/api/src/common/http/version.ts`:

```ts
export function requireIfMatch(header: string | undefined): number {
  const version = parseIfMatch(header);
  if (version === null) {
    throw new ApiException(
      428,
      "PRECONDITION_REQUIRED",
      "Send If-Match with the version you read before updating.",
    );
  }
  return version;
}
```

`ApiException`, `parseIfMatch`, `assertVersion` and `entityTag` already live in that file.

- [ ] **Step 4: Write the schemas**

```ts
// apps/api/src/modules/school/school.schemas.ts
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { pageOf } from "../../common/http/api-schemas";

export const classLevels = ["V", "VI", "VII", "VIII", "IX", "X"] as const;

export const academicYearSchema = z.object({
  id: z.uuid(),
  label: z.string(),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  isActive: z.boolean(),
});

export const schoolProfileSchema = z.object({
  id: z.uuid(),
  nameEn: z.string(),
  nameBn: z.string(),
  code: z.string(),
  udise: z.string().nullable(),
  type: z.string(),
  address: z.string(),
  district: z.string(),
  established: z.number().int().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  version: z.number().int().positive(),
  academicYear: academicYearSchema.nullable(),
});

export const updateSchoolSchema = z
  .object({
    nameEn: z.string().min(3).max(160).optional(),
    nameBn: z.string().min(3).max(160).optional(),
    udise: z
      .string()
      .regex(/^\d{11}$/, "UDISE code is 11 digits")
      .nullable()
      .optional(),
    type: z.string().min(3).max(120).optional(),
    address: z.string().min(3).max(240).optional(),
    district: z.string().min(2).max(80).optional(),
    established: z.number().int().min(1800).max(2100).nullable().optional(),
    phone: z
      .string()
      .regex(/^[\d +()-]{6,20}$/)
      .nullable()
      .optional(),
    email: z.string().email().nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to change.",
  });

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().min(1).max(1024).optional(),
});

export const createAcademicYearSchema = z.object({
  label: z.string().min(4).max(24),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
});

export const sectionSchema = z.object({
  id: z.uuid(),
  classLevel: z.enum(classLevels),
  section: z.string(),
  room: z.string(),
  capacity: z.number().int(),
  classTeacherId: z.uuid().nullable(),
  version: z.number().int().positive(),
});

export const createSectionSchema = z.object({
  classLevel: z.enum(classLevels),
  section: z.string().regex(/^[A-Z]$/, "Section is a single capital letter"),
  room: z.string().min(1).max(40),
  capacity: z.coerce.number().int().min(1).max(120).default(50),
  classTeacherId: z.uuid().optional(),
  academicYearId: z.uuid().optional(),
});

export const subjectSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  nameEn: z.string(),
  nameBn: z.string(),
  version: z.number().int().positive(),
});

export const createSubjectSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(8)
    .transform((value) => value.toUpperCase()),
  nameEn: z.string().min(2).max(80),
  nameBn: z.string().min(2).max(80),
});

export class SchoolProfileDto extends createZodDto(schoolProfileSchema) {}
export class UpdateSchoolDto extends createZodDto(updateSchoolSchema) {}
export class AcademicYearDto extends createZodDto(academicYearSchema) {}
export class AcademicYearPageDto extends createZodDto(pageOf(academicYearSchema)) {}
export class CreateAcademicYearDto extends createZodDto(createAcademicYearSchema) {}
export class SectionDto extends createZodDto(sectionSchema) {}
export class SectionPageDto extends createZodDto(pageOf(sectionSchema)) {}
export class CreateSectionDto extends createZodDto(createSectionSchema) {}
export class SubjectDto extends createZodDto(subjectSchema) {}
export class SubjectPageDto extends createZodDto(pageOf(subjectSchema)) {}
export class CreateSubjectDto extends createZodDto(createSubjectSchema) {}

export type SchoolProfile = z.infer<typeof schoolProfileSchema>;
export type AcademicYearRow = z.infer<typeof academicYearSchema>;
export type SectionRow = z.infer<typeof sectionSchema>;
export type SubjectRow = z.infer<typeof subjectSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;
export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
```

- [ ] **Step 5: Write the service**

`SchoolService` injects `DatabaseService` and `AuditService`, exactly like `AuthService` in
B1: reads use `this.database.db`, writes open a transaction and append their audit row in it.

```ts
// apps/api/src/modules/school/school.service.ts
import { Injectable } from "@nestjs/common";
import { and, asc, eq, gt, ne, or } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import { AuditService } from "../../common/audit/audit.service";
import type { CurrentUser } from "../../common/authz/permissions";
import { ApiException, notFound } from "../../common/errors/api-error";
import { isUniqueViolation } from "../../common/errors/db-error";
import {
  decodeCursor,
  encodeCursor,
  type CursorPage,
} from "../../common/http/pagination";
import { assertVersion, bumpVersion } from "../../common/http/version";
import type { DbOrTx } from "../../db/client";
import { DatabaseService } from "../../db/database.service";
import {
  academicYears,
  schools,
  sections,
  subjects,
} from "../../db/schema";
import type { RequestContext } from "../auth/auth.service";
import type {
  AcademicYearRow,
  CreateAcademicYearInput,
  CreateSectionInput,
  CreateSubjectInput,
  ListQuery,
  SchoolProfile,
  SectionRow,
  SubjectRow,
  UpdateSchoolInput,
} from "./school.schemas";

@Injectable()
export class SchoolService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async profile(db: DbOrTx, schoolId: string): Promise<SchoolProfile> {
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);
    if (!school) throw notFound("School");

    const [year] = await db
      .select()
      .from(academicYears)
      .where(
        and(eq(academicYears.schoolId, schoolId), eq(academicYears.isActive, true)),
      )
      .limit(1);

    return {
      id: school.id,
      nameEn: school.nameEn,
      nameBn: school.nameBn,
      code: school.code,
      udise: school.udise,
      type: school.type,
      address: school.address,
      district: school.district,
      established: school.established,
      phone: school.phone,
      email: school.email,
      version: school.version,
      academicYear: year ? toAcademicYear(year) : null,
    };
  }

  async listYears(
    schoolId: string,
    query: ListQuery,
  ): Promise<CursorPage<AcademicYearRow>> {
    const conditions = [eq(academicYears.schoolId, schoolId)];
    if (query.cursor) {
      conditions.push(gt(academicYears.startDate, readDateCursor(query.cursor)));
    }

    const rows = await this.database.db
      .select()
      .from(academicYears)
      .where(and(...conditions))
      .orderBy(asc(academicYears.startDate), asc(academicYears.id))
      .limit(query.limit + 1);

    const data = rows.slice(0, query.limit).map(toAcademicYear);
    const last = data.at(-1);
    return {
      data,
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor({ d: last.startDate, i: last.id })
          : null,
    };
  }

  async updateProfile(
    user: CurrentUser,
    patch: UpdateSchoolInput,
    expectedVersion: number,
    context: RequestContext,
  ): Promise<SchoolProfile> {
    return this.database.db.transaction(async (tx) => {
      const before = await this.profile(tx, user.schoolId);
      assertVersion(expectedVersion, before.version);

      await tx
        .update(schools)
        .set({ ...patch, version: bumpVersion(before.version), updatedAt: new Date() })
        .where(eq(schools.id, user.schoolId));

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "school.updated",
        entityType: "school",
        entityId: user.schoolId,
        before,
        after: { ...patch, version: bumpVersion(before.version) },
        ...context,
      });

      return this.profile(tx, user.schoolId);
    });
  }

  async createYear(
    user: CurrentUser,
    input: CreateAcademicYearInput,
    context: RequestContext,
  ): Promise<AcademicYearRow> {
    if (input.endDate <= input.startDate) {
      throw new ApiException(
        422,
        "INVALID_ACADEMIC_YEAR",
        "The academic year must end after it starts.",
      );
    }

    const id = uuidv7();
    return this.database.db.transaction(async (tx) => {
      try {
        await tx.insert(academicYears).values({
          id,
          schoolId: user.schoolId,
          label: input.label,
          startDate: input.startDate,
          endDate: input.endDate,
          isActive: false,
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ApiException(
            409,
            "ACADEMIC_YEAR_EXISTS",
            "An academic year with that label already exists.",
          );
        }
        throw error;
      }

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "academic_year.created",
        entityType: "academic_year",
        entityId: id,
        after: {
          label: input.label,
          startDate: input.startDate,
          endDate: input.endDate,
        },
        ...context,
      });

      const [row] = await tx
        .select()
        .from(academicYears)
        .where(eq(academicYears.id, id))
        .limit(1);
      return toAcademicYear(row);
    });
  }

  async activateYear(
    user: CurrentUser,
    academicYearId: string,
    context: RequestContext,
  ): Promise<void> {
    return this.database.db.transaction(async (tx) => {
      const [target] = await tx
        .select()
        .from(academicYears)
        .where(
          and(
            eq(academicYears.id, academicYearId),
            eq(academicYears.schoolId, user.schoolId),
          ),
        )
        .limit(1);
      if (!target) throw notFound("Academic year");

      const deactivated = await tx
        .update(academicYears)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(academicYears.schoolId, user.schoolId),
            ne(academicYears.id, academicYearId),
            eq(academicYears.isActive, true),
          ),
        )
        .returning({ id: academicYears.id });

      await tx
        .update(academicYears)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(academicYears.id, academicYearId));

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "academic_year.activated",
        entityType: "academic_year",
        entityId: academicYearId,
        before: { deactivated: deactivated.map((row) => row.id) },
        after: { label: target.label },
        ...context,
      });
    });
  }

  async listSections(
    schoolId: string,
    query: ListQuery,
  ): Promise<CursorPage<SectionRow>> {
    const conditions = [eq(sections.schoolId, schoolId)];
    if (query.cursor) {
      conditions.push(gt(sections.id, readIdCursor(query.cursor)));
    }

    const rows = await this.database.db
      .select()
      .from(sections)
      .where(and(...conditions))
      .orderBy(asc(sections.id))
      .limit(query.limit + 1);

    const data = rows.slice(0, query.limit).map(toSection);
    const last = data.at(-1);
    return {
      data,
      nextCursor:
        rows.length > query.limit && last ? encodeCursor({ i: last.id }) : null,
    };
  }

  async createSection(
    user: CurrentUser,
    input: CreateSectionInput,
    context: RequestContext,
  ): Promise<SectionRow> {
    const academicYearId = await this.resolveYear(user.schoolId, input.academicYearId);
    const id = uuidv7();

    return this.database.db.transaction(async (tx) => {
      try {
        await tx.insert(sections).values({
          id,
          schoolId: user.schoolId,
          academicYearId,
          classLevel: input.classLevel,
          section: input.section,
          room: input.room,
          capacity: input.capacity,
          classTeacherId: input.classTeacherId ?? null,
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ApiException(
            409,
            "SECTION_EXISTS",
            "That class section already exists for this academic year.",
          );
        }
        throw error;
      }

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "section.created",
        entityType: "section",
        entityId: id,
        after: {
          classLevel: input.classLevel,
          section: input.section,
          room: input.room,
        },
        ...context,
      });

      const [row] = await tx
        .select()
        .from(sections)
        .where(eq(sections.id, id))
        .limit(1);
      return toSection(row);
    });
  }

  async listSubjects(
    schoolId: string,
    query: ListQuery,
  ): Promise<CursorPage<SubjectRow>> {
    const conditions = [eq(subjects.schoolId, schoolId)];
    if (query.cursor) {
      const keyset = subjectKeyset(query.cursor);
      if (keyset) conditions.push(keyset);
    }

    const rows = await this.database.db
      .select()
      .from(subjects)
      .where(and(...conditions))
      .orderBy(asc(subjects.code), asc(subjects.id))
      .limit(query.limit + 1);

    const data = rows.slice(0, query.limit).map(toSubject);
    const last = data.at(-1);
    return {
      data,
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor({ c: last.code, i: last.id })
          : null,
    };
  }

  async createSubject(
    user: CurrentUser,
    input: CreateSubjectInput,
    context: RequestContext,
  ): Promise<SubjectRow> {
    const id = uuidv7();
    return this.database.db.transaction(async (tx) => {
      try {
        await tx.insert(subjects).values({
          id,
          schoolId: user.schoolId,
          code: input.code,
          nameEn: input.nameEn,
          nameBn: input.nameBn,
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ApiException(
            409,
            "SUBJECT_EXISTS",
            "A subject with that code already exists.",
          );
        }
        throw error;
      }

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "subject.created",
        entityType: "subject",
        entityId: id,
        after: { code: input.code, nameEn: input.nameEn },
        ...context,
      });

      const [row] = await tx
        .select()
        .from(subjects)
        .where(eq(subjects.id, id))
        .limit(1);
      return toSubject(row);
    });
  }

  private async resolveYear(schoolId: string, explicit?: string): Promise<string> {
    if (explicit) {
      const [row] = await this.database.db
        .select({ id: academicYears.id })
        .from(academicYears)
        .where(
          and(eq(academicYears.id, explicit), eq(academicYears.schoolId, schoolId)),
        )
        .limit(1);
      if (!row) throw notFound("Academic year");
      return row.id;
    }

    const [row] = await this.database.db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(
        and(eq(academicYears.schoolId, schoolId), eq(academicYears.isActive, true)),
      )
      .limit(1);
    if (!row) {
      throw new ApiException(
        409,
        "NO_ACTIVE_ACADEMIC_YEAR",
        "Activate an academic year before adding sections.",
      );
    }
    return row.id;
  }
}

function readIdCursor(cursor: string): string {
  const raw = decodeCursor(cursor);
  if (typeof raw.i !== "string") throw invalidCursor();
  return raw.i;
}

function readDateCursor(cursor: string): string {
  const raw = decodeCursor(cursor);
  if (typeof raw.d !== "string") throw invalidCursor();
  return raw.d;
}

function subjectKeyset(cursor: string) {
  const raw = decodeCursor(cursor);
  if (typeof raw.c !== "string" || typeof raw.i !== "string") throw invalidCursor();
  return or(
    gt(subjects.code, raw.c),
    and(eq(subjects.code, raw.c), gt(subjects.id, raw.i)),
  );
}

function invalidCursor() {
  return new ApiException(
    400,
    "INVALID_CURSOR",
    "The cursor parameter is not a valid page cursor.",
  );
}

function toAcademicYear(row: typeof academicYears.$inferSelect): AcademicYearRow {
  return {
    id: row.id,
    label: row.label,
    startDate: row.startDate,
    endDate: row.endDate,
    isActive: row.isActive,
  };
}

function toSection(row: typeof sections.$inferSelect): SectionRow {
  return {
    id: row.id,
    classLevel: row.classLevel as SectionRow["classLevel"],
    section: row.section,
    room: row.room,
    capacity: row.capacity,
    classTeacherId: row.classTeacherId,
    version: row.version,
  };
}

function toSubject(row: typeof subjects.$inferSelect): SubjectRow {
  return {
    id: row.id,
    code: row.code,
    nameEn: row.nameEn,
    nameBn: row.nameBn,
    version: row.version,
  };
}
```

The `classLevel` cast is needed because the database column is free text while the contract
narrows it to `V`–`X`; `createSectionSchema` is the only writer, so the cast cannot hide a
bad value.

- [ ] **Step 6: Write the controller and module**

Reads use `dashboard.view`, which every role holds, because a class or subject list carries
no student PII. Writes use `sections.manage`; the profile patch uses `settings.manage`.

`SchoolController` uses `@Controller()` with the full method paths listed above, and carries
`@ApiBearerAuth("access_token")`. `sealKey` is a B2b object key with nothing behind it yet, so
it stays a column and is **not** part of `schoolProfileSchema` or the response — a key with no
access control must not be published to every signed-in role.

```ts
// apps/api/src/modules/school/school.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ZodValidationPipe } from "nestjs-zod";
import type { FastifyReply, FastifyRequest } from "fastify";

import {
  CurrentUser,
  RequirePermissions,
} from "../../common/authz/current-user";
import type { CurrentUser as User } from "../../common/authz/permissions";
import { ApiException } from "../../common/errors/api-error";
import { entityTag, requireIfMatch } from "../../common/http/version";
import { DatabaseService } from "../../db/database.service";
import type { RequestContext } from "../auth/auth.service";
import { SchoolService } from "./school.service";
import {
  AcademicYearDto,
  AcademicYearPageDto,
  CreateAcademicYearDto,
  CreateSectionDto,
  CreateSubjectDto,
  SchoolProfileDto,
  SectionDto,
  SectionPageDto,
  SubjectDto,
  SubjectPageDto,
  UpdateSchoolDto,
  createAcademicYearSchema,
  createSectionSchema,
  createSubjectSchema,
  listQuerySchema,
  updateSchoolSchema,
  type ListQuery,
} from "./school.schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags("school")
@Controller("school")
export class SchoolController {
  constructor(
    private readonly school: SchoolService,
    private readonly database: DatabaseService,
  ) {}

  @Get()
  @RequirePermissions("dashboard.view")
  @ApiOperation({ summary: "Read the school profile with its active year" })
  @ApiOkResponse({ type: SchoolProfileDto })
  async getSchool(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const profile = await this.school.profile(this.database.db, user.schoolId);
    reply.header("etag", entityTag(profile.version));
    return profile;
  }

  @Patch()
  @RequirePermissions("settings.manage")
  @ApiOperation({ summary: "Amend the school profile" })
  @ApiOkResponse({ type: SchoolProfileDto })
  async updateSchool(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(updateSchoolSchema)) body: UpdateSchoolDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const profile = await this.school.updateProfile(
      user,
      body,
      requireIfMatch(request.headers["if-match"]),
      contextOf(request),
    );
    reply.header("etag", entityTag(profile.version));
    return profile;
  }

  @Get("academic-years")
  @RequirePermissions("dashboard.view")
  @ApiOperation({ summary: "List academic years" })
  @ApiOkResponse({ type: AcademicYearPageDto })
  academicYears(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    return this.school.listYears(user.schoolId, query);
  }

  @Post("academic-years")
  @RequirePermissions("sections.manage")
  @ApiOperation({ summary: "Add an academic year" })
  @ApiCreatedResponse({ type: AcademicYearDto })
  createAcademicYear(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createAcademicYearSchema))
    body: CreateAcademicYearDto,
    @Req() request: FastifyRequest,
  ) {
    return this.school.createYear(user, body, contextOf(request));
  }

  @Post("academic-years/:id/activate")
  @RequirePermissions("sections.manage")
  @HttpCode(204)
  @ApiOperation({ summary: "Make one year the active year" })
  @ApiNoContentResponse()
  activateAcademicYear(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Req() request: FastifyRequest,
  ) {
    return this.school.activateYear(
      user,
      readUuid(id, "Academic year"),
      contextOf(request),
    );
  }

  @Get("sections")
  @RequirePermissions("dashboard.view")
  @ApiOperation({ summary: "List class sections" })
  @ApiOkResponse({ type: SectionPageDto })
  listSections(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    return this.school.listSections(user.schoolId, query);
  }

  @Post("sections")
  @RequirePermissions("sections.manage")
  @ApiOperation({ summary: "Add a class section" })
  @ApiCreatedResponse({ type: SectionDto })
  createSection(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createSectionSchema)) body: CreateSectionDto,
    @Req() request: FastifyRequest,
  ) {
    return this.school.createSection(user, body, contextOf(request));
  }

  @Get("subjects")
  @RequirePermissions("dashboard.view")
  @ApiOperation({ summary: "List subjects" })
  @ApiOkResponse({ type: SubjectPageDto })
  listSubjects(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    return this.school.listSubjects(user.schoolId, query);
  }

  @Post("subjects")
  @RequirePermissions("sections.manage")
  @ApiOperation({ summary: "Add a subject" })
  @ApiCreatedResponse({ type: SubjectDto })
  createSubject(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createSubjectSchema)) body: CreateSubjectDto,
    @Req() request: FastifyRequest,
  ) {
    return this.school.createSubject(user, body, contextOf(request));
  }
}

function readUuid(value: string, label: string): string {
  if (!UUID.test(value)) {
    throw new ApiException(404, "NOT_FOUND", `${label} was not found.`);
  }
  return value;
}

function contextOf(request: FastifyRequest): RequestContext {
  return {
    requestId: request.id,
    ip: request.ip ?? null,
    userAgent: request.headers["user-agent"] ?? null,
  };
}
```

```ts
// apps/api/src/modules/school/school.module.ts
import { Module } from "@nestjs/common";

import { SchoolController } from "./school.controller";
import { SchoolService } from "./school.service";

@Module({
  controllers: [SchoolController],
  providers: [SchoolService],
  exports: [SchoolService],
})
export class SchoolModule {}
```

Register `SchoolModule` in `src/app.module.ts` after `StaffModule`, and add
`.addTag("school", "School profile, academic years, sections and subjects")` to the
`DocumentBuilder` chain in `src/modules/openapi/openapi.factory.ts`.

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd apps/api && npx vitest run test/school.e2e-spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 8: Verify nothing regressed, then commit**

Run: `cd apps/api && npm run typecheck && npx vitest run`
Expected: green.

```bash
git add apps/api/src/modules/school apps/api/src/common/http/version.ts apps/api/src/app.module.ts apps/api/src/modules/openapi/openapi.factory.ts apps/api/test/school.e2e-spec.ts
git commit -m "feat(api): serve school profile, academic years, sections and subjects"
```


---

## Task 3b: Contract fidelity for nullable fields (pre-existing from B1)

**Files:**
- Investigate: `apps/api/src/common/http/api-schemas.ts`, every `*PageDto`, `apps/api/src/modules/openapi/openapi.factory.ts`
- Test: `apps/api/test/openapi.e2e-spec.ts`
- Modify: whichever schema or generation step the investigation implicates

**Why this is a task and not a note:** the generated TypeScript is the contract B2d codes
against. `z.string().nullable()` currently reaches `openapi-typescript` as
`{ type: "array", items: { type: "string" } }`, so `nextCursor`, `udise`, `phone`, `email` and
`sealKey` all type as `string[]` instead of `string | null`. That is wrong for every list
endpoint in the API and it predates B2a.

**Interfaces:**
- Consumes: the committed `apps/api/openapi.json` and `apps/web/src/lib/api/generated.d.ts`.
- Produces: a contract where a nullable string is `string | null` in the generated types, and a
  test that pins it.

- [ ] **Step 1: Write the failing test**

```ts
// appended to apps/api/test/openapi.e2e-spec.ts
test("a nullable string is not a string array in the contract", () => {
  const schemas = (document.components as { schemas: Record<string, {
    properties?: Record<string, { type?: unknown; items?: unknown; anyOf?: unknown; nullable?: boolean }>;
  }> }).schemas;

  const nextCursor = schemas.StudentPageDto?.properties?.nextCursor ??
    schemas.StaffPageDto?.properties?.nextCursor;
  expect(nextCursor).toBeTruthy();
  expect(nextCursor?.items).toBeUndefined();
  expect(JSON.stringify(nextCursor)).toContain("null");

  const udise = schemas.SchoolProfileDto?.properties?.udise;
  expect(udise?.items).toBeUndefined();
  expect(JSON.stringify(udise)).toContain("null");
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd apps/api && npx vitest run test/openapi.e2e-spec.ts`
Expected: FAIL, showing `type: "array"` with `items`.

- [ ] **Step 3: Find the real cause before changing anything**

Reproduce the mapping in isolation and record the output in the report:

```bash
cd apps/api
node --input-type=module -e '
import { z } from "zod";
const s = z.object({ a: z.string().nullable(), b: z.string().nullish() });
console.log(JSON.stringify(z.toJSONSchema(s, { io: "output" })));
'
```

Then compare with what `cleanupOpenApiDoc(document, { version: "3.0" })` leaves in
`openapi.json` for one `createZodDto` page DTO. The three candidate causes, in order of
likelihood: the `version: "3.0"` cleanup pass in `buildOpenApiDocument`, the
`pageOf`/`nullable()` composition in `api-schemas.ts`, or the installed `nestjs-zod` version's
handling of zod 4 unions. Name the one you can demonstrate, and do not change the OpenAPI
document version to 3.1 without a ruling — `§D2` of the architecture spec pins 3.0.3.

- [ ] **Step 4: Fix it at the cause**

Acceptable shapes: `nullable: true` with `type: "string"` in the 3.0 document, or
`anyOf: [{ type: "string" }, { type: "null" }]` if and only if the cleanup pass renders that as
3.0-compatible. Unacceptable: hand-editing `openapi.json` or the generated types.

If the cause turns out to be an upstream defect with no in-repo fix, stop and report it with the
reproduction, the affected fields, and the workaround options — do not paper over it by casting
in the web app.

- [ ] **Step 5: Regenerate, verify, and commit**

```bash
cd apps/api && npm run openapi:generate && npx vitest run
cd ../web && npm run api:types && npx tsc --noEmit
```

Expected: contract test green, `generated.d.ts` shows `string | null` for those fields, and the
web app still typechecks. Then run `npx vitest run` from `apps/api` for the full suite.

---

## Task 4: Students — scoped reads, creation, roll allocation

**Files:**
- Create: `apps/api/src/modules/students/guardian.schemas.ts` (guardian row schema)
- Create: `apps/api/src/modules/students/guardian.mapper.ts` (joined row → wire row)
- Create: `apps/api/src/modules/students/student.schemas.ts`
- Create: `apps/api/src/modules/students/student.service.ts`
- Create: `apps/api/src/modules/students/student.controller.ts`
- Create: `apps/api/src/modules/students/students.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/modules/openapi/openapi.factory.ts` (add the `students` tag)
- Modify: `apps/api/test/fixtures.ts` (add `seedStudent`, `seedGuardian`)
- Test: `apps/api/test/students.e2e-spec.ts`

**Interfaces:**
- Consumes: `students`, `sections`, `guardians`, `studentGuardians`; `PolicyService.can`,
  `.canAccessSection`; `AuditService.append`; `DatabaseService`; `CurrentUser`;
  `RequestContext`; `CursorPage`, `encodeCursor`, `decodeCursor`; `assertVersion`,
  `bumpVersion`, `entityTag`, `requireIfMatch`; `businessToday`; `ApiException`, `notFound`;
  `isUniqueViolation`; `pageOf`, `createZodDto`, `ZodValidationPipe`.
- Produces:
  - `StudentSummary = { id, admissionNo, rollNo, sectionId, classLabel, nameEn, nameBn, gender, category, status }`
  - `StudentDetail = StudentSummary & { dob, address, avatarKey, admissionDate, version, guardians: GuardianRow[] }`
  - `GuardianRow = { id, nameEn, nameBn, phone, altPhone, address, relationship, isPrimary }`
  - `guardianSchema` (zod) and `GuardianDto`, `toGuardianRow(input)` mapper
  - `StudentService.list(user, query)`, `.detail(user, id)`, `.create(user, input, context)`,
    `.update(user, id, patch, expectedVersion, context)`, `.retire(user, id, status, reason, context)`,
    `.nextRoll(tx, sectionId, excludeStudentId?)`
  - `studentListQuerySchema` with `sectionId`, `search`, `status`, `limit`, `cursor`
  - REST `GET/POST /v1/students`, `GET/PATCH /v1/students/:id`, `POST /v1/students/:id/retire`

- [ ] **Step 1: Add the fixtures the test needs**

Append to `apps/api/test/fixtures.ts`, extending its existing schema import to include
`guardians`, `studentGuardians`, `students`:

```ts
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
  const admissionNo = input.admissionNo ?? `NUV-SEED-${id.slice(0, 8)}`;
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
    nameBn: input.nameEn ?? "সিড অভিভাবক",
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
```

`randomUUID` comes from `node:crypto`, which the fixtures file already imports for
`randomBytes`.

- [ ] **Step 2: Write the failing test**

```ts
// apps/api/test/students.e2e-spec.ts
import { afterAll, beforeAll, expect, test } from "vitest";
import { and, eq } from "drizzle-orm";

import { auditEvents } from "../src/db/schema";
import { hashPassword } from "../src/common/security/password-hash";
import { createTestApp, type TestApp } from "./app";
import { errorChain } from "./errors";
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

test("a student id from another school is a 404, not a leak", async () => {
  const other = (await seedSchool(context.db, "WB-STU-02")).schoolId;
  const otherSection = await seedSection(context.db, {
    schoolId: other,
    academicYearId: (
      await context.db
        .select({ id: auditEvents.id })
        .from(auditEvents)
        .limit(1)
    ).length
      ? "00000000-0000-7000-8000-000000000000"
      : "00000000-0000-7000-8000-000000000000",
    classLevel: "V",
    section: "A",
  }).catch(() => null);
  expect(otherSection).toBeNull();

  const token = await signIn(headmaster);
  const response = await context.request({
    method: "GET",
    url: "/v1/students/00000000-0000-7000-8000-00000000abcd",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(response.statusCode).toBe(404);
});
```

Replace the last test's dead `otherSection` scaffolding with this single assertion block
before running it — a malformed UUID and an unknown UUID must both answer `404` with the same
problem body:

```ts
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
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `cd apps/api && npx vitest run test/students.e2e-spec.ts`
Expected: FAIL — `GET /v1/students` returns `404`.

- [ ] **Step 4: Write the guardian row schema and mapper**

```ts
// apps/api/src/modules/students/guardian.schemas.ts
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { pageOf } from "../../common/http/api-schemas";

export const guardianRelationships = [
  "father",
  "mother",
  "guardian",
  "other",
] as const;

export const guardianSchema = z.object({
  id: z.uuid(),
  nameEn: z.string(),
  nameBn: z.string(),
  phone: z.string(),
  altPhone: z.string().nullable(),
  address: z.string().nullable(),
  relationship: z.enum(guardianRelationships),
  isPrimary: z.boolean(),
});

export const guardianListSchema = pageOf(guardianSchema);

export class GuardianDto extends createZodDto(guardianSchema) {}
export class GuardianListDto extends createZodDto(guardianListSchema) {}

export type GuardianRow = z.infer<typeof guardianSchema>;
```

```ts
// apps/api/src/modules/students/guardian.mapper.ts
import type { GuardianRow } from "./guardian.schemas";

export function toGuardianRow(input: {
  guardians: {
    id: string;
    nameEn: string;
    nameBn: string;
    phone: string;
    altPhone: string | null;
    address: string | null;
  };
  relationship: GuardianRow["relationship"];
  isPrimary: boolean;
}): GuardianRow {
  return {
    id: input.guardians.id,
    nameEn: input.guardians.nameEn,
    nameBn: input.guardians.nameBn,
    phone: input.guardians.phone,
    altPhone: input.guardians.altPhone,
    address: input.guardians.address,
    relationship: input.relationship,
    isPrimary: input.isPrimary,
  };
}
```

- [ ] **Step 5: Write the student schemas**

```ts
// apps/api/src/modules/students/student.schemas.ts
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { pageOf } from "../../common/http/api-schemas";
import { guardianRelationships, guardianSchema } from "./guardian.schemas";

export const classLevels = ["V", "VI", "VII", "VIII", "IX", "X"] as const;
export const genders = ["male", "female", "other"] as const;
export const categories = ["general", "obc", "sc", "st"] as const;
export const studentStatuses = ["active", "transferred", "alumni"] as const;

export const studentSummarySchema = z.object({
  id: z.uuid(),
  admissionNo: z.string(),
  rollNo: z.string(),
  sectionId: z.uuid(),
  classLabel: z.string(),
  nameEn: z.string(),
  nameBn: z.string(),
  gender: z.enum(genders),
  category: z.enum(categories),
  status: z.enum(studentStatuses),
});

export const studentDetailSchema = studentSummarySchema.extend({
  dob: z.iso.date(),
  address: z.string().nullable(),
  avatarKey: z.string().nullable(),
  admissionDate: z.iso.date(),
  version: z.number().int().positive(),
  guardians: z.array(guardianSchema),
});

export const studentListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().min(1).max(1024).optional(),
  sectionId: z.uuid().optional(),
  search: z.string().min(1).max(64).optional(),
  status: z.enum(studentStatuses).default("active"),
});

export const createStudentSchema = z.object({
  admissionNo: z.string().min(3).max(32),
  rollNo: z
    .string()
    .regex(/^\d{1,4}$/)
    .optional(),
  sectionId: z.uuid(),
  nameEn: z.string().min(2).max(120),
  nameBn: z.string().min(2).max(120),
  gender: z.enum(genders),
  dob: z.iso.date(),
  category: z.enum(categories),
  address: z.string().min(3).max(240).optional(),
  avatarKey: z.string().max(160).optional(),
  admissionDate: z.iso.date().optional(),
  guardian: z
    .object({
      nameEn: z.string().min(2).max(120),
      nameBn: z.string().min(2).max(120),
      phone: z.string().regex(/^\d{10}$/, "Enter a 10-digit mobile number"),
      address: z.string().min(3).max(240).optional(),
      relationship: z.enum(guardianRelationships).default("guardian"),
    })
    .optional(),
});

export const updateStudentSchema = z
  .object({
    nameEn: z.string().min(2).max(120).optional(),
    nameBn: z.string().min(2).max(120).optional(),
    gender: z.enum(genders).optional(),
    dob: z.iso.date().optional(),
    category: z.enum(categories).optional(),
    address: z.string().min(3).max(240).nullable().optional(),
    avatarKey: z.string().max(160).nullable().optional(),
    sectionId: z.uuid().optional(),
    rollNo: z
      .string()
      .regex(/^\d{1,4}$/)
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to change.",
  });

export const retireStudentSchema = z.object({
  status: z.enum(["transferred", "alumni"]),
  reason: z.string().min(3).max(240).optional(),
});

export class StudentSummaryDto extends createZodDto(studentSummarySchema) {}
export class StudentDetailDto extends createZodDto(studentDetailSchema) {}
export class StudentPageDto extends createZodDto(pageOf(studentSummarySchema)) {}
export class CreateStudentDto extends createZodDto(createStudentSchema) {}
export class UpdateStudentDto extends createZodDto(updateStudentSchema) {}
export class RetireStudentDto extends createZodDto(retireStudentSchema) {}

export type StudentSummary = z.infer<typeof studentSummarySchema>;
export type StudentDetail = z.infer<typeof studentDetailSchema>;
export type StudentListQuery = z.infer<typeof studentListQuerySchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
```

`updateStudentSchema` is `.strict()`, so `admissionNo` in a PATCH is a validation failure
rather than a silently ignored field — that is how the admission number stays immutable.

- [ ] **Step 6: Write the service**

```ts
// apps/api/src/modules/students/student.service.ts
import { Injectable } from "@nestjs/common";
import {
  and,
  asc,
  eq,
  gt,
  ilike,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import { AuditService } from "../../common/audit/audit.service";
import type { CurrentUser } from "../../common/authz/permissions";
import { PolicyService } from "../../common/authz/policy.service";
import { ApiException, notFound } from "../../common/errors/api-error";
import { errorCode, isUniqueViolation } from "../../common/errors/db-error";
import {
  decodeCursor,
  encodeCursor,
  type CursorPage,
} from "../../common/http/pagination";
import { assertVersion, bumpVersion } from "../../common/http/version";
import { businessToday } from "../../common/time/clock";
import type { DbOrTx } from "../../db/client";
import { DatabaseService } from "../../db/database.service";
import {
  guardians,
  sections,
  studentGuardians,
  students,
} from "../../db/schema";
import type { RequestContext } from "../auth/auth.service";
import { toGuardianRow } from "./guardian.mapper";
import type { GuardianRow } from "./guardian.schemas";
import type {
  CreateStudentInput,
  StudentDetail,
  StudentListQuery,
  StudentSummary,
  UpdateStudentInput,
} from "./student.schemas";

@Injectable()
export class StudentService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly policy: PolicyService,
  ) {}

  async list(
    user: CurrentUser,
    query: StudentListQuery,
  ): Promise<CursorPage<StudentSummary>> {
    if (query.sectionId) this.requireSection(user, query.sectionId);

    const scoped =
      user.role === "teacher" && !user.isAssistantHeadmaster
        ? user.sectionIds
        : null;
    if (scoped && scoped.length === 0 && !query.sectionId) {
      return { data: [], nextCursor: null };
    }

    const conditions = [
      eq(students.schoolId, user.schoolId),
      eq(students.status, query.status),
      isNull(students.deletedAt),
    ];

    if (query.sectionId) {
      conditions.push(eq(students.sectionId, query.sectionId));
    } else if (scoped) {
      conditions.push(sqlIn(students.sectionId, scoped));
    }

    if (query.search) {
      const pattern = `%${query.search}%`;
      const matches = or(
        ilike(students.nameEn, pattern),
        ilike(students.nameBn, pattern),
        ilike(students.admissionNo, pattern),
        eq(students.rollNo, query.search),
      );
      if (matches) conditions.push(matches);
    }

    if (query.cursor) {
      const keyset = keysetAfter(query.cursor);
      if (keyset) conditions.push(keyset);
    }

    const rows = await this.database.db
      .select({
        id: students.id,
        admissionNo: students.admissionNo,
        rollNo: students.rollNo,
        sectionId: students.sectionId,
        classLevel: sections.classLevel,
        sectionName: sections.section,
        nameEn: students.nameEn,
        nameBn: students.nameBn,
        gender: students.gender,
        category: students.category,
        status: students.status,
      })
      .from(students)
      .innerJoin(sections, eq(sections.id, students.sectionId))
      .where(and(...conditions))
      .orderBy(asc(students.sectionId), asc(students.rollNo), asc(students.id))
      .limit(query.limit + 1);

    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      data: page.map((row) => ({
        id: row.id,
        admissionNo: row.admissionNo,
        rollNo: row.rollNo,
        sectionId: row.sectionId,
        classLabel: `${row.classLevel} ${row.sectionName}`,
        nameEn: row.nameEn,
        nameBn: row.nameBn,
        gender: row.gender,
        category: row.category,
        status: row.status,
      })),
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor({ s: last.sectionId, k: last.rollNo, i: last.id })
          : null,
    };
  }

  async detail(user: CurrentUser, studentId: string): Promise<StudentDetail> {
    const row = await this.findRow(this.database.db, user.schoolId, studentId);
    if (!row) throw notFound("Student");
    this.requireSection(user, row.sectionId);
    return this.withGuardians(row);
  }

  async create(
    user: CurrentUser,
    input: CreateStudentInput,
    context: RequestContext,
  ): Promise<StudentDetail> {
    this.requireSection(user, input.sectionId);

    const id = uuidv7();
    const admissionDate = input.admissionDate ?? businessToday();

    return this.database.db.transaction(async (tx) => {
      const rollNo = input.rollNo ?? (await this.nextRoll(tx, input.sectionId));
      try {
        await tx.insert(students).values({
          id,
          schoolId: user.schoolId,
          sectionId: input.sectionId,
          admissionNo: input.admissionNo,
          rollNo,
          nameEn: input.nameEn,
          nameBn: input.nameBn,
          gender: input.gender,
          dob: input.dob,
          category: input.category,
          address: input.address ?? null,
          avatarKey: input.avatarKey ?? null,
          admissionDate,
          status: "active",
        });
      } catch (error) {
        throw studentConflict(error, input.admissionNo);
      }

      if (input.guardian) {
        const guardianId = uuidv7();
        await tx.insert(guardians).values({
          id: guardianId,
          schoolId: user.schoolId,
          nameEn: input.guardian.nameEn,
          nameBn: input.guardian.nameBn,
          phone: input.guardian.phone,
          address: input.guardian.address ?? input.address ?? null,
        });
        await tx.insert(studentGuardians).values({
          id: uuidv7(),
          schoolId: user.schoolId,
          studentId: id,
          guardianId,
          relationship: input.guardian.relationship,
          isPrimary: true,
        });
      }

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "student.created",
        entityType: "student",
        entityId: id,
        after: {
          admissionNo: input.admissionNo,
          rollNo,
          sectionId: input.sectionId,
          nameEn: input.nameEn,
        },
        ...context,
      });

      const created = await this.findRow(tx, user.schoolId, id);
      if (!created) throw notFound("Student");
      return this.withGuardians(created);
    });
  }

  async update(
    user: CurrentUser,
    studentId: string,
    patch: UpdateStudentInput,
    expectedVersion: number,
    context: RequestContext,
  ): Promise<StudentDetail> {
    const before = await this.detail(user, studentId);
    assertVersion(expectedVersion, before.version);

    const targetSection = patch.sectionId ?? before.sectionId;
    this.requireSection(user, targetSection);

    return this.database.db.transaction(async (tx) => {
      const rollNo =
        patch.rollNo ??
        (patch.sectionId && patch.sectionId !== before.sectionId
          ? await this.nextRoll(tx, patch.sectionId, studentId)
          : before.rollNo);

      try {
        await tx
          .update(students)
          .set({
            ...patch,
            sectionId: targetSection,
            rollNo,
            version: bumpVersion(before.version),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(students.id, studentId),
              eq(students.schoolId, user.schoolId),
            ),
          );
      } catch (error) {
        throw studentConflict(error, before.admissionNo);
      }

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "student.updated",
        entityType: "student",
        entityId: studentId,
        before,
        after: { ...patch, sectionId: targetSection, rollNo },
        ...context,
      });

      return this.detail(user, studentId);
    });
  }

  async retire(
    user: CurrentUser,
    studentId: string,
    status: "transferred" | "alumni",
    reason: string | undefined,
    context: RequestContext,
  ): Promise<StudentDetail> {
    const before = await this.detail(user, studentId);
    return this.database.db.transaction(async (tx) => {
      await tx
        .update(students)
        .set({
          status,
          version: bumpVersion(before.version),
          updatedAt: new Date(),
        })
        .where(
          and(eq(students.id, studentId), eq(students.schoolId, user.schoolId)),
        );

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "student.retired",
        entityType: "student",
        entityId: studentId,
        before: { status: before.status },
        after: { status, reason: reason ?? null },
        ...context,
      });

      return this.detail(user, studentId);
    });
  }

  async nextRoll(
    tx: DbOrTx,
    sectionId: string,
    excludeStudentId?: string,
  ): Promise<string> {
    const conditions = [eq(students.sectionId, sectionId)];
    if (excludeStudentId) {
      conditions.push(sql`${students.id} <> ${excludeStudentId}`);
    }
    const rows = await tx
      .select({ rollNo: students.rollNo })
      .from(students)
      .where(and(...conditions));

    const highest = rows.reduce(
      (max, row) => Math.max(max, Number.parseInt(row.rollNo, 10) || 0),
      0,
    );
    return String(highest + 1).padStart(2, "0");
  }

  private requireSection(user: CurrentUser, sectionId: string): void {
    if (!this.policy.canAccessSection(user, sectionId)) {
      throw sectionForbidden();
    }
  }

  private findRow(db: DbOrTx, schoolId: string, studentId: string) {
    return db
      .select()
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  private async withGuardians(
    row: typeof students.$inferSelect,
  ): Promise<StudentDetail> {
    const links = await this.database.db
      .select({
        guardians: guardians,
        relationship: studentGuardians.relationship,
        isPrimary: studentGuardians.isPrimary,
      })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .where(eq(studentGuardians.studentId, row.id))
      .orderBy(sql`${studentGuardians.isPrimary} desc`);

    return {
      id: row.id,
      admissionNo: row.admissionNo,
      rollNo: row.rollNo,
      sectionId: row.sectionId,
      classLabel: await this.classLabel(row.sectionId),
      nameEn: row.nameEn,
      nameBn: row.nameBn,
      gender: row.gender,
      category: row.category,
      status: row.status,
      dob: row.dob,
      address: row.address,
      avatarKey: row.avatarKey,
      admissionDate: row.admissionDate,
      version: row.version,
      guardians: links.map(toGuardianRow),
    };
  }

  private async classLabel(sectionId: string): Promise<string> {
    const [section] = await this.database.db
      .select({ classLevel: sections.classLevel, section: sections.section })
      .from(sections)
      .where(eq(sections.id, sectionId))
      .limit(1);
    return section ? `${section.classLevel} ${section.section}` : "";
  }
}

function sectionForbidden() {
  return new ApiException(
    403,
    "FORBIDDEN",
    "You do not have permission to perform this action.",
    { required: ["students.view"] },
  );
}

function sqlIn(column: { name: string }, values: string[]) {
  return sql`${sql.identifier(column.name)} in (${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )})`;
}

function keysetAfter(cursor: string) {
  const raw = decodeCursor(cursor);
  const sectionId = typeof raw.s === "string" ? raw.s : "";
  const rollNo = typeof raw.k === "string" ? raw.k : "";
  const id = typeof raw.i === "string" ? raw.i : "";
  if (!sectionId || !rollNo || !id) throw invalidCursor();
  return or(
    gt(students.sectionId, sectionId),
    and(
      eq(students.sectionId, sectionId),
      or(
        gt(students.rollNo, rollNo),
        and(eq(students.rollNo, rollNo), gt(students.id, id)),
      ),
    ),
  );
}

function invalidCursor() {
  return new ApiException(
    400,
    "INVALID_CURSOR",
    "The cursor parameter is not a valid page cursor.",
  );
}

function studentConflict(error: unknown, admissionNo: string): unknown {
  if (!isUniqueViolation(error)) return error;
  const constraint = String(errorCode(error) ?? "");
  const text = String(error);
  if (text.includes("students_school_admission_uq")) {
    return new ApiException(
      409,
      "ADMISSION_NO_TAKEN",
      `Admission number ${admissionNo} is already used in this school.`,
    );
  }
  void constraint;
  return new ApiException(
    409,
    "ROLL_NO_TAKEN",
    "That roll number is already used in this class section.",
  );
}
```

`studentConflict` distinguishes the two unique violations by constraint name because
PostgreSQL reports both as `23505`. Drop the `constraint`/`errorCode` line if the
constraint name is already present on the error object; keep the name match, not the
message match, since messages are locale-independent but wording is not.

- [ ] **Step 7: Write the controller and module**

```ts
// apps/api/src/modules/students/student.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ZodValidationPipe } from "nestjs-zod";
import type { FastifyReply, FastifyRequest } from "fastify";

import {
  CurrentUser,
  RequirePermissions,
} from "../../common/authz/current-user";
import type { CurrentUser as User } from "../../common/authz/permissions";
import { ApiException } from "../../common/errors/api-error";
import { entityTag, requireIfMatch } from "../../common/http/version";
import type { RequestContext } from "../auth/auth.service";
import { StudentService } from "./student.service";
import {
  CreateStudentDto,
  RetireStudentDto,
  StudentDetailDto,
  StudentPageDto,
  UpdateStudentDto,
  createStudentSchema,
  retireStudentSchema,
  studentListQuerySchema,
  updateStudentSchema,
  type StudentListQuery,
} from "./student.schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags("students")
@Controller("students")
@RequirePermissions("students.view")
export class StudentController {
  constructor(private readonly students: StudentService) {}

  @Get()
  @ApiOperation({ summary: "List students inside the caller's scope" })
  @ApiOkResponse({ type: StudentPageDto })
  list(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(studentListQuerySchema)) query: StudentListQuery,
  ) {
    return this.students.list(user, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Read one student, guardians included" })
  @ApiOkResponse({ type: StudentDetailDto })
  async detail(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const student = await this.students.detail(user, readUuid(id));
    reply.header("etag", entityTag(student.version));
    return student;
  }

  @Post()
  @RequirePermissions("students.create")
  @ApiOperation({ summary: "Enrol a student" })
  @ApiCreatedResponse({ type: StudentDetailDto })
  create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createStudentSchema)) body: CreateStudentDto,
    @Req() request: FastifyRequest,
  ) {
    return this.students.create(user, body, contextOf(request));
  }

  @Patch(":id")
  @RequirePermissions("students.edit")
  @ApiOperation({ summary: "Amend a student record" })
  @ApiOkResponse({ type: StudentDetailDto })
  async update(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateStudentSchema)) body: UpdateStudentDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const student = await this.students.update(
      user,
      readUuid(id),
      body,
      requireIfMatch(request.headers["if-match"]),
      contextOf(request),
    );
    reply.header("etag", entityTag(student.version));
    return student;
  }

  @Post(":id/retire")
  @RequirePermissions("students.edit")
  @ApiOperation({ summary: "Mark a student transferred or an alumnus" })
  @ApiOkResponse({ type: StudentDetailDto })
  retire(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(retireStudentSchema)) body: RetireStudentDto,
    @Req() request: FastifyRequest,
  ) {
    return this.students.retire(
      user,
      readUuid(id),
      body.status,
      body.reason,
      contextOf(request),
    );
  }
}

function readUuid(value: string): string {
  if (!UUID.test(value)) throw notFoundStudent();
  return value;
}

function notFoundStudent() {
  return new ApiException(404, "NOT_FOUND", "Student was not found.");
}

function contextOf(request: FastifyRequest): RequestContext {
  return {
    requestId: request.id,
    ip: request.ip ?? null,
    userAgent: request.headers["user-agent"] ?? null,
  };
}
```

```ts
// apps/api/src/modules/students/students.module.ts
import { Module } from "@nestjs/common";

import { StudentController } from "./student.controller";
import { StudentService } from "./student.service";

@Module({
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentsModule {}
```

Register `StudentsModule` in `src/app.module.ts` after `SchoolModule`, and add
`.addTag("students", "Students and guardians")` in `openapi.factory.ts`. Task 5 adds the
guardian controller and service to this module.

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd apps/api && npx vitest run test/students.e2e-spec.ts`
Expected: PASS (11 tests).

- [ ] **Step 9: Verify nothing regressed, then commit**

Run: `cd apps/api && npm run typecheck && npx vitest run`
Expected: green.

```bash
git add apps/api/src/modules/students apps/api/src/app.module.ts apps/api/src/modules/openapi/openapi.factory.ts apps/api/test/students.e2e-spec.ts apps/api/test/fixtures.ts
git commit -m "feat(api): serve scoped student records with roll allocation"
```

---

## Task 5: Guardians — shared rows, one primary link, contact data off lists

**Files:**
- Create: `apps/api/src/modules/students/guardian.service.ts`
- Create: `apps/api/src/modules/students/guardian.controller.ts`
- Modify: `apps/api/src/modules/students/guardian.schemas.ts` (attach input schema)
- Modify: `apps/api/src/modules/students/students.module.ts` (register controller + service)
- Test: `apps/api/test/guardians.e2e-spec.ts`

**Interfaces:**
- Consumes: `guardians`, `studentGuardians`, `students`, `PolicyService`, `AuditService`,
  `DatabaseService`, `RequestContext`, `ApiException`, `notFound`, `isUniqueViolation`,
  `guardianSchema`, `GuardianRow`, `toGuardianRow`, `pageOf`, `createZodDto`.
- Produces:
  - `attachGuardianSchema` / `AttachGuardianInput` — `{ guardianId?, nameEn?, nameBn?, phone?, altPhone?, address?, relationship, isPrimary }`
  - `GuardianService.listForStudent(user, studentId)`, `.attach(user, studentId, input, context)`,
    `.detach(user, studentId, guardianId, context)`, `.setPrimary(user, studentId, guardianId, context)`
  - REST `GET/POST /v1/students/:studentId/guardians`,
    `POST /v1/students/:studentId/guardians/:guardianId/primary`,
    `DELETE /v1/students/:studentId/guardians/:guardianId`

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/test/guardians.e2e-spec.ts
import { afterAll, beforeAll, expect, test } from "vitest";
import { and, eq } from "drizzle-orm";

import {
  auditEvents,
  guardians,
  studentGuardians,
  students,
} from "../src/db/schema";
import { hashPassword } from "../src/common/security/password-hash";
import { createTestApp, type TestApp } from "./app";
import { errorChain } from "./errors";
import {
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

type GuardianLike = { id: string; nameEn: string; isPrimary: boolean };
```

The last test needs one more helper. Add it to `apps/api/test/fixtures.ts`, alongside the
existing `seedSchool`, so tests can reuse the academic year of a seeded school:

```ts
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
```

Then import `activeYearId` from `./fixtures` in the test file instead of calling it as a free
function, and add `academicYears`, `and`, `eq` to the imports it needs (`academicYears` from
`../src/db/schema`, `and`/`eq` already imported there).

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd apps/api && npx vitest run test/guardians.e2e-spec.ts`
Expected: FAIL — `POST /v1/students/:studentId/guardians` returns `404`.

- [ ] **Step 3: Append the attach schema**

Add to `apps/api/src/modules/students/guardian.schemas.ts`:

```ts
export const attachGuardianSchema = z
  .object({
    guardianId: z.uuid().optional(),
    nameEn: z.string().min(2).max(120).optional(),
    nameBn: z.string().min(2).max(120).optional(),
    phone: z
      .string()
      .regex(/^\d{10}$/, "Enter a 10-digit mobile number")
      .optional(),
    altPhone: z
      .string()
      .regex(/^\d{10}$/, "Enter a 10-digit mobile number")
      .nullable()
      .optional(),
    address: z.string().min(3).max(240).nullable().optional(),
    relationship: z.enum(guardianRelationships).default("guardian"),
    isPrimary: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.guardianId) return;
    for (const field of ["nameEn", "nameBn", "phone"] as const) {
      if (!value[field]) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `Provide ${field}, or a guardianId to link an existing guardian.`,
        });
      }
    }
  });

export class AttachGuardianDto extends createZodDto(attachGuardianSchema) {}

export type AttachGuardianInput = z.infer<typeof attachGuardianSchema>;
```

- [ ] **Step 4: Write the service**

```ts
// apps/api/src/modules/students/guardian.service.ts
import { Injectable } from "@nestjs/common";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import { AuditService } from "../../common/audit/audit.service";
import type { CurrentUser } from "../../common/authz/permissions";
import { PolicyService } from "../../common/authz/policy.service";
import { ApiException, notFound } from "../../common/errors/api-error";
import { isUniqueViolation } from "../../common/errors/db-error";
import type { DbOrTx } from "../../db/client";
import { DatabaseService } from "../../db/database.service";
import { guardians, studentGuardians, students } from "../../db/schema";
import type { RequestContext } from "../auth/auth.service";
import { toGuardianRow } from "./guardian.mapper";
import type { AttachGuardianInput, GuardianRow } from "./guardian.schemas";

@Injectable()
export class GuardianService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly policy: PolicyService,
  ) {}

  async listForStudent(
    user: CurrentUser,
    studentId: string,
  ): Promise<{ data: GuardianRow[]; nextCursor: null }> {
    await this.student(user, studentId);
    return { data: await this.rows(studentId), nextCursor: null };
  }

  async attach(
    user: CurrentUser,
    studentId: string,
    input: AttachGuardianInput,
    context: RequestContext,
  ): Promise<GuardianRow> {
    await this.student(user, studentId);

    return this.database.db.transaction(async (tx) => {
      const guardianId = input.guardianId ?? (await this.createPerson(tx, user, input));

      if (input.isPrimary) {
        await tx
          .update(studentGuardians)
          .set({ isPrimary: false })
          .where(eq(studentGuardians.studentId, studentId));
      }

      try {
        await tx.insert(studentGuardians).values({
          id: uuidv7(),
          schoolId: user.schoolId,
          studentId,
          guardianId,
          relationship: input.relationship,
          isPrimary: input.isPrimary,
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ApiException(
            409,
            "GUARDIAN_ALREADY_LINKED",
            "This guardian is already linked to the student.",
          );
        }
        throw error;
      }

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "guardian.attached",
        entityType: "student",
        entityId: studentId,
        after: {
          guardianId,
          relationship: input.relationship,
          isPrimary: input.isPrimary,
        },
        ...context,
      });

      const created = (await this.rows(studentId, tx)).find(
        (row) => row.id === guardianId,
      );
      if (!created) throw notFound("Guardian");
      return created;
    });
  }

  async detach(
    user: CurrentUser,
    studentId: string,
    guardianId: string,
    context: RequestContext,
  ): Promise<void> {
    await this.student(user, studentId);
    return this.database.db.transaction(async (tx) => {
      const deleted = await tx
        .delete(studentGuardians)
        .where(
          and(
            eq(studentGuardians.studentId, studentId),
            eq(studentGuardians.guardianId, guardianId),
          ),
        )
        .returning({ id: studentGuardians.id });
      if (deleted.length === 0) throw notFound("Guardian link");

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "guardian.detached",
        entityType: "student",
        entityId: studentId,
        before: { guardianId },
        after: { detached: true },
        ...context,
      });
    });
  }

  async setPrimary(
    user: CurrentUser,
    studentId: string,
    guardianId: string,
    context: RequestContext,
  ): Promise<void> {
    await this.student(user, studentId);
    return this.database.db.transaction(async (tx) => {
      const [link] = await tx
        .select({ id: studentGuardians.id })
        .from(studentGuardians)
        .where(
          and(
            eq(studentGuardians.studentId, studentId),
            eq(studentGuardians.guardianId, guardianId),
          ),
        )
        .limit(1);
      if (!link) throw notFound("Guardian link");

      await tx
        .update(studentGuardians)
        .set({ isPrimary: false })
        .where(eq(studentGuardians.studentId, studentId));
      await tx
        .update(studentGuardians)
        .set({ isPrimary: true })
        .where(eq(studentGuardians.id, link.id));

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "guardian.primary_changed",
        entityType: "student",
        entityId: studentId,
        after: { guardianId },
        ...context,
      });
    });
  }

  private async createPerson(
    tx: DbOrTx,
    user: CurrentUser,
    input: AttachGuardianInput,
  ): Promise<string> {
    const id = uuidv7();
    await tx.insert(guardians).values({
      id,
      schoolId: user.schoolId,
      nameEn: input.nameEn ?? "",
      nameBn: input.nameBn ?? "",
      phone: input.phone ?? "",
      altPhone: input.altPhone ?? null,
      address: input.address ?? null,
    });
    return id;
  }

  private async student(user: CurrentUser, studentId: string) {
    const [row] = await this.database.db
      .select({ id: students.id, sectionId: students.sectionId })
      .from(students)
      .where(
        and(
          eq(students.id, studentId),
          eq(students.schoolId, user.schoolId),
          isNull(students.deletedAt),
        ),
      )
      .limit(1);
    if (!row) throw notFound("Student");
    if (!this.policy.canAccessSection(user, row.sectionId)) {
      throw new ApiException(
        403,
        "FORBIDDEN",
        "You do not have permission to perform this action.",
        { required: ["students.view"] },
      );
    }
    return row;
  }

  private async rows(
    studentId: string,
    tx = this.database.db,
  ): Promise<GuardianRow[]> {
    const links = await tx
      .select({
        guardians: guardians,
        relationship: studentGuardians.relationship,
        isPrimary: studentGuardians.isPrimary,
      })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .where(eq(studentGuardians.studentId, studentId))
      .orderBy(desc(studentGuardians.isPrimary), sql`${guardians.nameEn} asc`);
    return links.map(toGuardianRow);
  }
}
```

`createPerson` is only reached after `attachGuardianSchema.superRefine` has guaranteed
`nameEn`, `nameBn` and `phone`, so the `?? ""` fallbacks exist purely to satisfy the
inferred optional types; the columns are `NOT NULL` and the schema rejects an empty value.

- [ ] **Step 5: Write the controller and register it**

```ts
// apps/api/src/modules/students/guardian.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ZodValidationPipe } from "nestjs-zod";
import type { FastifyRequest } from "fastify";

import {
  CurrentUser,
  RequirePermissions,
} from "../../common/authz/current-user";
import type { CurrentUser as User } from "../../common/authz/permissions";
import { ApiException } from "../../common/errors/api-error";
import type { RequestContext } from "../auth/auth.service";
import { GuardianService } from "./guardian.service";
import {
  AttachGuardianDto,
  GuardianDto,
  GuardianListDto,
  attachGuardianSchema,
} from "./guardian.schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags("students")
@Controller("students/:studentId/guardians")
@RequirePermissions("students.view")
export class GuardianController {
  constructor(private readonly guardians: GuardianService) {}

  @Get()
  @ApiOperation({ summary: "List the guardians of one student" })
  @ApiOkResponse({ type: GuardianListDto })
  list(@CurrentUser() user: User, @Param("studentId") studentId: string) {
    return this.guardians.listForStudent(user, readUuid(studentId));
  }

  @Post()
  @RequirePermissions("students.edit")
  @ApiOperation({ summary: "Attach a guardian, new or existing" })
  @ApiCreatedResponse({ type: GuardianDto })
  attach(
    @CurrentUser() user: User,
    @Param("studentId") studentId: string,
    @Body(new ZodValidationPipe(attachGuardianSchema)) body: AttachGuardianDto,
    @Req() request: FastifyRequest,
  ) {
    return this.guardians.attach(
      user,
      readUuid(studentId),
      body,
      contextOf(request),
    );
  }

  @Post(":guardianId/primary")
  @RequirePermissions("students.edit")
  @HttpCode(204)
  @ApiOperation({ summary: "Make a linked guardian the primary contact" })
  @ApiNoContentResponse()
  setPrimary(
    @CurrentUser() user: User,
    @Param("studentId") studentId: string,
    @Param("guardianId") guardianId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.guardians.setPrimary(
      user,
      readUuid(studentId),
      readUuid(guardianId),
      contextOf(request),
    );
  }

  @Delete(":guardianId")
  @RequirePermissions("students.edit")
  @HttpCode(204)
  @ApiOperation({ summary: "Unlink a guardian from this student" })
  @ApiNoContentResponse()
  detach(
    @CurrentUser() user: User,
    @Param("studentId") studentId: string,
    @Param("guardianId") guardianId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.guardians.detach(
      user,
      readUuid(studentId),
      readUuid(guardianId),
      contextOf(request),
    );
  }
}

function readUuid(value: string): string {
  if (!UUID.test(value)) {
    throw new ApiException(404, "NOT_FOUND", "Student was not found.");
  }
  return value;
}

function contextOf(request: FastifyRequest): RequestContext {
  return {
    requestId: request.id,
    ip: request.ip ?? null,
    userAgent: request.headers["user-agent"] ?? null,
  };
}
```

Register both in `apps/api/src/modules/students/students.module.ts`:

```ts
@Module({
  controllers: [StudentController, GuardianController],
  providers: [StudentService, GuardianService],
  exports: [StudentService, GuardianService],
})
export class StudentsModule {}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd apps/api && npx vitest run test/guardians.e2e-spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 7: Verify nothing regressed, then commit**

Run: `cd apps/api && npm run typecheck && npx vitest run`
Expected: green, including Task 4's student suite.

```bash
git add apps/api/src/modules/students apps/api/test/guardians.e2e-spec.ts apps/api/test/fixtures.ts
git commit -m "feat(api): manage student guardians with a single primary link"
```

---

## Task 6: Staff records — create, amend, assign

**Files:**
- Modify: `apps/api/src/modules/staff/staff.schemas.ts`
- Modify: `apps/api/src/modules/staff/staff.service.ts`
- Modify: `apps/api/src/modules/staff/staff.controller.ts`
- Test: `apps/api/test/staff-write.e2e-spec.ts`

**Interfaces:**
- Consumes: `staff` (imported as `staffTable`), `staffAssignments`, `sections`, `subjects`,
  `AuditService`, `DatabaseService`, `CurrentUser`, `RequestContext`, `assertVersion`,
  `bumpVersion`, `requireIfMatch`, `entityTag`, `isUniqueViolation`, `notFound`, `ApiException`,
  `createZodDto`, `ZodValidationPipe`.
- Produces:
  - `StaffRecord = { id, employeeId, nameEn, nameBn, designation, status, phone, email, payLevel, joinedAt, avatarKey, version, assignments: StaffAssignmentRow[] }`
  - `StaffAssignmentRow = { id, type, sectionId, subjectId }`
  - `StaffService.record(user, id, tx?)`, `.create(user, input, context)`,
    `.update(user, id, patch, expectedVersion, context)`, `.addAssignment(user, staffId, input, context)`
  - REST `POST /v1/staff`, `PATCH /v1/staff/:id`, `POST /v1/staff/:id/assignments`
  - Duplicate-assignment detection lives in the service, not the database: a repeated
    `(staffId, type, sectionId, subjectId)` answers `409 ASSIGNMENT_EXISTS`. The nullable
    `section_id`/`subject_id` columns cannot form a portable unique index that treats NULLs as
    equal without an expression index, and `drizzle-kit generate` would drop such an index.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/test/staff-write.e2e-spec.ts
import { afterAll, beforeAll, expect, test } from "vitest";
import { and, eq } from "drizzle-orm";

import { auditEvents, staffAssignments } from "../src/db/schema";
import { hashPassword } from "../src/common/security/password-hash";
import { createTestApp, type TestApp } from "./app";
import { errorChain } from "./errors";
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
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd apps/api && npx vitest run test/staff-write.e2e-spec.ts`
Expected: FAIL — `POST /v1/staff` returns `404`.

- [ ] **Step 3: Extend the staff schemas**

In `apps/api/src/modules/staff/staff.schemas.ts` add, then delete the old
`staffDetailSchema`, `StaffDetailDto`, `StaffDetailWire` declarations (the record schema below
replaces them):

```ts
export const staffAssignmentSchema = z.object({
  id: z.uuid(),
  type: z.enum([
    "class_teacher",
    "subject_teacher",
    "exam_coordinator",
    "accountant",
    "assistant_headmaster",
  ]),
  sectionId: z.uuid().nullable(),
  subjectId: z.uuid().nullable(),
});

export const staffRecordSchema = staffSummarySchema.extend({
  phone: z.string().nullable(),
  email: z.string().nullable(),
  payLevel: z.string().nullable(),
  joinedAt: z.iso.date().nullable(),
  avatarKey: z.string().nullable(),
  version: z.number().int().positive(),
  assignments: z.array(staffAssignmentSchema),
});

export const createStaffSchema = z.object({
  employeeId: z.string().min(2).max(32),
  nameEn: z.string().min(2).max(120),
  nameBn: z.string().min(2).max(120),
  designation: z.string().min(2).max(120),
  phone: z
    .string()
    .regex(/^\d{10,11}$/)
    .optional(),
  email: z.string().email().optional(),
  payLevel: z.string().max(40).optional(),
  joinedAt: z.iso.date().optional(),
});

export const updateStaffSchema = z
  .object({
    nameEn: z.string().min(2).max(120).optional(),
    nameBn: z.string().min(2).max(120).optional(),
    designation: z.string().min(2).max(120).optional(),
    phone: z
      .string()
      .regex(/^\d{10,11}$/)
      .nullable()
      .optional(),
    email: z.string().email().nullable().optional(),
    payLevel: z.string().max(40).nullable().optional(),
    joinedAt: z.iso.date().nullable().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to change.",
  });

export const createAssignmentSchema = z
  .object({
    type: staffAssignmentSchema.shape.type,
    sectionId: z.uuid().optional(),
    subjectId: z.uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "subject_teacher" && (!value.sectionId || !value.subjectId)) {
      ctx.addIssue({
        code: "custom",
        path: ["sectionId"],
        message: "A subject assignment needs both a section and a subject.",
      });
    }
    if (value.type === "class_teacher" && !value.sectionId) {
      ctx.addIssue({
        code: "custom",
        path: ["sectionId"],
        message: "A class teacher assignment needs a section.",
      });
    }
    if (
      (value.type === "accountant" || value.type === "assistant_headmaster") &&
      (value.sectionId || value.subjectId)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["type"],
        message: "That assignment type takes no section or subject.",
      });
    }
  });

export class StaffRecordDto extends createZodDto(staffRecordSchema) {}
export class StaffAssignmentDto extends createZodDto(staffAssignmentSchema) {}
export class CreateStaffDto extends createZodDto(createStaffSchema) {}
export class UpdateStaffDto extends createZodDto(updateStaffSchema) {}
export class CreateAssignmentDto extends createZodDto(createAssignmentSchema) {}

export type StaffRecord = z.infer<typeof staffRecordSchema>;
export type StaffAssignmentRow = z.infer<typeof staffAssignmentSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
```

- [ ] **Step 4: Add the service methods**

Give `StaffService` a constructor of
`(private readonly database: DatabaseService, private readonly audit: AuditService)`, switch
`list()` to `this.database.db`, and replace `detail()` with `record()`:

```ts
  async record(
    user: CurrentUser,
    id: string,
    tx: DbOrTx = this.database.db,
  ): Promise<StaffRecord> {
    const [row] = await tx
      .select()
      .from(staffTable)
      .where(and(eq(staffTable.schoolId, user.schoolId), eq(staffTable.id, id)))
      .limit(1);
    if (!row || row.deletedAt) throw notFound("Staff");

    const assignments = await tx
      .select({
        id: staffAssignments.id,
        type: staffAssignments.type,
        sectionId: staffAssignments.sectionId,
        subjectId: staffAssignments.subjectId,
      })
      .from(staffAssignments)
      .where(eq(staffAssignments.staffId, id));

    return { ...toWire(row), assignments };
  }

  async create(
    user: CurrentUser,
    input: CreateStaffInput,
    context: RequestContext,
  ): Promise<StaffRecord> {
    const id = uuidv7();
    return this.database.db.transaction(async (tx) => {
      try {
        await tx.insert(staffTable).values({
          id,
          schoolId: user.schoolId,
          employeeId: input.employeeId,
          nameEn: input.nameEn,
          nameBn: input.nameBn,
          designation: input.designation,
          phone: input.phone ?? null,
          email: input.email ?? null,
          payLevel: input.payLevel ?? null,
          joinedAt: input.joinedAt ?? null,
          status: "active",
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ApiException(
            409,
            "EMPLOYEE_ID_TAKEN",
            `Employee ID ${input.employeeId} already exists in this school.`,
          );
        }
        throw error;
      }

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "staff.created",
        entityType: "staff",
        entityId: id,
        after: {
          employeeId: input.employeeId,
          nameEn: input.nameEn,
          designation: input.designation,
        },
        ...context,
      });

      return this.record(user, id, tx);
    });
  }

  async update(
    user: CurrentUser,
    id: string,
    patch: UpdateStaffInput,
    expectedVersion: number,
    context: RequestContext,
  ): Promise<StaffRecord> {
    const before = await this.record(user, id);
    assertVersion(expectedVersion, before.version);

    return this.database.db.transaction(async (tx) => {
      await tx
        .update(staffTable)
        .set({
          ...patch,
          version: bumpVersion(before.version),
          updatedAt: new Date(),
        })
        .where(and(eq(staffTable.id, id), eq(staffTable.schoolId, user.schoolId)));

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "staff.updated",
        entityType: "staff",
        entityId: id,
        before,
        after: { ...patch, version: bumpVersion(before.version) },
        ...context,
      });

      return this.record(user, id, tx);
    });
  }

  async addAssignment(
    user: CurrentUser,
    staffId: string,
    input: CreateAssignmentInput,
    context: RequestContext,
  ): Promise<StaffAssignmentRow> {
    const member = await this.record(user, staffId);
    const id = uuidv7();

    return this.database.db.transaction(async (tx) => {
      if (input.sectionId) {
        const [section] = await tx
          .select({ id: sections.id })
          .from(sections)
          .where(
            and(
              eq(sections.id, input.sectionId),
              eq(sections.schoolId, user.schoolId),
            ),
          )
          .limit(1);
        if (!section) throw notFound("Section");
      }
      if (input.subjectId) {
        const [subject] = await tx
          .select({ id: subjectsTable.id })
          .from(subjectsTable)
          .where(
            and(
              eq(subjectsTable.id, input.subjectId),
              eq(subjectsTable.schoolId, user.schoolId),
            ),
          )
          .limit(1);
        if (!subject) throw notFound("Subject");
      }

      const clash = member.assignments.find(
        (assignment) =>
          assignment.type === input.type &&
          assignment.sectionId === (input.sectionId ?? null) &&
          assignment.subjectId === (input.subjectId ?? null),
      );
      if (clash) {
        throw new ApiException(
          409,
          "ASSIGNMENT_EXISTS",
          "This staff member already holds that assignment.",
        );
      }

      await tx.insert(staffAssignments).values({
        id,
        schoolId: user.schoolId,
        staffId,
        type: input.type,
        sectionId: input.sectionId ?? null,
        subjectId: input.subjectId ?? null,
      });

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "staff.assignment_created",
        entityType: "staff",
        entityId: staffId,
        after: {
          assignmentId: id,
          type: input.type,
          sectionId: input.sectionId ?? null,
          subjectId: input.subjectId ?? null,
        },
        ...context,
      });

      const [created] = await tx
        .select({
          id: staffAssignments.id,
          type: staffAssignments.type,
          sectionId: staffAssignments.sectionId,
          subjectId: staffAssignments.subjectId,
        })
        .from(staffAssignments)
        .where(eq(staffAssignments.id, id))
        .limit(1);
      return created;
    });
  }
```

Add the mapper at the bottom of the file and reuse it in `list()` so both paths agree:

```ts
function toWire(row: typeof staffTable.$inferSelect) {
  return {
    id: row.id,
    employeeId: row.employeeId,
    nameEn: row.nameEn,
    nameBn: row.nameBn,
    designation: row.designation,
    status: row.status,
    phone: row.phone,
    email: row.email,
    payLevel: row.payLevel,
    joinedAt: row.joinedAt,
    avatarKey: row.avatarKey,
    version: row.version,
  };
}
```

Import the subjects table as `subjects as subjectsTable` so it cannot be confused with the
`input.subjectId` value inside `addAssignment`.

- [ ] **Step 5: Add the controller routes**

```ts
  @Post()
  @RequirePermissions("staff.create")
  @ApiOperation({ summary: "Register a staff member" })
  @ApiCreatedResponse({ type: StaffRecordDto })
  create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createStaffSchema)) body: CreateStaffDto,
    @Req() request: FastifyRequest,
  ) {
    return this.staff.create(user, body, contextOf(request));
  }

  @Patch(":id")
  @RequirePermissions("staff.edit")
  @ApiOperation({ summary: "Amend a staff record" })
  @ApiOkResponse({ type: StaffRecordDto })
  async update(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateStaffSchema)) body: UpdateStaffDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const member = await this.staff.update(
      user,
      readUuid(id),
      body,
      requireIfMatch(request.headers["if-match"]),
      contextOf(request),
    );
    reply.header("etag", entityTag(member.version));
    return member;
  }

  @Post(":id/assignments")
  @RequirePermissions("staff.edit")
  @ApiOperation({ summary: "Assign a class, subject or role to a staff member" })
  @ApiCreatedResponse({ type: StaffAssignmentDto })
  addAssignment(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createAssignmentSchema)) body: CreateAssignmentDto,
    @Req() request: FastifyRequest,
  ) {
    return this.staff.addAssignment(user, readUuid(id), body, contextOf(request));
  }
```

`readUuid` and `contextOf` are the same local helpers used in
`apps/api/src/modules/school/school.controller.ts`; `@SkipHeaders()`-style `etag` handling is
not needed beyond the `PATCH` above. Keep the class-level
`@RequirePermissions("staff.view")` so reads stay open to `staff.view` holders while writes
narrow further.

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd apps/api && npx vitest run test/staff-write.e2e-spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 7: Verify nothing regressed**

Run: `cd apps/api && npm run typecheck && npx vitest run`
Expected: green, including B1's `guards.e2e-spec.ts` staff paging test.

---

## Task 7: Import demo students and guardians

**Files:**
- Modify: `apps/api/src/db/seed-data.ts`
- Modify: `apps/api/src/db/seed.ts`
- Test: `apps/api/test/seed.e2e-spec.ts`

**Interfaces:**
- Consumes: `readDemoSeed()`, `seedId(kind, value)`, `students`, `guardians`,
  `studentGuardians`, the `sectionIds` map already built inside `seedDatabase`.
- Produces:
  - `SeedResult` extended with `students: number` and `guardians: number`
  - `seedId` exported
  - `demoSeedSchema` accepting a `students` array, plus a `DemoStudent` type

- [ ] **Step 1: Write the failing test additions**

Append to `apps/api/test/seed.e2e-spec.ts`, extending the `../src/db/schema` import with
`studentGuardians`, `students` and the `drizzle-orm` import with `count`:

```ts
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

  const total = await context.db.select({ value: count() }).from(students);
  expect(Number(total[0].value)).toBe(480);
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
  const sections = new Set(
    (list.json().data as { sectionId: string }[]).map((row) => row.sectionId),
  );
  expect(sections.size).toBeGreaterThan(0);
  expect(sections.size).toBeLessThan(12);
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd apps/api && npx vitest run test/seed.e2e-spec.ts`
Expected: FAIL — `result.students` is `undefined`.

- [ ] **Step 3: Validate the student shape**

```ts
const studentSchema = z.object({
  id: z.string(),
  admissionNo: z.string(),
  rollNo: z.string(),
  sectionId: z.string(),
  nameEn: z.string(),
  nameBn: z.string(),
  gender: z.enum(["male", "female", "other"]),
  dob: z.iso.date(),
  guardianName: z.string(),
  guardianPhone: z.string(),
  address: z.string(),
  category: z.enum(["general", "obc", "sc", "st"]),
  status: z.enum(["active", "transferred", "alumni"]).default("active"),
  avatar: z.string().nullable().optional(),
  admissionDate: z.iso.date(),
});
```

Add `students: z.array(studentSchema)` to `demoSeedSchema` and
`export type DemoStudent = z.infer<typeof studentSchema>;`.

- [ ] **Step 4: Import students and guardians**

In `apps/api/src/db/seed.ts`: export `seedId`, add `guardians`, `studentGuardians`,
`students` to the schema import, extend `SeedResult`, and insert after the
`staff_assignments` loop:

```ts
      let studentCount = 0;
      let guardianCount = 0;
      for (const item of seed.students) {
        const studentId = seedId("student", item.id);
        const sectionId = sectionIds.get(item.sectionId);
        if (!sectionId) continue;

        await tx
          .insert(students)
          .values({
            id: studentId,
            schoolId,
            sectionId,
            admissionNo: item.admissionNo,
            rollNo: item.rollNo,
            nameEn: item.nameEn,
            nameBn: item.nameBn,
            gender: item.gender,
            dob: item.dob,
            category: item.category,
            status: item.status,
            address: item.address,
            avatarKey: item.avatar ?? null,
            admissionDate: item.admissionDate,
          })
          .onConflictDoUpdate({
            target: students.id,
            set: {
              sectionId,
              admissionNo: item.admissionNo,
              rollNo: item.rollNo,
              nameEn: item.nameEn,
              nameBn: item.nameBn,
              gender: item.gender,
              dob: item.dob,
              category: item.category,
              status: item.status,
              address: item.address,
              avatarKey: item.avatar ?? null,
              admissionDate: item.admissionDate,
              updatedAt: new Date(),
            },
          });
        studentCount += 1;

        const guardianId = seedId("guardian", item.id);
        await tx
          .insert(guardians)
          .values({
            id: guardianId,
            schoolId,
            nameEn: item.guardianName,
            nameBn: item.guardianName,
            phone: item.guardianPhone,
            address: item.address,
          })
          .onConflictDoUpdate({
            target: guardians.id,
            set: {
              nameEn: item.guardianName,
              nameBn: item.guardianName,
              phone: item.guardianPhone,
              address: item.address,
              updatedAt: new Date(),
            },
          });
        guardianCount += 1;

        await tx
          .insert(studentGuardians)
          .values({
            id: seedId("student_guardian", item.id),
            schoolId,
            studentId,
            guardianId,
            relationship: "guardian",
            isPrimary: true,
          })
          .onConflictDoUpdate({
            target: studentGuardians.id,
            set: { studentId, guardianId, relationship: "guardian", isPrimary: true },
          });
      }
```

Then delete the early `return` that currently fires when `passwordHash` is absent — set
`logins` to `0` in that branch instead — so the transaction has exactly one return path that
also carries `students: studentCount, guardians: guardianCount`.

The demo guardian name is mixed-script (for example `নীলাদ্রি Satra`), which is why the seeder
writes one string to both `nameEn` and `nameBn`. Real records separate them, and B2c's
admission import supplies the applicant's own two values.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/api && npx vitest run test/seed.e2e-spec.ts`
Expected: PASS. If `perSection` fails, check that `sectionIds` is keyed by the raw demo id
(`VIII-B`), not the generated UUID.

- [ ] **Step 6: Re-seed the development database**

```bash
cd apps/api && npm run db:seed
```

Expected: a line ending `· 480 students · 480 guardians · 27 logins`.

- [ ] **Step 7: Verify nothing regressed**

Run: `cd apps/api && npm run typecheck && npx vitest run`
Expected: green.

---

## Task 8: Privacy boundary lock

**Files:**
- Create: `apps/api/test/pii.e2e-spec.ts`

**Interfaces:**
- Consumes: every B2a endpoint over HTTP with seeded roles.
- Produces: a regression net for the design §3.3 privacy boundary. A failure here means a real
  leak: fix the projection, never the assertion.

- [ ] **Step 1: Write the test**

```ts
// apps/api/test/pii.e2e-spec.ts
import { afterAll, beforeAll, expect, test } from "vitest";

import { hashPassword } from "../src/common/security/password-hash";
import { createTestApp, type TestApp } from "./app";
import { errorChain } from "./errors";
import {
  seedGuardian,
  seedSchool,
  seedSection,
  seedStaffUser,
  seedStudent,
} from "./fixtures";

const SCHOOL_CODE = "WB-PII-01";
const PASSWORD = "demo1234";
const PHONE = "9012345678";
const HOME = "House 7, Kalitala, Nabagram";

let context: TestApp;
let tokens: Record<string, string> = {};
let schoolId: string;
let studentId: string;

async function signIn(employeeId: string) {
  const response = await context.request({
    method: "POST",
    url: "/v1/auth/login",
    payload: { schoolCode: SCHOOL_CODE, employeeId, password: PASSWORD },
  });
  expect(response.statusCode).toBe(200);
  return response.json().accessToken as string;
}

async function get(url: string, token: string) {
  return context.request({
    method: "GET",
    url,
    headers: { authorization: `Bearer ${token}` },
  });
}

beforeAll(async () => {
  context = await createTestApp();
  const passwordHash = await hashPassword(PASSWORD);
  const school = await seedSchool(context.db, SCHOOL_CODE);
  schoolId = school.schoolId;
  const sectionId = await seedSection(context.db, {
    schoolId,
    academicYearId: school.academicYearId,
    classLevel: "VII",
    section: "A",
  });
  studentId = (
    await seedStudent(context.db, { schoolId, sectionId, address: HOME })
  ).id;
  await seedGuardian(context.db, {
    schoolId,
    studentId,
    nameEn: "Trailing Guardian",
    phone: PHONE,
  });

  for (const role of [
    "headmaster",
    "teacher",
    "clerk",
    "management",
  ] as const) {
    const account = await seedStaffUser(context.db, {
      schoolId,
      employeeId: `PII-${role.toUpperCase()}`,
      role,
      passwordHash,
    });
    tokens[role] = await signIn(account.employeeId);
  }
});

afterAll(async () => {
  await context.close();
});

test("management is refused on every student-level route", async () => {
  for (const route of [
    "/v1/students",
    `/v1/students/${studentId}`,
    `/v1/students/${studentId}/guardians`,
    "/v1/staff",
  ]) {
    const response = await get(route, tokens.management);
    expect(response.statusCode, route).toBe(403);
    expect(JSON.stringify(response.json()), route).not.toContain(PHONE);
  }
});

test("management still reaches the aggregate-safe routes", async () => {
  for (const route of ["/v1/school", "/v1/sections", "/v1/subjects", "/v1/audit"]) {
    const response = await get(route, tokens.management);
    expect(response.statusCode, route).toBe(200);
    expect(JSON.stringify(response.json()), route).not.toContain(PHONE);
  }
});

test("no student list response carries contact or birth data", async () => {
  for (const role of ["headmaster", "clerk", "teacher"] as const) {
    const response = await get("/v1/students?limit=100", tokens[role]);
    expect(response.statusCode, role).toBe(200);
    const body = JSON.stringify(response.json());
    expect(body, role).not.toContain(PHONE);
    expect(body, role).not.toContain(HOME);
    expect(body, role).not.toContain("dob");
    expect(body, role).not.toContain("guardians");
  }
});

test("only the detail route returns the guardian phone to a scoped reader", async () => {
  const detail = await get(`/v1/students/${studentId}`, tokens.headmaster);
  expect(detail.statusCode).toBe(200);
  expect(JSON.stringify(detail.json())).toContain(PHONE);
});

test("an unauthenticated caller gets one uniform answer for every route", async () => {
  const statuses = new Set<number>();
  for (const route of [
    "/v1/students",
    `/v1/students/${studentId}`,
    `/v1/students/${studentId}/guardians`,
    "/v1/staff",
    "/v1/sections",
    "/v1/subjects",
    "/v1/school",
    "/v1/audit",
  ]) {
    const response = await context.request({ method: "GET", url: route });
    statuses.add(response.statusCode);
    expect(response.json().code, route).toBe("AUTH_REQUIRED");
  }
  expect([...statuses]).toEqual([401]);
});

test("a second school cannot see the first school's rows", async () => {
  const other = await seedSchool(context.db, "WB-PII-02");
  const passwordHash = await hashPassword(PASSWORD);
  const outsider = await seedStaffUser(context.db, {
    schoolId: other.schoolId,
    employeeId: "HM-PII-02",
    role: "headmaster",
    passwordHash,
  });
  const token = await signIn(outsider.employeeId);

  const list = await get("/v1/students", token);
  expect(list.statusCode).toBe(200);
  expect(list.json().data).toHaveLength(0);

  const school = await get("/v1/school", token);
  expect(school.json().code).toBe("WB-PII-02");

  const audit = await get("/v1/audit", token);
  expect(audit.json().data).toHaveLength(0);

  const borrowed = await get(`/v1/students/${studentId}`, token);
  expect(borrowed.statusCode).toBe(404);
});

test("a teacher with no section assignments gets an empty roster", async () => {
  const passwordHash = await hashPassword(PASSWORD);
  const account = await seedStaffUser(context.db, {
    schoolId,
    employeeId: "TCH-PII-NONE",
    role: "teacher",
    passwordHash,
  });
  const list = await get("/v1/students", await signIn(account.employeeId));
  expect(list.statusCode).toBe(200);
  expect(list.json().data).toHaveLength(0);
});
```

- [ ] **Step 2: Run the test**

Run: `cd apps/api && npx vitest run test/pii.e2e-spec.ts`
Expected: PASS. `GET /v1/auth/me` is not needed here; if a route answers `200` where a `403`
is expected, fix the permission or projection first.

- [ ] **Step 3: Verify nothing regressed**

Run: `cd apps/api && npm run typecheck && npx vitest run`
Expected: green.

---

## Task 9: Contract, web types, and pipeline

**Files:**
- Modify: `apps/api/openapi.json` (generated)
- Modify: `apps/web/src/lib/api/generated.d.ts` (generated)
- Modify: `apps/api/test/openapi.e2e-spec.ts`

**Interfaces:**
- Consumes: every route from Tasks 1–8.
- Produces: the committed contract B2d builds the web remote path against.

- [ ] **Step 1: Extend the contract test**

```ts
// appended to apps/api/test/openapi.e2e-spec.ts
test("B2a master-data routes are documented", () => {
  const listed = Object.keys(paths());
  for (const expected of [
    "/v1/school",
    "/v1/academic-years",
    "/v1/sections",
    "/v1/subjects",
    "/v1/students",
    "/v1/students/{id}",
    "/v1/students/{studentId}/guardians",
    "/v1/staff",
    "/v1/staff/{id}",
  ]) {
    expect(listed, expected).toContain(expected);
  }
});

test("list endpoints share one page envelope", () => {
  const refOf = (operation: {
    responses: Record<string, { content?: Record<string, { schema?: { $ref?: string } }> }>;
  }) => operation.responses["200"].content?.["application/json"]?.schema?.$ref ?? "";

  const staff = paths()["/v1/staff"].get as Parameters<typeof refOf>[0];
  const students = paths()["/v1/students"].get as Parameters<typeof refOf>[0];
  expect(refOf(staff)).toContain("StaffPageDto");
  expect(refOf(students)).toContain("StudentPageDto");
});

test("writes declare the security scheme and the status codes they can return", () => {
  const create = paths()["/v1/students"].post as {
    security?: unknown;
    responses: Record<string, unknown>;
  };
  expect(create.security).toEqual([{ access_token: [] }]);
  expect(Object.keys(create.responses)).toContain("201");

  const patch = paths()["/v1/school"].patch as {
    responses: Record<string, unknown>;
  };
  expect(Object.keys(patch.responses)).toEqual(
    expect.arrayContaining(["200", "409", "428"]),
  );
});
```

`StaffPageDto` already exists from B1. `428` reaches the contract only if `PATCH /v1/school`
documents it, so add
`@ApiResponse({ status: 428, description: "If-Match is required." })` to both patch handlers
rather than dropping the assertion.

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd apps/api && npx vitest run test/openapi.e2e-spec.ts`
Expected: FAIL — the new paths are missing.

- [ ] **Step 3: Regenerate the contract and the web types**

```bash
cd apps/api && npm run openapi:generate
cd ../web && npm run api:types
```

Expected: `Wrote openapi.json with 28+ routes.` then
`openapi-typescript … → src/lib/api/generated.d.ts`.

- [ ] **Step 4: Confirm the web app compiles against the contract**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Check for drift exactly the way CI does**

```bash
cd apps/api && npx vitest run test/openapi.e2e-spec.ts
git diff --exit-code -- apps/api/openapi.json apps/web/src/lib/api/generated.d.ts
```

Expected: PASS and an empty diff. A non-empty diff means the generator is not deterministic —
find the unstable value (timestamp, iteration order) instead of committing it.

- [ ] **Step 6: Rebuild the container so the new migrations ship**

```bash
cd apps/api && docker build -q -t baranda-api:ci .
```

Expected: an image digest. If `npm ci` fails, run
`docker run --rm -v "$PWD":/app -w /app node:22-bookworm-slim npm install --package-lock-only`
and rebuild — never commit a lock regenerated by npm 11 alone.

- [ ] **Step 7: Full verification**

Run: `cd apps/api && npm run typecheck && npx vitest run`
Expected: every suite green.

---

## B2a Exit Criteria

- [ ] `npm run typecheck` clean and `npx vitest run` green.
- [ ] The new migrations apply to an empty database, were read line by line, and contain no
      `DROP`.
- [ ] `GET/PATCH /v1/school` round-trips an entity tag; a stale tag gives `409
      VERSION_CONFLICT` naming the current version and a missing tag gives `428`.
- [ ] Academic-year activation, section creation and subject creation are Headmaster-only,
      audited, and refuse duplicates with `ACADEMIC_YEAR_EXISTS`, `SECTION_EXISTS`,
      `SUBJECT_EXISTS`.
- [ ] Clerk and Headmaster can enrol students; the roll is allocated inside the section; the
      admission number is unique per school and immutable after creation.
- [ ] Teachers reach only their assigned sections on the list, the detail route and the
      guardian subroutes — `403` elsewhere — and an unassigned teacher gets an empty roster.
- [ ] Guardians support create-and-link, link-existing (one shared person row), exactly one
      primary per student, and detach that keeps the person row for siblings.
- [ ] No list, search or error response contains a guardian phone, guardian address, or a
      student date of birth; Management gets `403` on student-level routes and `200` on the
      aggregate-safe ones.
- [ ] Staff records can be created and amended (`staff.create`, `staff.edit`), duplicate
      assignments answer `ASSIGNMENT_EXISTS`, and every mutation writes its audit row in the
      same transaction.
- [ ] The demo import lands 480 students and 480 guardians idempotently, and `npm run
      db:seed` reports both counts.
- [ ] `openapi.json` and `apps/web/src/lib/api/generated.d.ts` are regenerated and drift-free,
      and the web app typechecks against them.
- [ ] The container image builds from the committed lockfile and runs as the `baranda` user.

## Handover to the next B2 plans

- **B2b files:** `files`, `student_documents`, `admission_documents`,
  `POST /v1/files/presign`, `POST /v1/files/:id/complete`, `GET /v1/files/:id/download`. The
  `avatarKey` columns B2a writes become real object references there.
- **B2c admissions:** application queue → verify → decide → **enrol**; admission-number
  allocation moves server-side and replaces the required `admissionNo` on manual creation.
- **B2d web remote reads:** `DATA_SOURCE=api` in `apps/web`, a session exchanged against
  `/v1/auth/*`, and the students/staff screens typed against the generated contract — where
  `sectionId` is rendered as the class label the demo store supplies today.


