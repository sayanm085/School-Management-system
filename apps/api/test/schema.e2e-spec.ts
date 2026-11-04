import { sql } from "drizzle-orm";
import { afterAll, beforeAll, expect, test } from "vitest";

import { createTestApp, type TestApp } from "./app";

const expected = [
  "academic_years",
  "audit_events",
  "devices",
  "guardians",
  "idempotency_keys",
  "mfa_recovery_codes",
  "password_reset_tokens",
  "refresh_tokens",
  "schools",
  "sections",
  "staff",
  "staff_assignments",
  "student_guardians",
  "students",
  "subjects",
  "users",
];

let context: TestApp;

beforeAll(async () => {
  context = await createTestApp();
});

afterAll(async () => {
  await context.close();
});

test("core tables exist after migration", async () => {
  const result = await context.db.execute(
    sql`select table_name from information_schema.tables where table_schema = 'public'`,
  );
  const names = (result as unknown as { table_name: string }[]).map(
    (row) => row.table_name,
  );
  expect(names.sort()).toEqual(expected);
});

test("school scoped unique constraints are enforced", async () => {
  const { db } = context;
  const schoolId = crypto.randomUUID();
  const otherSchoolId = crypto.randomUUID();
  await db.execute(sql`
    insert into schools (id, name_en, name_bn, code, type, address, district)
    values (${schoolId}, 'A', 'A', 'WB-A', 'x', 'y', 'z'),
           (${otherSchoolId}, 'B', 'B', 'WB-B', 'x', 'y', 'z')
  `);
  await db.execute(sql`
    insert into staff (id, school_id, employee_id, name_en, name_bn, designation)
    values (${crypto.randomUUID()}, ${schoolId}, 'HM-001', 'One', 'এক', 'Headmaster')
  `);

  const failure = await db
    .execute(sql`
      insert into staff (id, school_id, employee_id, name_en, name_bn, designation)
      values (${crypto.randomUUID()}, ${schoolId}, 'HM-001', 'Clone', 'ক্লোন', 'Headmaster')
    `)
    .then(() => null)
    .catch((error: unknown) => error);

  expect(failure).toBeInstanceOf(Error);
  const cause = (failure as {
    cause?: { code?: string; constraint_name?: string };
  }).cause;
  expect(cause?.code).toBe("23505");
  expect(cause?.constraint_name).toBe("staff_school_employee_uq");

  await db.execute(sql`
    insert into staff (id, school_id, employee_id, name_en, name_bn, designation)
    values (${crypto.randomUUID()}, ${otherSchoolId}, 'HM-001', 'Other', 'অন্য', 'Headmaster')
  `);
});
