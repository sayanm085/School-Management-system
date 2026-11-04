import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterAll, beforeAll, expect, test } from "vitest";

import {
  API_TITLE,
  API_VERSION,
  OPENAPI_SPEC_VERSION,
} from "../src/modules/openapi/openapi.factory";
import { stableStringify } from "../src/common/http/stable-json";
import { createTestApp, type TestApp } from "./app";

const CONTRACT = resolve(process.cwd(), "openapi.json");

let context: TestApp;
let document: Record<string, never>;

beforeAll(async () => {
  context = await createTestApp();
  const response = await context.request({
    method: "GET",
    url: "/openapi.json",
  });
  expect(response.statusCode).toBe(200);
  document = response.json() as Record<string, never>;
});

afterAll(async () => {
  await context.close();
});

function paths(): Record<string, Record<string, unknown>> {
  return document.paths as unknown as Record<
    string,
    Record<string, unknown>
  >;
}

test("the document declares the agreed OpenAPI version", () => {
  expect(document.openapi).toBe(OPENAPI_SPEC_VERSION);
  const info = document.info as { title: string; version: string };
  expect(info.title).toBe(API_TITLE);
  expect(info.version).toBe(API_VERSION);
});

test("every B1 route is documented", () => {
  const listed = Object.keys(paths()).sort();
  for (const expected of [
    "/health/live",
    "/health/ready",
    "/v1/audit",
    "/v1/auth/login",
    "/v1/auth/refresh",
    "/v1/auth/logout",
    "/v1/auth/me",
    "/v1/auth/devices",
    "/v1/auth/mfa/enroll",
    "/v1/auth/mfa/verify",
    "/v1/auth/mfa/recovery",
    "/v1/staff",
  ]) {
    expect(listed, expected).toContain(expected);
  }
});

test("sign-in documents its request body, success and challenge responses", () => {
  const login = paths()["/v1/auth/login"].post as Record<string, never>;
  const body = login.requestBody as Record<string, never>;
  const content = body.content as Record<string, { schema: { $ref?: string } }>;
  expect(content["application/json"].schema.$ref).toContain("LoginDto");

  const responses = login.responses as Record<string, { content?: {
    "application/json": { schema: { $ref?: string } };
  } }>;
  expect(responses["200"].content?.["application/json"].schema.$ref).toContain(
    "SessionDto",
  );
  expect(responses["202"].content?.["application/json"].schema.$ref).toContain(
    "MfaChallengeDto",
  );
});

test("security is declared per operation, not globally", () => {
  const login = paths()["/v1/auth/login"].post as { security?: unknown };
  const staff = paths()["/v1/staff"].get as {
    security?: { access_token: string[] }[];
  };
  const health = paths()["/health/live"].get as { security?: unknown };

  expect(login.security).toBeUndefined();
  expect(health.security).toBeUndefined();
  expect(staff.security).toEqual([{ access_token: [] }]);

  const schemes = (
    document.components as { securitySchemes: Record<string, unknown> }
  ).securitySchemes;
  expect(schemes.access_token).toMatchObject({
    type: "http",
    scheme: "bearer",
  });
  expect(schemes.refresh_cookie).toMatchObject({ type: "apiKey", in: "cookie" });
});

test("errors are described with the problem document", () => {
  const staff = paths()["/v1/staff"].get as {
    responses: Record<string, { content?: Record<string, unknown> }>;
  };
  const unauthorized = staff.responses["401"];
  expect(unauthorized?.content?.["application/json"]).toBeTruthy();
});

test("the school profile contract carries no storage key", () => {
  const schemas = (
    document.components as {
      schemas: Record<
        string,
        { properties?: Record<string, unknown>; required?: unknown }
      >;
    }
  ).schemas;
  const profile = schemas.SchoolProfileDto;
  expect(profile).toBeTruthy();
  expect(profile?.properties).not.toHaveProperty("sealKey");
  expect(profile?.required ?? []).not.toContain("sealKey");
});

test("the committed contract matches what the app serves", () => {
  const onDisk = readFileSync(CONTRACT, "utf8");
  expect(`${stableStringify(document)}\n`).toBe(onDisk);
});

type SchemaNode = {
  type?: unknown;
  items?: unknown;
  anyOf?: unknown;
  nullable?: boolean;
  properties?: Record<string, SchemaNode>;
};

