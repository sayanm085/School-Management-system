import { afterAll, beforeAll, expect, test } from "vitest";
import { eq } from "drizzle-orm";

import { hashPassword } from "../src/common/security/password-hash";
import { auditEvents } from "../src/db/schema";
import { createTestApp, type TestApp } from "./app";
import { seedSchool, seedStaffUser } from "./fixtures";

const SCHOOL_CODE = "WB-GRD-01";
const PASSWORD = "demo1234";

let context: TestApp;
let schoolId: string;
let passwordHash: string;

async function tokenFor(role: "headmaster" | "teacher" | "clerk" | "management") {
  const account = await seedStaffUser(context.db, {
    schoolId,
    role,
    passwordHash,
  });
  const response = await context.request({
    method: "POST",
    url: "/v1/auth/login",
    payload: {
      schoolCode: SCHOOL_CODE,
      employeeId: account.employeeId,
      password: PASSWORD,
    },
  });
  expect(response.statusCode).toBe(200);
  return { token: response.json().accessToken as string, account };
}

beforeAll(async () => {
  context = await createTestApp();
  passwordHash = await hashPassword(PASSWORD);
  schoolId = (await seedSchool(context.db, SCHOOL_CODE)).schoolId;
});

afterAll(async () => {
  await context.close();
});

test("a denied permission returns a problem and is audited", async () => {
  const { token, account } = await tokenFor("teacher");
  const response = await context.request({
    method: "GET",
    url: "/v1/audit",
    headers: { authorization: `Bearer ${token}` },
  });

  expect(response.statusCode).toBe(403);
  expect(response.json().code).toBe("FORBIDDEN");
  expect(response.json().detail).toContain("permission");

  const rows = await context.db
    .select()
    .from(auditEvents)
    .where(
      eq(auditEvents.actorUserId, account.userId),
    );
  const denial = rows.find((row) => row.action === "policy.denied");
  expect(denial).toBeTruthy();
  expect(denial?.after).toMatchObject({
    method: "GET",
    path: "/v1/audit",
    missing: ["audit.view"],
  });
});

test("a teacher cannot read the staff directory", async () => {
  const { token } = await tokenFor("teacher");
  const response = await context.request({
    method: "GET",
    url: "/v1/staff",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(response.statusCode).toBe(403);
});

test("a clerk pages the staff directory of their own school", async () => {
  for (let index = 0; index < 4; index += 1) {
    await seedStaffUser(context.db, {
      schoolId,
      role: "teacher",
      passwordHash,
    });
  }
  const other = (await seedSchool(context.db, "WB-GRD-02")).schoolId;
  const foreign = await seedStaffUser(context.db, {
    schoolId: other,
    role: "teacher",
    passwordHash,
  });

  const { token } = await tokenFor("clerk");
  const first = await context.request({
    method: "GET",
    url: "/v1/staff?limit=2",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(first.statusCode).toBe(200);
  expect(first.json().data).toHaveLength(2);
  expect(first.json().nextCursor).toBeTruthy();

  const second = await context.request({
    method: "GET",
    url: `/v1/staff?limit=2&cursor=${encodeURIComponent(first.json().nextCursor)}`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(second.statusCode).toBe(200);

  const pageIds = [...first.json().data, ...second.json().data].map(
    (row: { id: string }) => row.id,
  );
  expect(new Set(pageIds).size).toBe(pageIds.length);

  const all = await context.request({
    method: "GET",
    url: "/v1/staff?limit=100",
    headers: { authorization: `Bearer ${token}` },
  });
  const visible: string[] = all.json().data.map((row: { id: string }) => row.id);
  expect(visible).not.toContain(foreign.staffId);
  expect(visible).toContain(pageIds[0]);
});

test("management reads the audit log but never the staff directory", async () => {
  const { token } = await tokenFor("management");
  const audit = await context.request({
    method: "GET",
    url: "/v1/audit",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(audit.statusCode).toBe(200);

  const staff = await context.request({
    method: "GET",
    url: "/v1/staff",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(staff.statusCode).toBe(403);
});

test("a malformed query is rejected and an unknown route is a problem", async () => {
  const { token } = await tokenFor("headmaster");
  const bad = await context.request({
    method: "GET",
    url: "/v1/staff?limit=many",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(bad.statusCode).toBe(422);
  expect(bad.json().errors[0].path).toBe("limit");

  const missing = await context.request({
    method: "GET",
    url: "/v1/nothing-here",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(missing.statusCode).toBe(404);
  expect(missing.json().code).toBe("NOT_FOUND");
});

test("an expired or forged access token is refused", async () => {
  const response = await context.request({
    method: "GET",
    url: "/v1/auth/me",
    headers: { authorization: "Bearer not.a.jwt" },
  });
  expect(response.statusCode).toBe(401);
  expect(response.json().code).toBe("AUTH_REQUIRED");
});
