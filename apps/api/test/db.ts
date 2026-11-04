import type { Sql } from "postgres";

import { createDb, type DbHandle } from "../src/db/client";
import { runMigrations } from "../src/db/migrate";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://sayan@localhost:5432/baranda_test";

const CHILD_FIRST_TABLES = [
  "idempotency_keys",
  "mfa_recovery_codes",
  "password_reset_tokens",
  "refresh_tokens",
  "devices",
  "audit_events",
  "users",
  "staff_assignments",
  "staff",
  // students and guardians before their sections/subjects/schools parents;
  // student_guardians before both of its endpoints.
  "student_guardians",
  "students",
  "guardians",
  "sections",
  "subjects",
  "academic_years",
  "schools",
];

let migrationRan = false;

export async function migrateTestDb(): Promise<void> {
  if (migrationRan) return;
  await runMigrations(TEST_DATABASE_URL);
  migrationRan = true;
}

export async function truncateAll(sql: Sql): Promise<void> {
  const list = CHILD_FIRST_TABLES.map((table) => `"${table}"`).join(", ");
  await sql.unsafe(`truncate table ${list} restart identity cascade`);
}

export async function openTestDb(): Promise<DbHandle> {
  await migrateTestDb();
  const handle = createDb(TEST_DATABASE_URL, 4);
  await truncateAll(handle.sql);
  return handle;
}

export async function withTestDb<T>(
  run: (handle: DbHandle) => Promise<T>,
): Promise<T> {
  const handle = await openTestDb();
  try {
    return await run(handle);
  } finally {
    await handle.close();
  }
}
