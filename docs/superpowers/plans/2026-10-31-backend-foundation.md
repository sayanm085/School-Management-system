# Baranda Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the production backend foundation for Baranda: a typed NestJS API over PostgreSQL with staff authentication, MFA, role/scope authorization, append-only audit, a deterministic seed import, CI, and a deployable container.

**Architecture:** A modular monolith in `apps/api` using NestJS with the Fastify adapter and Drizzle ORM. PostgreSQL is the source of truth. Redis and BullMQ are available from the first milestone for rate limiting and the later workers. The API exposes versioned REST/OpenAPI; the web console and Flutter app consume the same API in later phases. The existing local demo remains available behind a data-source switch.

**Tech Stack:** Node.js 22 LTS, NestJS 11, Fastify, TypeScript strict, Drizzle ORM, PostgreSQL 16, Redis 7, Zod, `nestjs-zod`, OpenAPI 3.0.3, Vitest, Supertest, Testcontainers, Argon2id, TOTP.

**Spec:** `docs/superpowers/specs/2026-10-31-backend-architecture.md` and `docs/superpowers/specs/2026-10-31-baranda-school-operations-design.md`

## Global Constraints

- Node.js 22 LTS in CI and production; local development may use a newer Node, but the engine range is `>=22 <25`.
- PostgreSQL 16 and Redis 7, both pinned in `docker-compose.yml`.
- TypeScript strict; no `any` in public interfaces; no `// @ts-ignore`.
- All school-scoped queries require `school_id` from the authenticated session, never from the request body.
- All money is integer paise; all storage timestamps are UTC `timestamptz`; business dates use `Asia/Kolkata`.
- Every mutation that changes school data writes an audit event in the same transaction.
- API paths are `/v1/...`; errors use RFC 9457 `application/problem+json`.
- No secrets in the repository; `.env.example` contains placeholders only.
- No PII in application logs; request bodies are not logged.
- Tests must pass before each commit; migrations are reviewed SQL files committed with the schema.
- No production data is used in development or CI.

---

## File Structure

```
apps/api/
  package.json
  tsconfig.json
  vitest.config.ts
  drizzle.config.ts
  .env.example
  docker-compose.yml
  Dockerfile
  drizzle/                         reviewed SQL migrations
  src/
    main.ts
    app.module.ts
    config/env.ts
    db/
      client.ts
      schema/
        index.ts
        school.ts
        identity.ts
        academic.ts
        audit.ts
        platform.ts
      migrate.ts
      seed.ts
    common/
      audit/audit.service.ts
      authz/
        current-user.ts
        policy.service.ts
        auth.guard.ts
        roles.decorator.ts
      errors/
        problem-details.filter.ts
      http/request-id.ts
      idempotency/
      money.ts
    modules/
      health/health.controller.ts
      auth/
        auth.module.ts
        auth.controller.ts
        auth.service.ts
        password.service.ts
        token.service.ts
        mfa.service.ts
        auth.schemas.ts
      staff/
        staff.module.ts
        staff.controller.ts
        staff.service.ts
      audit/
        audit.module.ts
        audit.controller.ts
    workers/main.ts
  test/
    setup.ts
    db.ts
    auth.e2e-spec.ts
    health.e2e-spec.ts
```

No application files outside `apps/api` are changed in B1 except the generated web API types, the web `api:types` script, the CI workflow, and the root documentation pointer.

---

### Task 1: Scaffold the API and health endpoints

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/modules/health/health.controller.ts`
- Test: `apps/api/test/health.e2e-spec.ts`

**Interfaces:**
- Produces: `createApp()` returning a configured Fastify/Nest application for tests; `Env` with validated variables; `GET /health/live`, `GET /health/ready`.

- [ ] **Step 1: Scaffold the app**

```bash
cd apps
npx @nestjs/cli new api --package-manager npm --skip-git --strict
cd api
npm install @nestjs/platform-fastify @nestjs/config @nestjs/swagger @nestjs/terminus
npm install zod nestjs-zod
npm install -D vitest supertest @types/supertest
```

Add scripts:

```json
{
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "drizzle:generate": "drizzle-kit generate",
    "drizzle:migrate": "tsx src/db/migrate.ts",
    "seed": "tsx src/db/seed.ts",
    "openapi:generate": "tsx scripts/generate-openapi.ts"
  }
}
```

- [ ] **Step 2: Write the failing health test**

```ts
// test/health.e2e-spec.ts
import { afterAll, beforeAll, expect, test } from "vitest";
import { createApp } from "../src/main";