function forEachSchemaNode(node: unknown, path: string, visit: (n: SchemaNode, p: string) => void): void {
  if (Array.isArray(node)) {
    node.forEach((child, index) => forEachSchemaNode(child, `${path}[${index}]`, visit));
    return;
  }
  if (node === null || typeof node !== "object") return;
  visit(node as SchemaNode, path);
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    forEachSchemaNode(value, `${path}.${key}`, visit);
  }
}

test("a nullable string is not a string array in the contract", () => {
  const schemas = (
    document.components as { schemas: Record<string, SchemaNode> }
  ).schemas;

  const nextCursor =
    schemas.StudentPageDto?.properties?.nextCursor ??
    schemas.StaffPageDto?.properties?.nextCursor;
  expect(nextCursor).toBeTruthy();
  expect(nextCursor?.items).toBeUndefined();
  expect(JSON.stringify(nextCursor)).toContain("null");

  const udise = schemas.SchoolProfileDto?.properties?.udise;
  expect(udise?.items).toBeUndefined();
  expect(JSON.stringify(udise)).toContain("null");
});

test("no emitted schema uses a JSON Schema union type array", () => {
  const schemas = (
    document.components as { schemas: Record<string, SchemaNode> }
  ).schemas;

  const offenders: string[] = [];
  forEachSchemaNode(schemas, "components.schemas", (node, path) => {
    if (Array.isArray(node.type) && node.type.includes("null")) {
      offenders.push(`${path}: type=${JSON.stringify(node.type)}`);
    }
  });
  expect(offenders, offenders.join("\n")).toEqual([]);
});

test("B2a master-data routes are documented", () => {
  const listed = Object.keys(paths());
  for (const expected of [
    "/v1/school",
    "/v1/academic-years",
    "/v1/sections",
    "/v1/subjects",
    "/v1/students",
    "/v1/students/{id}",
    "/v1/students/{studentId}/guardians",
    "/v1/staff",
    "/v1/staff/{id}",
  ]) {
    expect(listed, expected).toContain(expected);
  }
});

test("list endpoints share one page envelope", () => {
  const refOf = (operation: {
    responses: Record<
      string,
      { content?: Record<string, { schema?: { $ref?: string } }> }
    >;
  }) =>
    operation.responses["200"].content?.["application/json"]?.schema?.$ref ?? "";

  const staff = paths()["/v1/staff"].get as Parameters<typeof refOf>[0];
  const students = paths()["/v1/students"].get as Parameters<typeof refOf>[0];
  expect(refOf(staff)).toContain("StaffPageDto");
  expect(refOf(students)).toContain("StudentPageDto");
});

test("writes declare the security scheme and the status codes they can return", () => {
  const create = paths()["/v1/students"].post as {
    security?: unknown;
    responses: Record<string, unknown>;
  };
  expect(create.security).toEqual([{ access_token: [] }]);
  expect(Object.keys(create.responses)).toContain("201");

  const patch = paths()["/v1/school"].patch as {
    responses: Record<string, unknown>;
  };
  expect(Object.keys(patch.responses)).toEqual(
    expect.arrayContaining(["200", "409", "428"]),
  );
});

/**
 * Extension-member contract lock (B2a Task 9).
 *
 * The runtime problem document carries RFC 9457 extension members beyond the
 * seven core ones — `expected`/`current` on a `VERSION_CONFLICT`, `constraint`
 * on a cross-school rejection — and the web client is meant to consume them
 * (`school.e2e-spec.ts` asserts `current` at runtime). A handler that drops one
 * must fail here, in the contract, rather than in the B2d conflict UI.
 */
type ObjectSchema = {
  $ref?: string;
  anyOf?: unknown[];
  oneOf?: unknown[];
  properties?: Record<string, SchemaNode>;
  required?: string[];
};

function responseSchema(
  path: string,
  method: string,
  status: string,
): ObjectSchema {
  const operation = paths()[path]?.[method] as
    | { responses?: Record<string, { content?: Record<string, { schema?: ObjectSchema }> }> }
    | undefined;
  expect(operation, `${method} ${path} is not documented`).toBeTruthy();
  const schema = operation?.responses?.[status]?.content?.["application/json"]
    ?.schema;
  expect(schema, `${method.toUpperCase()} ${path} documents no ${status} body`).toBeTruthy();
  return schema as ObjectSchema;
}

