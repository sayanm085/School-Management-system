import { beforeAll, afterAll, expect, test } from "vitest";

import { hashPassword } from "../src/common/security/password-hash";
import { seedSchool, seedStaffUser } from "./fixtures";
import { createTestApp, type TestApp } from "./app";

const SCHOOL_CODE = "WB-AUT-01";
const PASSWORD = "demo1234";

let context: TestApp;
let schoolId: string;
let passwordHash: string;

async function makeUser(input?: {
  employeeId?: string;
  role?: "headmaster" | "teacher" | "clerk" | "management";
  status?: "active" | "disabled";
}) {
  return seedStaffUser(context.db, {
    schoolId,
    employeeId: input?.employeeId,
    role: input?.role ?? "headmaster",
    passwordHash,
    status: input?.status,
  });
}

async function login(employeeId: string, password = PASSWORD) {
  return context.request({
    method: "POST",
    url: "/v1/auth/login",
    payload: {
      schoolCode: SCHOOL_CODE,
      employeeId,
      password,
      device: { platform: "web", name: "Vitest" },
    },
  });
}

beforeAll(async () => {
  context = await createTestApp();
  passwordHash = await hashPassword(PASSWORD);
  schoolId = (await seedSchool(context.db, SCHOOL_CODE)).schoolId;
});

afterAll(async () => {
  await context.close();
});

test("signs in a seeded staff member and returns a session", async () => {
  const account = await makeUser();
  const response = await login(account.employeeId);

  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.mfaRequired).toBe(false);
  expect(typeof body.accessToken).toBe("string");
  expect(typeof body.refreshToken).toBe("string");
  expect(body.user.employeeId).toBe(account.employeeId);
  expect(body.user.permissions).toContain("salary.approve");
  expect(String(response.headers["set-cookie"])).toContain("baranda_refresh=");

  const audit = await context.request({
    method: "GET",
    url: "/v1/audit?action=auth.login",
    headers: { authorization: `Bearer ${body.accessToken}` },
  });
  expect(audit.statusCode).toBe(200);
  expect(audit.json().data[0].entityId).toBe(account.userId);
});

test("rejects a wrong password and an unknown employee identically", async () => {
  const account = await makeUser();
  const wrong = await login(account.employeeId, "not-the-password");
  const unknown = await login("GHOST-9999");

  expect(wrong.statusCode).toBe(401);
  expect(unknown.statusCode).toBe(401);
  expect(wrong.json().code).toBe("AUTH_INVALID_CREDENTIALS");
  expect(unknown.json().code).toBe("AUTH_INVALID_CREDENTIALS");
  expect(wrong.json().detail).toBe(unknown.json().detail);
  expect(String(wrong.headers["content-type"])).toContain(
    "application/problem+json",
  );
  expect(wrong.json().requestId).toBeTruthy();
});

test("refuses a disabled account with the same generic response", async () => {
  const account = await makeUser({ status: "disabled" });
  const response = await login(account.employeeId);
  expect(response.statusCode).toBe(401);
  expect(response.json().code).toBe("AUTH_INVALID_CREDENTIALS");
});

test("locks the account after five failed attempts", async () => {
  const account = await makeUser();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await login(account.employeeId, "wrong-password");
    expect(response.statusCode).toBe(401);
  }
  const locked = await login(account.employeeId);
  expect(locked.statusCode).toBe(429);
  expect(locked.json().code).toBe("AUTH_LOCKED");
  expect(locked.json().detail).toContain("Too many failed attempts");
});

test("protects the session endpoints", async () => {
  const anonymous = await context.request({ method: "GET", url: "/v1/auth/me" });
  expect(anonymous.statusCode).toBe(401);
  expect(anonymous.json().code).toBe("AUTH_REQUIRED");

  const account = await makeUser({ role: "teacher" });
  const session = await login(account.employeeId);
  const token = session.json().accessToken as string;

  const me = await context.request({
    method: "GET",
    url: "/v1/auth/me",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(me.statusCode).toBe(200);
  expect(me.json().user ?? me.json()).toMatchObject({
    employeeId: account.employeeId,
    role: "teacher",
  });
  expect(me.json().permissions).not.toContain("fees.collect");
});

test("audits failed sign-ins without the password", async () => {
  const account = await makeUser();
  await login(account.employeeId, "wrong-password");

  const headmaster = await makeUser({ role: "headmaster" });
  const session = await login(headmaster.employeeId);
  const audit = await context.request({
    method: "GET",
    url: "/v1/audit?action=auth.login_failed",
    headers: { authorization: `Bearer ${session.json().accessToken}` },
  });
  expect(audit.statusCode).toBe(200);
  const rows = audit.json().data as { after: Record<string, unknown> }[];
  expect(rows.length).toBeGreaterThan(0);
  expect(JSON.stringify(rows[0].after)).not.toContain("wrong-password");
});

test("validates the login body", async () => {
  const response = await context.request({
    method: "POST",
    url: "/v1/auth/login",
    payload: { schoolCode: "x", employeeId: "a", password: "" },
  });
  expect(response.statusCode).toBe(422);
  expect(response.json().code).toBe("VALIDATION_FAILED");
  expect(response.json().errors.map((issue: { path: string }) => issue.path)).toEqual(
    expect.arrayContaining(["schoolCode", "employeeId", "password"]),
  );
});
