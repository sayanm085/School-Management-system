import { afterAll, beforeAll, expect, test } from "vitest";
import { and, count, eq } from "drizzle-orm";

import { IdempotencyService } from "../src/common/idempotency/idempotency.service";
import { hashPassword } from "../src/common/security/password-hash";
import { auditEvents, idempotencyKeys } from "../src/db/schema";
import { createTestApp, type TestApp } from "./app";
import { seedSchool, seedStaffUser } from "./fixtures";

const SCHOOL_CODE = "WB-IDI-01";
const PASSWORD = "demo1234";

let context: TestApp;
let service: IdempotencyService;
let schoolId: string;
let accessToken: string;
let userId: string;

async function enroll(key?: string) {
  return context.request({
    method: "POST",
    url: "/v1/auth/mfa/enroll",
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(key ? { "idempotency-key": key } : {}),
    },
  });
}

beforeAll(async () => {
  context = await createTestApp();
  service = context.app.get(IdempotencyService);
  const passwordHash = await hashPassword(PASSWORD);
  schoolId = (await seedSchool(context.db, SCHOOL_CODE)).schoolId;
  const account = await seedStaffUser(context.db, {
    schoolId,
    role: "headmaster",
    passwordHash,
  });
  userId = account.userId;
  const login = await context.request({
    method: "POST",
    url: "/v1/auth/login",
    payload: {
      schoolCode: SCHOOL_CODE,
      employeeId: account.employeeId,
      password: PASSWORD,
    },
  });
  accessToken = login.json().accessToken as string;
});

afterAll(async () => {
  await context.close();
});

test("a retried request replays the first response", async () => {
  const key = "retry-000001";
  const first = await enroll(key);
  const second = await enroll(key);

  expect(first.statusCode).toBe(201);
  expect(second.statusCode).toBe(201);
  expect(second.json()).toEqual(first.json());

  const rows = await context.db
    .select({ value: count() })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.actorUserId, userId),
        eq(auditEvents.action, "auth.mfa_enrolled"),
      ),
    );
  expect(Number(rows[0].value)).toBe(1);
});

test("a new key produces a fresh result", async () => {
  const first = await enroll("retry-000002");
  const second = await enroll("retry-000003");
  expect(first.json().secret).not.toBe(second.json().secret);
});

test("an unkeyed request is never replayed", async () => {
  const first = await enroll();
  const second = await enroll();
  expect(first.json().secret).not.toBe(second.json().secret);
});

test("a malformed idempotency key is rejected", async () => {
  const response = await enroll("short");
  expect(response.statusCode).toBe(400);
  expect(response.json().code).toBe("INVALID_IDEMPOTENCY_KEY");
});

test("the service distinguishes replay, conflict and in-flight work", async () => {
  const input = {
    schoolId,
    userId,
    key: "service-probe-1",
    route: "POST /v1/probe",
    body: { value: 1 },
  };

  const run = await service.reserve(input);
  expect(run.kind).toBe("run");
  if (run.kind !== "run") return;

  const inflight = await service.reserve(input);
  expect(inflight.kind).toBe("in_progress");

  await service.commit(run.id, 201, { id: run.id, ok: true });

  const replay = await service.reserve(input);
  expect(replay).toEqual({
    kind: "replay",
    status: 201,
    body: { id: run.id, ok: true },
  });

  const conflict = await service.reserve({ ...input, body: { value: 2 } });
  expect(conflict.kind).toBe("conflict");
});

test("expired reservations are released for a retry", async () => {
  const reservation = await service.reserve({
    schoolId,
    userId,
    key: "service-probe-expiring",
    route: "POST /v1/probe",
    body: { value: 1 },
  });
  expect(reservation.kind).toBe("run");
  if (reservation.kind !== "run") return;
  await service.commit(reservation.id, 200, { done: true });

  await context.db
    .update(idempotencyKeys)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(idempotencyKeys.id, reservation.id));

  expect(await service.purgeExpired()).toBe(1);
  const again = await service.reserve({
    schoolId,
    userId,
    key: "service-probe-expiring",
    route: "POST /v1/probe",
    body: { value: 1 },
  });
  expect(again.kind).toBe("run");
});

test("a failed handler frees the key for a genuine retry", async () => {
  const first = await context.request({
    method: "POST",
    url: "/v1/auth/mfa/activate",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "idempotency-key": "retry-000004",
    },
    payload: { code: "000000" },
  });
  expect(first.statusCode).toBe(422);

  const stored = await context.db
    .select({ value: count() })
    .from(idempotencyKeys)
    .where(eq(idempotencyKeys.key, "retry-000004"));
  expect(Number(stored[0].value)).toBe(0);

  const second = await context.request({
    method: "POST",
    url: "/v1/auth/mfa/activate",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "idempotency-key": "retry-000004",
    },
    payload: { code: "000000" },
  });
  expect(second.statusCode).toBe(422);
});