/**
 * A response schema may be inline, a `$ref` to a named component, or an
 * `anyOf`/`oneOf` over several. Flatten it to the concrete object variants the
 * client can actually receive, resolving references against components.
 */
function variantsOf(node: ObjectSchema, seen = new Set<string>()): ObjectSchema[] {
  const schemas = (
    document.components as { schemas: Record<string, ObjectSchema> }
  ).schemas;

  if (typeof node.$ref === "string") {
    const name = node.$ref.split("/").pop() ?? "";
    // A self-referential branch would loop; nothing here is recursive.
    if (seen.has(name)) return [];
    seen.add(name);
    const target = schemas[name];
    expect(target, `${node.$ref} does not resolve`).toBeTruthy();
    return variantsOf(target as ObjectSchema, seen);
  }
  const branches = node.anyOf ?? node.oneOf;
  if (Array.isArray(branches)) {
    return branches.flatMap((branch) =>
      variantsOf(branch as ObjectSchema, seen),
    );
  }
  return [node];
}

function documentMembers(
  path: string,
  method: string,
  status: string,
): { members: string[]; required: string[] } {
  const variants = variantsOf(responseSchema(path, method, status));
  const members = new Set<string>();
  const required = new Set<string>();
  for (const variant of variants) {
    for (const key of Object.keys(variant.properties ?? {})) members.add(key);
    for (const key of variant.required ?? []) required.add(key);
  }
  return { members: [...members].sort(), required: [...required].sort() };
}

const CORE_PROBLEM_MEMBERS = [
  "code",
  "detail",
  "instance",
  "requestId",
  "status",
  "title",
  "type",
];

test("every documented problem body still carries the core problem members", () => {
  for (const [path, method, status] of [
    ["/v1/school", "patch", "409"],
    ["/v1/staff/{id}", "patch", "409"],
    ["/v1/students/{id}", "patch", "409"],
    ["/v1/students", "post", "403"],
    ["/v1/students/{id}", "patch", "403"],
    ["/v1/students/{studentId}/guardians", "post", "403"],
  ]) {
    const { required } = documentMembers(path, method, status);
    for (const member of CORE_PROBLEM_MEMBERS) {
      expect(required, `${method} ${path} ${status} lost ${member}`).toContain(
        member,
      );
    }
  }
});

test("409 VERSION_CONFLICT documents the expected and current entity tags", () => {
  for (const [path, method] of [
    ["/v1/school", "patch"],
    ["/v1/staff/{id}", "patch"],
    ["/v1/students/{id}", "patch"],
  ]) {
    const { members, required } = documentMembers(path, method, "409");
    for (const member of ["expected", "current"]) {
      expect(members, `${method} ${path} 409 hides ${member}`).toContain(member);
      expect(required, `${method} ${path} 409 makes ${member} optional`).toContain(
        member,
      );
    }
  }
});

test("cross-school 403 documents the rejected constraint", () => {
  for (const [path, method] of [
    ["/v1/students", "post"],
    ["/v1/students/{id}", "patch"],
    ["/v1/students/{studentId}/guardians", "post"],
  ]) {
    const { members, required } = documentMembers(path, method, "403");
    expect(members, `${method} ${path} 403 hides constraint`).toContain(
      "constraint",
    );
    expect(required, `${method} ${path} 403 makes constraint optional`).toContain(
      "constraint",
    );
  }
});

test("extension members live in named components, not in a per-route copy", () => {
  const refOf = (path: string, method: string, status: string) =>
    responseSchema(path, method, status).$ref;

  expect(refOf("/v1/school", "patch", "409")).toContain(
    "#/components/schemas/",
  );
  expect(refOf("/v1/staff/{id}", "patch", "409")).toContain(
    "#/components/schemas/",
  );
});

test("the blast radius stays where the extras are: an ordinary 409 is untouched", () => {
  // `POST /v1/academic-years` answers ACADEMIC_YEAR_EXISTS, which carries no
  // extension members, so it must keep the plain inline problem schema.
  const inline = responseSchema("/v1/academic-years", "post", "409");
  expect(inline.$ref).toBeUndefined();
  expect(Object.keys(inline.properties ?? {}).sort()).toEqual(
    CORE_PROBLEM_MEMBERS,
  );
  expect(documentMembers("/v1/staff", "get", "401").members).toEqual(
    CORE_PROBLEM_MEMBERS,
  );
});
