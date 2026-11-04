// apps/api/test/problem.spec.ts
import { describe, expect, test } from "vitest";

import { ApiException } from "../src/common/errors/api-error";
import { extensionMembers, problemBody } from "../src/common/errors/problem";

const core = {
  status: 409,
  code: "VERSION_CONFLICT",
  title: "Conflict",
  detail: "The record changed since it was read. Reload it before saving.",
  requestId: "req-1",
  instance: "/v1/school",
};

describe("problem document extension members", () => {
  test("the members the tests already assert still pass through", () => {
    expect(extensionMembers({ expected: 1, current: 2 })).toEqual({
      expected: 1,
      current: 2,
    });
    expect(extensionMembers({ required: ["students.read"] })).toEqual({
      required: ["students.read"],
    });
    expect(extensionMembers({ retryAfterSeconds: 30 })).toEqual({
      retryAfterSeconds: 30,
    });

    const problem = problemBody({ ...core, extensions: { expected: 1, current: 2 } });
    expect(problem).toMatchObject({
      status: 409,
      code: "VERSION_CONFLICT",
      expected: 1,
      current: 2,
    });
  });

  test("code and detail are reserved and never forwarded", () => {
    expect(
      extensionMembers({
        code: "FORGED",
        detail: "forged",
        title: "Forged",
        status: 200,
        type: "https://elsewhere.example/forged",
        requestId: "forged",
        instance: "/forged",
        errors: ["forged"],
        message: "forged",
        error: "Conflict",
        statusCode: 409,
        current: 2,
      }),
    ).toEqual({ current: 2 });
  });

  test("an extras object cannot overwrite the error identity", () => {
    const problem = problemBody({
      ...core,
      errors: [{ path: "district", message: "Too short" }],
      extensions: {
        code: "FORGED",
        detail: "forged",
        status: 200,
        title: "Forged",
        type: "https://elsewhere.example/forged",
        requestId: "forged",
        instance: "/forged",
        errors: ["forged"],
        current: 2,
      },
    });

    expect(problem).toMatchObject({
      type: "https://api.baranda.local/errors/version_conflict",
      title: "Conflict",
      status: 409,
      code: "VERSION_CONFLICT",
      detail: core.detail,
      requestId: "req-1",
      instance: "/v1/school",
      errors: [{ path: "district", message: "Too short" }],
      current: 2,
    });
  });

  test("a prototype key in the extras is dropped, not merged", () => {
    const forged = JSON.parse(
      '{"__proto__":{"polluted":true},"current":2}',
    ) as Record<string, unknown>;

    const problem = problemBody({ ...core, extensions: extensionMembers(forged) });

    expect(problem).toMatchObject({ current: 2, code: "VERSION_CONFLICT" });
    expect((problem as Record<string, unknown>).polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  test("ApiException extras reach the document through the filter path", () => {
    const response = new ApiException(
      409,
      "VERSION_CONFLICT",
      "The record changed since it was read. Reload it before saving.",
      { expected: 1, current: 2 },
    ).getResponse() as Record<string, unknown>;

    expect(
      problemBody({ ...core, extensions: extensionMembers(response) }),
    ).toMatchObject({ code: "VERSION_CONFLICT", expected: 1, current: 2 });
  });
});
