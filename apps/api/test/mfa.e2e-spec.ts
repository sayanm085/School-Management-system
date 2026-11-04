import { afterAll, beforeAll, expect, test } from "vitest";
import { eq } from "drizzle-orm";

import { hashPassword } from "../src/common/security/password-hash";
import { auditEvents, users } from "../src/db/schema";
import { createTestApp, type TestApp } from "./app";
import { seedSchool, seedStaffUser } from "./fixtures";
import { totp } from "./totp";

const SCHOOL_CODE = "WB-MFA-01";
const PASSWORD = "demo1234";

let context: TestApp;
let schoolId: string;
let passwordHash: string;

async function signIn(employeeId: string, payload: Record<string, unknown> = {}) {
  return context.request({
    method: "POST",
    url: "/v1/auth/login",
    payload: {
      schoolCode: SCHOOL_CODE,
      employeeId,
      password: PASSWORD,
      device: { platform: "web", name: "Vitest" },
      ...payload,
    },
  });
}

async function enrollHeadmaster() {
  const account = await seedStaffUser(context.db, {
    schoolId,
    role: "headmaster",
    passwordHash,
  });
  const first = await signIn(account.employeeId);
  expect(first.statusCode).toBe(200);
  const token = first.json().accessToken as string;

  const enrollment = await context.request({
    method: "POST",
    url: "/v1/auth/mfa/enroll",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(enrollment.statusCode).toBe(201);

  const activate = await context.request({
    method: "POST",
    url: "/v1/auth/mfa/activate",
    headers: { authorization: `Bearer ${token}` },
    payload: { code: totp(enrollment.json().secret as string) },
  });
  expect(activate.statusCode).toBe(204);

  return {
    employeeId: account.employeeId,
    userId: account.userId,
    ...enrollment.json(),
  };
}

beforeAll(async () => {
  context = await createTestApp();
  passwordHash = await hashPassword(PASSWORD);
  schoolId = (await seedSchool(context.db, SCHOOL_CODE)).schoolId;
});

afterAll(async () => {
  await context.close();
});

test("an enrolled account must pass TOTP before it receives a session", async () => {
  const { employeeId, secret, otpauthUrl, recoveryCodes } =
    await enrollHeadmaster();

  expect(otpauthUrl).toContain("otpauth://totp/");
  expect(recoveryCodes).toHaveLength(10);

  const challengeResponse = await signIn(employeeId);
  expect(challengeResponse.statusCode).toBe(202);
  const challenge = challengeResponse.json();
  expect(challenge.mfaRequired).toBe(true);
  expect(challenge.accessToken).toBeUndefined();

  const wrong = await context.request({
    method: "POST",
    url: "/v1/auth/mfa/verify",
    payload: { challenge: challenge.challenge, code: "000000" },
  });
  expect(wrong.statusCode).toBe(401);
  expect(wrong.json().code).toBe("AUTH_MFA_INVALID");

  const verified = await context.request({
    method: "POST",
    url: "/v1/auth/mfa/verify",
    payload: { challenge: challenge.challenge, code: totp(secret as string) },
  });
  expect(verified.statusCode).toBe(200);
  expect(typeof verified.json().accessToken).toBe("string");
});

test("the TOTP window accepts the previous step", async () => {
  const { employeeId, secret } = await enrollHeadmaster();
  const challenge = (await signIn(employeeId)).json().challenge as string;

  const previous = await context.request({
    method: "POST",
    url: "/v1/auth/mfa/verify",
    payload: {
      challenge,
      code: totp(secret as string, Date.now() - 30_000),
    },
  });
  expect(previous.statusCode).toBe(200);
});

test("a recovery code works once and is then spent", async () => {
  const { employeeId, recoveryCodes } = await enrollHeadmaster();
  const challenge = (await signIn(employeeId)).json().challenge as string;
  const code = recoveryCodes[0] as string;

  const first = await context.request({
    method: "POST",
    url: "/v1/auth/mfa/recovery",
    payload: { challenge, recoveryCode: code },
  });
  expect(first.statusCode).toBe(200);

  const second = await context.request({
    method: "POST",
    url: "/v1/auth/mfa/recovery",
    payload: { challenge, recoveryCode: code },
  });
  expect(second.statusCode).toBe(401);
  expect(second.json().code).toBe("AUTH_MFA_INVALID");
});

test("the shared secret is encrypted at rest", async () => {
  const { employeeId, userId, secret } = await enrollHeadmaster();
  const [row] = await context.db
    .select()
    .from(users)
    .where(eq(users.id, userId as string));

  expect(row.mfaEnabled).toBe(true);
  expect(row.mfaSecretEncrypted).toMatch(/^v1:/);
  expect(row.mfaSecretEncrypted).not.toContain(secret as string);
  expect(row.employeeId).toBe(employeeId);
});

test("MFA enrolment, activation and verification are audited", async () => {
  const account = await seedStaffUser(context.db, {
    schoolId,
    role: "headmaster",
    passwordHash,
  });
  const first = await signIn(account.employeeId);
  const token = first.json().accessToken as string;

  const enrollment = await context.request({
    method: "POST",
    url: "/v1/auth/mfa/enroll",
    headers: { authorization: `Bearer ${token}` },
  });
  const secret = enrollment.json().secret as string;
  await context.request({
    method: "POST",
    url: "/v1/auth/mfa/activate",
    headers: { authorization: `Bearer ${token}` },
    payload: { code: totp(secret) },
  });

  const challenge = (await signIn(account.employeeId)).json().challenge as string;
  await context.request({
    method: "POST",
    url: "/v1/auth/mfa/verify",
    payload: { challenge, code: totp(secret) },
  });

  const rows = await context.db
    .select({ action: auditEvents.action, entityId: auditEvents.entityId })
    .from(auditEvents)
    .where(eq(auditEvents.schoolId, schoolId));
  const actions = rows.map((row) => row.action);
  expect(actions).toContain("auth.mfa_enrolled");
  expect(actions).toContain("auth.mfa_activated");
  expect(actions).toContain("auth.mfa_verified");
  expect(actions).toContain("auth.login");
});
