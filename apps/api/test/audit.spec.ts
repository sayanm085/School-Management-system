import { afterAll, beforeAll, expect, test } from "vitest";
import { sql } from "drizzle-orm";
import type { DbHandle } from "../src/db/client";

import { AuditService } from "../src/common/audit/audit.service";
import { auditEvents } from "../src/db/schema";
import { openTestDb } from "./db";
import { errorChain } from "./errors";
import { seedSchool, seedStaffUser } from "./fixtures";

const audit = new AuditService();

let handle: DbHandle;
let schoolId: string;
let userId: string;

beforeAll(async () => {
  handle = await openTestDb();
  const school = await seedSchool(handle.db);
  schoolId = school.schoolId;
  const user = await seedStaffUser(handle.db, {
    schoolId,
    role: "headmaster",
    passwordHash: "$argon2id$test",
  });
  userId = user.userId;
});

afterAll(async () => {
  await handle.close();
});

async function append(action: string, entityId: string) {
  return audit.append(handle.db, {
    schoolId,
    actorUserId: userId,
    action,
    entityType: "test_widget",
    entityId,
    after: { result: "ok" },
    requestId: `req_${entityId}`,
  });
}

test("appends an audit event with its transaction", async () => {
  await expect(
    handle.db.transaction(async (tx) => {
      await audit.append(tx, {
        schoolId,
        actorUserId: userId,
        action: "auth.login",
        entityType: "user",
        entityId: userId,
        after: { result: "success" },
      });
      throw new Error("rollback requested");
    }),
  ).rejects.toThrow("rollback requested");

  const rows = await handle.db
    .select()
    .from(auditEvents)
    .where(sql`${auditEvents.action} = 'auth.login'`);
  expect(rows).toHaveLength(0);
});

test("records the committed event and pages newest first", async () => {
  for (let index = 1; index <= 5; index += 1) {
    await append("test.widget.created", `widget-${index}`);
  }

  const first = await audit.list(handle.db, schoolId, { limit: 2 });
  expect(first.data).toHaveLength(2);
  expect(first.nextCursor).toBeTruthy();

  const second = await audit.list(handle.db, schoolId, {
    limit: 2,
    cursor: first.nextCursor ?? undefined,
  });
  const third = await audit.list(handle.db, schoolId, {
    limit: 2,
    cursor: second.nextCursor ?? undefined,
  });

  const ids = [...first.data, ...second.data, ...third.data].map(
    (row) => row.id,
  );
  expect(ids).toHaveLength(5);
  expect(new Set(ids).size).toBe(5);
  expect(third.nextCursor).toBeNull();
  expect(first.data.at(-1)?.requestId).toBe("req_widget-4");
});

test("filters the audit log by action and actor", async () => {
  const byAction = await audit.list(handle.db, schoolId, {
    limit: 10,
    action: "test.widget.created",
  });
  expect(byAction.data.length).toBeGreaterThan(0);
  expect(
    byAction.data.every((row) => row.action === "test.widget.created"),
  ).toBe(true);

  const byActor = await audit.list(handle.db, schoolId, {
    limit: 10,
    actorUserId: userId,
  });
  expect(byActor.data.length).toBeGreaterThan(0);

  const otherSchool = await seedSchool(handle.db);
  const empty = await audit.list(handle.db, otherSchool.schoolId, {
    limit: 10,
  });
  expect(empty.data).toHaveLength(0);
});

test("rejects updates and deletes on the audit log", async () => {
  const id = await append("test.immutable.probe", "probe-1");

  const updateFailure = await handle.db.execute(
    sql`update audit_events set action = 'tampered' where id = ${id}`,
  ).then(() => null).catch((error: unknown) => error);
  expect(errorChain(updateFailure)).toContain("append-only");

  const deleteFailure = await handle.db.execute(
    sql`delete from audit_events where id = ${id}`,
  ).then(() => null).catch((error: unknown) => error);
  expect(errorChain(deleteFailure)).toContain("append-only");

  const rows = await handle.db
    .select()
    .from(auditEvents)
    .where(sql`${auditEvents.id} = ${id}`);
  expect(rows).toHaveLength(1);
  expect(rows[0]?.action).toBe("test.immutable.probe");
});
