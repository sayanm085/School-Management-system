import { afterAll, beforeAll, expect, test } from "vitest";
import { eq } from "drizzle-orm";

import { hashPassword } from "../src/common/security/password-hash";
import { refreshTokens } from "../src/db/schema";
import { createTestApp, type TestApp } from "./app";
import { seedSchool, seedStaffUser } from "./fixtures";

const SCHOOL_CODE = "WB-RFR-01";
const PASSWORD = "demo1234";

let context: TestApp;
let schoolId: string;
let passwordHash: string;

type Session = {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  employeeId: string;
};

function claimsOf(token: string): Record<string, unknown> {
  const payload = token.split(".")[1] ?? "";
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

async function signIn(options?: {
  employeeId?: string;
  deviceId?: string;
}): Promise<Session> {
  const employeeId =
    options?.employeeId ??
    (
      await seedStaffUser(context.db, {
        schoolId,
        role: "clerk",
        passwordHash,
      })
    ).employeeId;

  const response = await context.request({
    method: "POST",
    url: "/v1/auth/login",
    payload: {
      schoolCode: SCHOOL_CODE,
      employeeId,
      password: PASSWORD,
      device: {
        id: options?.deviceId,
        platform: "android",
        name: "Hazira test",
      },
    },
  });
  expect(response.statusCode).toBe(200);
  const body = response.json() as Session;
  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    deviceId: body.deviceId,
    employeeId,
  };
}

async function rotate(refreshToken: string) {
  return context.request({
    method: "POST",
    url: "/v1/auth/refresh",
    payload: { refreshToken },
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

test("the access token carries the session claims", async () => {
  const session = await signIn();
  const claims = claimsOf(session.accessToken);
  expect(claims.role).toBe("clerk");
  expect(claims.sid).toBe(schoolId);
  expect(claims.emp).toBe(session.employeeId);
  expect(claims.tv).toBe(1);
});

test("refresh rotates the token and revokes the previous one", async () => {
  const session = await signIn();
  const rotated = await rotate(session.refreshToken);
  expect(rotated.statusCode).toBe(200);
  const next = rotated.json() as Session;
  expect(next.refreshToken).not.toBe(session.refreshToken);
  expect(next.deviceId).toBe(session.deviceId);

  const replay = await rotate(session.refreshToken);
  expect(replay.statusCode).toBe(401);
  expect(replay.json().code).toBe("AUTH_REQUIRED");

  const afterReuse = await rotate(next.refreshToken);
  expect(afterReuse.statusCode).toBe(401);
});

test("refresh tokens are stored only as hashes", async () => {
  const session = await signIn();
  const rows = await context.db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.deviceId, session.deviceId));
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.some((row) => row.tokenHash === session.refreshToken)).toBe(
    false,
  );
  expect(/^[0-9a-f]{64}$/.test(rows[0].tokenHash)).toBe(true);
});

test("logout revokes the token family", async () => {
  const session = await signIn();
  const logout = await context.request({
    method: "POST",
    url: "/v1/auth/logout",
    headers: { authorization: `Bearer ${session.accessToken}` },
  });
  expect(logout.statusCode).toBe(204);

  const rotated = await rotate(session.refreshToken);
  expect(rotated.statusCode).toBe(401);
});

test("a revoked device can no longer refresh", async () => {
  const session = await signIn();
  const revoke = await context.request({
    method: "DELETE",
    url: `/v1/auth/devices/${session.deviceId}`,
    headers: { authorization: `Bearer ${session.accessToken}` },
  });
  expect(revoke.statusCode).toBe(204);

  const rotated = await rotate(session.refreshToken);
  expect(rotated.statusCode).toBe(401);

  const devices = await context.request({
    method: "GET",
    url: "/v1/auth/devices",
    headers: { authorization: `Bearer ${session.accessToken}` },
  });
  expect(devices.statusCode).toBe(200);
  expect(devices.json().data).toHaveLength(0);
});

test("a known device is reused and a revoked device is refused", async () => {
  const first = await signIn();
  const reused = await signIn({
    employeeId: first.employeeId,
    deviceId: first.deviceId,
  });
  expect(reused.deviceId).toBe(first.deviceId);

  const second = await signIn();
  expect(second.deviceId).not.toBe(first.deviceId);

  const revoke = await context.request({
    method: "DELETE",
    url: `/v1/auth/devices/${second.deviceId}`,
    headers: { authorization: `Bearer ${second.accessToken}` },
  });
  expect(revoke.statusCode).toBe(204);

  const refused = await context.request({
    method: "POST",
    url: "/v1/auth/login",
    payload: {
      schoolCode: SCHOOL_CODE,
      employeeId: second.employeeId,
      password: PASSWORD,
      device: { id: second.deviceId, platform: "android", name: "Hazira test" },
    },
  });
  expect(refused.statusCode).toBe(401);
  expect(refused.json().code).toBe("DEVICE_REVOKED");
});
