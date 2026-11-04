import { afterAll, beforeAll, expect, test } from "vitest";

import { hashPassword } from "../src/common/security/password-hash";
import {
  assertVersion,
  entityTag,
  parseIfMatch,
} from "../src/common/http/version";
import { createTestApp, type TestApp } from "./app";
import { seedSchool, seedStaffUser } from "./fixtures";

const SCHOOL_CODE = "WB-CONV-01";

let context: TestApp;
let accessToken: string;

beforeAll(async () => {
  context = await createTestApp();
  const passwordHash = await hashPassword("demo1234");
  const school = await seedSchool(context.db, SCHOOL_CODE);
  const account = await seedStaffUser(context.db, {
    schoolId: school.schoolId,
    role: "headmaster",
    passwordHash,
  });
  const response = await context.request({
    method: "POST",
    url: "/v1/auth/login",
    payload: {
      schoolCode: SCHOOL_CODE,
      employeeId: account.employeeId,
      password: "demo1234",
    },
  });
  accessToken = response.json().accessToken as string;
});

afterAll(async () => {
  await context.close();
});

function auth(headers: Record<string, string> = {}) {
  return { authorization: `Bearer ${accessToken}`, ...headers };
}

test("every response carries a request id", async () => {
  const ok = await context.request({
    method: "GET",
    url: "/health/live",
  });
  const failed = await context.request({ method: "GET", url: "/v1/unknown" });
  const first = String(ok.headers["x-request-id"]);
  const second = String(failed.headers["x-request-id"]);
  expect(first).toMatch(/\S/);
  expect(second).toMatch(/\S/);
  expect(first).not.toBe(second);
});

test("errors use the problem details contract", async () => {
  const response = await context.request({
    method: "GET",
    url: "/v1/does-not-exist",
    headers: auth(),
  });
  expect(response.statusCode).toBe(404);
  expect(String(response.headers["content-type"])).toContain(
    "application/problem+json",
  );
  const problem = response.json();
  expect(problem).toMatchObject({
    status: 404,
    code: "NOT_FOUND",
    title: "Not found",
    instance: "/v1/does-not-exist",
  });
  expect(problem.type).toBe("https://api.baranda.local/errors/not_found");
  expect(problem.requestId).toBe(String(response.headers["x-request-id"]));
  expect(problem.detail).toContain("was not found");
});

test("validation failures list every offending path", async () => {
  const response = await context.request({
    method: "GET",
    url: "/v1/staff?limit=0&search=",
    headers: auth(),
  });
  expect(response.statusCode).toBe(422);
  expect(response.json().code).toBe("VALIDATION_FAILED");
  const paths: string[] = response
    .json()
    .errors.map((issue: { path: string }) => issue.path);
  expect(paths).toContain("limit");
  expect(paths).toContain("search");
});

test("a malformed cursor is a bad request, not a server error", async () => {
  const response = await context.request({
    method: "GET",
    url: `/v1/audit?cursor=${encodeURIComponent("bm90LWEtY3Vyc29y")}`,
    headers: auth(),
  });
  expect(response.statusCode).toBe(400);
  expect(response.json().code).toBe("INVALID_CURSOR");
});

test("entity tags round-trip through If-Match", () => {
  expect(entityTag(7)).toBe('"7"');
  expect(parseIfMatch('"7"')).toBe(7);
  expect(parseIfMatch('W/"7"')).toBe(7);
  expect(parseIfMatch(undefined)).toBeNull();
  expect(parseIfMatch("*")).toBeNull();

  expect(() => assertVersion(7, 7)).not.toThrow();
  expect(() => assertVersion(null, 3)).not.toThrow();

  let thrown: unknown;
  try {
    assertVersion(4, 9);
  } catch (error) {
    thrown = error;
  }
  const response = (thrown as { getResponse?: () => unknown }).getResponse?.();
  expect(response).toMatchObject({
    code: "VERSION_CONFLICT",
    expected: 4,
    current: 9,
  });
});

test("a bad entity tag is rejected before touching the database", () => {
  expect(() => parseIfMatch('"zero"')).toThrowError(
    /positive integer entity tag/,
  );
});
