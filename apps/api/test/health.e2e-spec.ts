import { afterAll, beforeAll, expect, test } from "vitest";

import { createTestApp, type TestApp } from "./app";

let context: TestApp;

beforeAll(async () => {
  context = await createTestApp();
});

afterAll(async () => {
  await context.close();
});

test("liveness responds with ok and a request id", async () => {
  const response = await context.request({
    method: "GET",
    url: "/health/live",
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({ status: "ok" });
  expect(response.headers["x-request-id"]).toBeTruthy();
});

test("readiness reports the database as reachable", async () => {
  const response = await context.request({
    method: "GET",
    url: "/health/ready",
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
    status: "ok",
    checks: { database: "up" },
  });
});

test("health routes stay outside the versioned prefix", async () => {
  const response = await context.request({
    method: "GET",
    url: "/v1/health/live",
  });
  expect(response.statusCode).toBe(404);
});