let app: Awaited<ReturnType<typeof createApp>>;

beforeAll(async () => {
  app = await createApp();
});

afterAll(async () => {
  await app.close();
});

test("liveness responds with ok", async () => {
  const response = await app.inject({ method: "GET", url: "/health/live" });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({ status: "ok" });
});
```

Run: `npm test -- test/health.e2e-spec.ts`  
Expected: FAIL because `createApp` does not exist.

- [ ] **Step 3: Implement environment validation and health**

```ts
// src/config/env.ts
import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3002),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_PEPPER: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_DOMAIN: z.string().optional(),
  WEB_ORIGIN: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${parsed.error.message}`);
  }
  return parsed.data;
}
```

```ts
// src/modules/health/health.controller.ts
import { Controller, Get } from "@nestjs/common";
import { HealthCheck, HealthCheckService } from "@nestjs/terminus";

@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  @Get("live")
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  @Get("ready")
  @HealthCheck()
  ready() {
    return this.health.check([]);
  }
}
```

```ts
// src/main.ts
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { loadEnv } from "./config/env";

export async function createApp() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
  );
  app.setGlobalPrefix("v1", { exclude: ["health/live", "health/ready"] });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

async function bootstrap() {
  const env = loadEnv();
  const app = await createApp();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

if (require.main === module) void bootstrap();
```

Run: `npm test -- test/health.e2e-spec.ts`  
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api
git commit -m "feat(api): scaffold typed NestJS service with health checks"
```

---

### Task 2: Local infrastructure and database connection

**Files:**
- Create: `apps/api/docker-compose.yml`
- Create: `apps/api/src/db/client.ts`
- Create: `apps/api/test/db.ts`
- Create: `apps/api/test/setup.ts`
- Modify: `apps/api/package.json`

**Interfaces:**
- Produces: `createDb(url): NodePgDatabase` (or Drizzle `postgres` client); `withTestDb()` that starts PostgreSQL and applies migrations.

- [ ] **Step 1: Add local services**

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: baranda
      POSTGRES_PASSWORD: baranda_local
      POSTGRES_DB: baranda
    ports: ["5432:5432"]
    volumes: ["baranda_pg:/var/lib/postgresql/data"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: baranda
      MINIO_ROOT_PASSWORD: baranda_local
    ports: ["9000:9000", "9001:9001"]
    volumes: ["baranda_minio:/data"]
volumes:
  baranda_pg:
  baranda_minio:
```

- [ ] **Step 2: Add the connection and failing test**

```ts
// test/db.ts
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export async function withTestDb() {
  const container = await new PostgreSqlContainer("postgres:16").start();
  const url = container.getConnectionUri();
  const client = postgres(url, { max: 1 });
  return {
    url,
    db: drizzle(client),
    close: async () => {
      await client.end();
      await container.stop();
    },
  };
}
```

Task 3 updates this helper to run migrations after the schema exists.

- [ ] **Step 3: Implement the DB client**

```ts
// src/db/client.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export function createDb(url: string) {
  const client = postgres(url, { max: 10, prepare: false });
  return { db: drizzle(client), client };
}
```

- [ ] **Step 4: Verify**

Install test dependencies:

```bash
npm install -D @testcontainers/postgresql testcontainers tsx drizzle-kit
npm install drizzle-orm postgres
```

