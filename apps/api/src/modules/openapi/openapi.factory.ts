import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { OpenAPIObject } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";

import { REFRESH_COOKIE } from "../auth/auth.controller";

const problemResponse = (status: number, title: string) => ({
  status,
  description: `${title}. The body is an application/problem+json document.`,
  schema: {
    type: "object",
    properties: {
      type: { type: "string" },
      title: { type: "string" },
      status: { type: "integer" },
      code: { type: "string" },
      detail: { type: "string" },
      requestId: { type: "string" },
      instance: { type: "string" },
    },
    required: [
      "type",
      "title",
      "status",
      "code",
      "detail",
      "requestId",
      "instance",
    ],
  },
});

export const API_TITLE = "Baranda School Operations API";
export const API_DESCRIPTION =
  "Staff-only operations API for a West Bengal government-sponsored secondary school. " +
  "Access tokens are bearer JWTs; refresh tokens rotate and are also delivered as an " +
  "httpOnly cookie for the staff console.";
export const API_VERSION = "1.0.0";
export const OPENAPI_SPEC_VERSION = "3.0.3";

/**
 * Marker nestjs-zod puts on every property whose JSON Schema `type` is not a
 * plain string. It is dropped by `cleanupOpenApiDoc`, so the rewrite below has
 * to run before that cleanup.
 */
const EMPTY_TYPE_MARKER = "x-nestjs_zod-empty-type";

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deterministic OpenAPI 3.0 nullability rewrite (B2a Task 3b).
 *
 * Cause chain, reproduced in isolation against the installed nestjs-zod 5.5.0
 * and zod 4.6.7:
 *
 * 1. `z.toJSONSchema(..., { io })` emits a JSON Schema *union type array* for
 *    unconstrained nullable types: `z.string().nullable()` becomes
 *    `{ type: ["string", "null"] }`. Constrained types (`z.uuid()`,
 *    `z.string().regex(...)`, objects, ...) instead become
 *    `anyOf: [..., { type: "null" }]`.
 * 2. nestjs-zod forwards the array-valued `type` through
 *    `_OPENAPI_METADATA_FACTORY` and flags the property with
 *    `x-nestjs_zod-empty-type`, but its 3.1-syntax detection only fires on a
 *    literal `{ type: "null" }` subschema, so union-type-array properties never
 *    reach the `cleanupOpenApiDoc(..., { version: "3.0" })` `anyOf` converter.
 * 3. `@nestjs/swagger` reads the array-valued `type` as its own "array type"
 *    shorthand and emits `{ type: "array", items: { type: "string" } }` — a
 *    nullable string mistyped as a string array in every generated client.
 *    Raw union arrays that swagger leaves untouched (nested inside pass-through
 *    subschemas) remain as `type: ["string", "null"]`, which is legal JSON
 *    Schema but illegal in OpenAPI 3.0.
 *
 * This pass rewrites both shapes to the 3.0 form `type: <scalar>` +
 * `nullable: true` (or `anyOf` + `nullable: true` for genuine multi-type
 * unions). It keys off the structural shapes, not property names, so it covers
 * every current and future nullable field. Hand-editing the artefacts is not
 * part of the pipeline.
 */
export function normalizeOpenApiNullability(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeOpenApiNullability);
  }
  if (!isJsonObject(value)) {
    return value;
  }

  let node = value;

  // Swagger-mangled nullable: a marked property rendered as
  // { type: "array", items: X } where X is the original scalar schema.
  if (
    node[EMPTY_TYPE_MARKER] === true &&
    node.type === "array" &&
    isJsonObject(node.items)
  ) {
    const {
      [EMPTY_TYPE_MARKER]: _marker,
      type: _type,
      items,
      ...rest
    } = node;
    node = { ...items, ...rest, nullable: true };
  }

  // JSON Schema union type array, e.g. { type: ["string", "null"] }.
  if (Array.isArray(node.type)) {
    const types = node.type.filter((t): t is string => typeof t === "string");
    const nullable = types.includes("null");
    const nonNull = types.filter((t) => t !== "null");
    const { type: _type, ...rest } = node;
    node =
      nonNull.length > 1
        ? {
            ...rest,
            anyOf: nonNull.map((t) => ({ type: t })),
            ...(nullable ? { nullable: true } : {}),
          }
        : {
            ...rest,
            ...(nonNull.length === 1 ? { type: nonNull[0] } : {}),
            ...(nullable ? { nullable: true } : {}),
          };
  }

  const rewritten: JsonObject = {};
  for (const [key, child] of Object.entries(node)) {
    rewritten[key] = normalizeOpenApiNullability(child);
  }
  return rewritten;
}

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle(API_TITLE)
    .setDescription(API_DESCRIPTION)
    .setVersion(API_VERSION)
    .setOpenAPIVersion(OPENAPI_SPEC_VERSION)
    .addServer("/", "This deployment")
    .addTag("health", "Liveness and readiness probes")
    .addTag("auth", "Sign in, sessions, devices and MFA")
    .addTag("staff", "Staff directory")
    .addTag("school", "School profile, academic years, sections and subjects")
    .addTag("students", "Students and guardians")
    .addTag("audit", "Append-only audit log")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      "access_token",
    )
    .addCookieAuth(REFRESH_COOKIE, { type: "apiKey", in: "cookie" }, "refresh_cookie")
    .addGlobalResponse(
      problemResponse(400, "Bad request"),
      problemResponse(401, "Authentication required"),
      problemResponse(403, "Forbidden"),
      problemResponse(404, "Not found"),
      problemResponse(409, "Conflict"),
      problemResponse(422, "Validation failed"),
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    ignoreGlobalPrefix: false,
  });
  // Must run before `cleanupOpenApiDoc`: the cleanup pass strips the
  // `x-nestjs_zod-empty-type` marker that identifies swagger-mangled nullables.
  return cleanupOpenApiDoc(
    normalizeOpenApiNullability(document) as OpenAPIObject,
    { version: "3.0" },
  );
}