Run: `docker compose up -d` then `npm run typecheck` and `npm test`.  
Expected: PASS and Postgres/Redis/MinIO healthy.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "chore(api): add local postgres, redis, minio and db client"
```

---

### Task 3: Core schema and first migration

**Files:**
- Create: `apps/api/drizzle.config.ts`
- Create: `apps/api/src/db/schema/school.ts`
- Create: `apps/api/src/db/schema/identity.ts`
- Create: `apps/api/src/db/schema/academic.ts`
- Create: `apps/api/src/db/schema/audit.ts`
- Create: `apps/api/src/db/schema/platform.ts`
- Create: `apps/api/src/db/migrate.ts`
- Create: `apps/api/src/db/schema/index.ts`
- Test: `apps/api/test/schema.e2e-spec.ts`

**Interfaces:**
- Produces: tables `schools`, `academic_years`, `users`, `staff`, `staff_assignments`, `sections`, `subjects`, `refresh_tokens`, `devices`, `password_reset_tokens`, `audit_events`, `idempotency_keys`.
- Every table carries `school_id` where applicable, `version`, and timestamps.

- [ ] **Step 1: Write the failing schema test**

```ts
import { sql } from "drizzle-orm";
import { expect, test } from "vitest";
import { withTestDb } from "./db";

test("core tables exist after migration", async () => {
  const { db, close } = await withTestDb();
  try {
    const result = await db.execute(
      sql`select table_name from information_schema.tables where table_schema = 'public'`,
    );
    const names = result.map((row) => row.table_name);
    expect(names).toEqual(
      expect.arrayContaining([
        "schools",
        "academic_years",
        "users",
        "staff",
        "sections",
        "subjects",
        "staff_assignments",
        "refresh_tokens",
        "devices",
        "audit_events",
        "idempotency_keys",
      ]),
    );
  } finally {
    await close();
  }
});
```

Run: `npm test -- test/schema.e2e-spec.ts`  
Expected: FAIL because migrations do not exist.

- [ ] **Step 2: Implement the identity schema**

Use UUIDv7 generated in the application, `text` enums, and explicit unique indexes. The `users` table follows the schema in the architecture document. `staff_assignments` stores `type` (`class_teacher`, `subject_teacher`, `exam_coordinator`, `accountant`, `assistant_headmaster`) and nullable `section_id`, `subject_id`, `exam_id`.

Required constraints:
- `users (school_id, employee_id)` unique.
- `staff (school_id, employee_id)` unique.
- `sections (academic_year_id, class_level, section)` unique.
- `subjects (school_id, code)` unique.
- `refresh_tokens (token_hash)` unique.
- `audit_events` has indexes on `(school_id, created_at desc)`.

- [ ] **Step 3: Add the migration runner and update the test helper**

```ts
// src/db/migrate.ts
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

export async function runMigrations(url: string) {
  const client = postgres(url, { max: 1 });
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "drizzle" });
  await client.end();
}
```

Update `test/db.ts` to call `await runMigrations(url)` before returning the client.

- [ ] **Step 4: Generate and inspect SQL**

```bash
npm run drizzle:generate
# Read every file in drizzle/; confirm school_id, indexes, and constraints.
npm run drizzle:migrate
```

Run: `npm test -- test/schema.e2e-spec.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/db apps/api/drizzle apps/api/drizzle.config.ts apps/api/test/schema.e2e-spec.ts
git commit -m "feat(api): add core identity, academic and audit schema"
```

---

### Task 4: Append-only audit service

**Files:**
- Create: `apps/api/src/common/audit/audit.service.ts`
- Create: `apps/api/src/modules/audit/audit.module.ts`
- Create: `apps/api/src/modules/audit/audit.controller.ts`
- Test: `apps/api/test/audit.spec.ts`

**Interfaces:**
- `AuditService.append(tx, event: AuditEventInput): Promise<void>`
- `AuditEventInput` includes actorUserId, schoolId, action, entityType, entityId, before, after, requestId, ip, userAgent.
- `AuditService.list(schoolId, query)` returns paginated audit events for Headmaster and Management.

- [ ] **Step 1: Write the failing test**

```ts
test("appends an audit event in the same transaction", async () => {
  const { db, close } = await withTestDb();
  try {
    await db.transaction(async (tx) => {
      await auditService.append(tx, {
        schoolId,
        actorUserId: userId,
        action: "auth.login",
        entityType: "user",
        entityId: userId,
        before: null,
        after: { result: "success" },
        requestId: "req_test",
      });
    });
    const rows = await db.select().from(auditEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe("auth.login");
  } finally {
    await close();
  }
});
```

- [ ] **Step 2: Implement and enforce append-only**

Use a database role migration that grants `INSERT` and `SELECT` but not `UPDATE`/`DELETE` on `audit_events` to the application role. The application never exposes update/delete endpoints. Add a test that an UPDATE statement fails for the app role.

- [ ] **Step 3: Verify and commit**

Run: `npm test -- test/audit.spec.ts`  
Expected: PASS.

```bash
git add apps/api/src/common/audit apps/api/src/modules/audit apps/api/test/audit.spec.ts
git commit -m "feat(api): add transactional append-only audit log"
```

---

### Task 5: Password hashing and login

**Files:**
- Create: `apps/api/src/modules/auth/password.service.ts`
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/auth/auth.schemas.ts`
- Create: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/src/modules/auth/auth.module.ts`
- Test: `apps/api/test/auth.e2e-spec.ts`

**Interfaces:**
- `PasswordService.hash(plain): Promise<string>` and `verify(hash, plain): Promise<boolean>`.
- `AuthService.login(employeeId, password, device): Promise<LoginResult>`.
- `LoginResult` contains access token, refresh token, user summary, and `mfaRequired: boolean`.
- `POST /v1/auth/login` returns `200`, or `202` with `{ mfaRequired: true, challengeId }` when MFA is enabled.

- [ ] **Step 1: Write failing tests**

Cover:
- valid employee ID + password returns tokens;
- unknown employee ID and wrong password return the same generic `401` problem code;
- disabled account is rejected;
- five failed attempts set `locked_until` and the next attempt returns `429`;
- a successful login writes `auth.login` audit;
- a wrong password writes `auth.login_failed` without revealing the employee ID in logs.

- [ ] **Step 2: Implement Argon2id and login**

```ts
// src/modules/auth/password.service.ts
import { hash, verify } from "argon2";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PasswordService {
  hash(plain: string) {
    return hash(plain, {
      type: 2, // Argon2id
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  verify(hash: string, plain: string) {
    return verify(hash, plain);
  }
}
```

Use a single generic error for unknown employee, wrong password, and disabled account at the HTTP layer. Do the password comparison even when the user is unknown with a precomputed dummy hash to reduce timing differences.

- [ ] **Step 3: Verify and commit**

Run: `npm test -- test/auth.e2e-spec.ts`  
Expected: PASS.

```bash
git add apps/api/src/modules/auth apps/api/test/auth.e2e-spec.ts
git commit -m "feat(api): add staff login with argon2id and lockout"
```

---

### Task 6: Refresh rotation, logout, and devices

**Files:**
- Create: `apps/api/src/modules/auth/token.service.ts`
- Modify: `apps/api/src/modules/auth/auth.service.ts`
- Modify: `apps/api/src/modules/auth/auth.controller.ts`
- Test: `apps/api/test/refresh.e2e-spec.ts`

**Interfaces:**
- `TokenService.issue(user, device): Promise<AuthTokens>`.
- `TokenService.rotate(refreshToken): Promise<AuthTokens>`.
- `TokenService.revokeFamily(familyId)`.
- `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `GET /v1/auth/devices`, `DELETE /v1/auth/devices/:id`.

- [ ] **Step 1: Write failing tests**

- rotate returns a new refresh token and revokes the old one;
- reusing a rotated token revokes the whole family and returns `401`;
- logout revokes the family;
- a revoked device cannot refresh;
- refresh tokens are stored only as hashes;
- access token contains `sub`, `schoolId`, `role`, and `tokenVersion`.

- [ ] **Step 2: Implement rotation with a transaction**

Read the refresh row `FOR UPDATE`, verify the hash and expiry, mark it rotated, create a new row in the same family, and return new tokens. Store the raw refresh token only in the client; the database sees only an HMAC/hash with the server pepper.

- [ ] **Step 3: Verify and commit**

Run: `npm test -- test/refresh.e2e-spec.ts`  
Expected: PASS.

```bash
git add apps/api/src/modules/auth apps/api/test/refresh.e2e-spec.ts
git commit -m "feat(api): add rotating refresh tokens and device sessions"
```

---

### Task 7: TOTP MFA for Headmaster and Clerk

**Files:**
- Create: `apps/api/src/modules/auth/mfa.service.ts`
- Modify: `apps/api/src/modules/auth/auth.service.ts`
- Modify: `apps/api/src/modules/auth/auth.controller.ts`
- Test: `apps/api/test/mfa.e2e-spec.ts`

**Interfaces:**
- `MfaService.enroll(user): Promise<{ secret, otpauthUrl, recoveryCodes }>`.
- `MfaService.verify(user, code): Promise<boolean>`.
- Login for MFA-enabled users returns `mfaRequired` and a short-lived challenge token; `POST /v1/auth/mfa/verify` exchanges the challenge + TOTP for tokens.
- `POST /v1/auth/mfa/recovery` consumes a one-time recovery code.

- [ ] **Step 1: Write failing tests**

- HM and Clerk are forced to enroll on first login in production mode;
- TOTP window ±1 step is accepted;
- wrong code does not issue tokens;
- recovery code works once, then fails;
- secrets are encrypted at rest, not stored plaintext;
- MFA verification and failures are audited.

- [ ] **Step 2: Implement with `otplib` and AES-GCM**

Use `otplib` for TOTP and Node `crypto` AES-256-GCM with a key from the environment. Recovery codes are generated once, shown once, stored as Argon2id hashes, and marked used.

- [ ] **Step 3: Verify and commit**

Run: `npm test -- test/mfa.e2e-spec.ts`  
Expected: PASS.

```bash
git add apps/api/src/modules/auth apps/api/test/mfa.e2e-spec.ts
git commit -m "feat(api): add TOTP MFA and recovery codes"
```

---

### Task 8: Role and scope authorization

**Files:**
- Create: `apps/api/src/common/authz/current-user.ts`
- Create: `apps/api/src/common/authz/policy.service.ts`
- Create: `apps/api/src/common/authz/auth.guard.ts`
- Create: `apps/api/src/common/authz/roles.decorator.ts`
- Create: `apps/api/src/modules/staff/staff.service.ts`
- Test: `apps/api/test/policy.spec.ts`

**Interfaces:**
- `CurrentUser` includes userId, schoolId, role, staffId, tokenVersion, and assigned section IDs.
- `PolicyService.require(user, permission, resource?)`.
- Permissions include `students.view`, `attendance.mark`, `fees.collect`, `salary.approve`, `substitutions.assign`, and the rest of the permission matrix.
- `canAccessSection(user, sectionId)` and `canMarkAttendance(user, sectionId, date)` are explicit.

- [ ] **Step 1: Write the failing role matrix test**

```ts
test("assistant headmaster can assign cover but cannot approve salary", async () => {
  const ahm = await userWithAssignment("assistant_headmaster");
  expect(policy.can(ahm, "substitutions.assign")).toBe(true);
  expect(policy.can(ahm, "salary.approve")).toBe(false);
});

test("teacher can mark only assigned or covered sections", () => {
  const teacher = teacherAssignedTo("VIII-B");
  expect(policy.canAccessSection(teacher, "VIII-B")).toBe(true);
  expect(policy.canAccessSection(teacher, "IX-A")).toBe(false);
  const cover = substituteFor("IX-A", "2026-10-31", 4);
  expect(policy.canAccessSection(cover, "IX-A", "2026-10-31")).toBe(true);
});

test("management cannot read a named student", () => {
  expect(policy.can(management, "students.view")).toBe(false);
});
```

- [ ] **Step 2: Implement the policy**

The role permission table is explicit, not inferred from strings. The Assistant Headmaster assignment adds only cover permissions. Section access checks assignments and today's substitution records. The guard loads the user, checks `tokenVersion` against the access token, and attaches `CurrentUser` to the request.

- [ ] **Step 3: Verify and commit**

Run: `npm test -- test/policy.spec.ts`  
Expected: PASS for every role and assignment case.

```bash
git add apps/api/src/common/authz apps/api/src/modules/staff apps/api/test/policy.spec.ts
git commit -m "feat(api): enforce role and section scope authorization"
```

---

### Task 9: Seed import from the current demo

**Files:**
- Create: `apps/api/src/db/seed.ts`
- Create: `apps/api/src/db/seed-data.ts`
- Test: `apps/api/test/seed.e2e-spec.ts`

**Interfaces:**
- `seedDatabase(url, options: { demo: boolean })`.
- Reads `apps/web/src/data/seed.json` in development/demo mode.
- Creates the school, academic year, sections, subjects, staff, assignments, and demo users.
- Passwords come from `DEMO_PASSWORD`; no password is hard-coded in source.

- [ ] **Step 1: Write the failing seed test**

```ts
test("seed imports the demo school and staff accounts", async () => {
  const { db, close } = await withTestDb();
  try {
    await seedDatabase(url, { demo: true });
    const schools = await db.select().from(schools);
    const users = await db.select().from(users);
    const staff = await db.select().from(staff);
    expect(schools).toHaveLength(1);
    expect(staff.length).toBeGreaterThanOrEqual(32);
    expect(users.map((user) => user.employeeId)).toEqual(
      expect.arrayContaining(["HM-001", "TCH-001", "TCH-027", "TCH-023", "CLK-014", "MC-003"]),
    );
  } finally {
    await close();
  }
});
```

- [ ] **Step 2: Implement idempotent seeding**

Use deterministic UUIDs for seeded rows so re-running the seed updates rather than duplicates. Hash the demo password with Argon2id once per user, not once per row. Refuse to run demo seeding when `NODE_ENV=production`.

- [ ] **Step 3: Verify and commit**

Run: `npm test -- test/seed.e2e-spec.ts`  
Expected: PASS.

```bash
git add apps/api/src/db/seed.ts apps/api/src/db/seed-data.ts apps/api/test/seed.e2e-spec.ts
git commit -m "feat(api): import demo school data and staff accounts"
```

---

### Task 10: API conventions: problem details, request IDs, pagination

**Files:**
- Create: `apps/api/src/common/errors/problem-details.filter.ts`
- Create: `apps/api/src/common/http/request-id.ts`
- Create: `apps/api/src/common/http/pagination.ts`
- Modify: `apps/api/src/main.ts`
- Test: `apps/api/test/http-conventions.e2e-spec.ts`

**Interfaces:**
- Every response carries `X-Request-Id`.
- Errors return `application/problem+json` with `type`, `title`, `status`, `code`, `detail`, `requestId`.
- Pagination helper returns `{ data, nextCursor }`.

- [ ] **Step 1: Write failing tests** for validation errors, 404s, request IDs, and cursor pagination.
- [ ] **Step 2: Implement the global filter, request-id hook, and cursor codec.**
- [ ] **Step 3: Verify and commit**

```bash
npm test -- test/http-conventions.e2e-spec.ts
git add apps/api/src/common apps/api/src/main.ts apps/api/test/http-conventions.e2e-spec.ts
git commit -m "feat(api): standardize errors, request ids and pagination"
```

---

### Task 11: Idempotency and optimistic concurrency foundation

**Files:**
- Create: `apps/api/src/common/idempotency/idempotency.service.ts`
- Create: `apps/api/src/common/idempotency/idempotency.interceptor.ts`
- Create: `apps/api/src/db/schema/platform.ts`
- Test: `apps/api/test/idempotency.e2e-spec.ts`

**Interfaces:**
- `POST` requests with `Idempotency-Key` replay the original status and body.
- Mismatched request body for the same key returns `409`.
- A successful mutation can be retried safely.
- `If-Match` / `version` mismatch returns `409` with the current version.

- [ ] **Step 1: Write failing tests** for replay, body mismatch, expiry, and version conflict.
- [ ] **Step 2: Implement the interceptor and table.**
- [ ] **Step 3: Verify and commit**

```bash
npm test -- test/idempotency.e2e-spec.ts
git add apps/api/src/common/idempotency apps/api/src/db/schema/platform.ts apps/api/test/idempotency.e2e-spec.ts
git commit -m "feat(api): add idempotency keys and version conflicts"
```

---

### Task 12: OpenAPI contract and web type generation

**Files:**
- Create: `apps/api/scripts/generate-openapi.ts`
- Create: `apps/api/openapi.json`
- Create: `apps/web/src/lib/api/generated.d.ts`
- Modify: `apps/web/package.json`
- Test: `apps/api/test/openapi.e2e-spec.ts`

**Interfaces:**
- `GET /openapi.json` is available in non-production and protected in production.
- `npm run openapi:generate` writes a deterministic OpenAPI document.
- Web code imports generated types; no hand-written duplicate types for API responses.

- [ ] **Step 1: Write the failing contract test** that asserts `/v1/auth/login`, `/v1/auth/refresh`, and `/health/live` are present and the document validates as OpenAPI 3.0.3.
- [ ] **Step 2: Generate the document with `@nestjs/swagger` and `nestjs-zod`.**
- [ ] **Step 3: Add a web script using `openapi-typescript`.**
- [ ] **Step 4: Verify and commit**

```bash
npm run openapi:generate
cd ../web && npm run api:types
git add apps/api/openapi.json apps/web/src/lib/api/generated.d.ts
git commit -m "feat(api): publish openapi contract and generated web types"
```

---

### Task 13: CI, Docker, and staging smoke test

**Files:**
- Create: `.github/workflows/backend.yml`
- Create: `apps/api/Dockerfile`
- Create: `apps/api/docker-compose.prod.yml`
- Create: `apps/api/.env.example`
- Test: CI pipeline and `docker build`

**Interfaces:**
- CI runs lint, typecheck, unit, integration, migration check, OpenAPI check, and Docker build.
- The image runs as a non-root user and exposes a health check.
- Migrations run as a separate release command, never in the API startup path.

- [ ] **Step 1: Write the workflow**

```yaml
name: backend
on:
  pull_request:
  push:
    branches: [main]
jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: baranda
          POSTGRES_PASSWORD: baranda
          POSTGRES_DB: baranda
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U baranda"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
      redis:
        image: redis:7
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: apps/api/package-lock.json
      - run: npm ci
        working-directory: apps/api
      - run: npm run lint && npm run typecheck && npm test
        working-directory: apps/api
      - run: npm run openapi:generate && git diff --exit-code openapi.json
        working-directory: apps/api
      - run: docker build -t baranda-api:ci .
        working-directory: apps/api
```

- [ ] **Step 2: Build the Docker image**

Use a multi-stage build: dependencies, build, production dependencies, runtime as `node:22-slim` non-root. Add `HEALTHCHECK` for `/health/live`.

- [ ] **Step 3: Deploy to staging and smoke test**

Run migrations, start API and worker, and verify:

```bash
curl -f https://staging-api.example/health/live
curl -f https://staging-api.example/health/ready
curl -f https://staging-api.example/openapi.json
```

Log in with a seeded demo account and verify `/v1/auth/me` and an audit row.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/backend.yml apps/api/Dockerfile apps/api/docker-compose.prod.yml apps/api/.env.example
git commit -m "chore(api): add ci, container build and staging smoke test"
```

---

## B1 Exit Criteria

- [ ] API builds and starts with Node 22.
- [ ] PostgreSQL and Redis run locally through Docker Compose.
- [ ] Core migrations apply from an empty database.
- [ ] Login, refresh rotation, logout, device revocation, and MFA work.
- [ ] Role matrix tests cover Headmaster, Teacher, Clerk, Management, and Assistant Headmaster.
- [ ] Teacher section scope and substitute scope tests pass.
- [ ] Every auth and policy mutation writes audit; audit rows cannot be updated by the app role.
- [ ] Demo seed imports the current school/staff data idempotently.
- [ ] Problem details, request IDs, pagination, idempotency, and version conflicts are covered.
- [ ] OpenAPI is generated and web types compile without drift.
- [ ] CI is green and staging is reachable.
- [ ] No secrets or PII in git, logs, or fixtures.

## Later phase plans

The following are deliberately separate plans and are not executed in B1:

- B2: school, staff, students, guardians, admissions, files.
- B3: attendance, corrections, staff leave, Flutter Drift and sync.
- B4: timetable, cover desk, substitutions.
- B5: exams, marks, results, report cards.
- B6: fees, bills, payments, concessions.
- B7: salary, approvals, disbursement, payslips.
- B8: notices, analytics, reports, settings, audit UI.
- B9: production hardening, data import, UAT, go-live.

Each phase gets its own executable plan after the previous phase gate is accepted.
