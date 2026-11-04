# Baranda Backend Architecture

**Status:** Proposed — awaiting approval  
**Date:** 2026-10-31  
**Product spec:** `docs/superpowers/specs/2026-10-31-baranda-school-operations-design.md`  
**First milestone plan:** `docs/superpowers/plans/2026-10-31-backend-foundation.md`

---

## 1. Context

The current build is a complete front-end simulation: a Next.js staff console and a Flutter teacher app, each backed by its own local seeded data. Every workflow is navigable, but there is no shared source of truth.

This plan introduces the production backend that replaces the separate local stores. The front end, mobile app, reports, audit trail, and permissions must all read from the same PostgreSQL database.

The backend is not a rewrite of the product. It is a new application underneath the existing screens, introduced module by module.

### Goals

- One authoritative staff account and school record.
- Role- and scope-based authorization enforced on the server.
- Student, staff, attendance, timetable, exam, fee, salary, notice, report, and audit data stored transactionally.
- Offline attendance and cover claims from Hazira, synced without losing marks.
- A documented, versioned API usable by the web console and Flutter app.
- Auditability for every sensitive write.
- Deployment in India with encrypted backups, restore drills, and a clear privacy posture.
- A small operational footprint appropriate to a single school.

### Non-goals for this backend milestone

- Student login, parent login, or a student-facing app.
- Real payment-gateway settlement. Fee collection is recorded, not processed.
- Direct Banglar Shiksha or UDISE submission.
- Multi-school billing, self-service tenant signup, or cross-school administration.
- SMS delivery in the first release. In-app notices and email are sufficient.
- Microservices. A modular monolith with a worker process is the correct size.

---

## 2. Architecture decisions

### D1 — A separate API application

**Decision:** Build `apps/api` as a separate Node.js service, not as Next.js route handlers.

**Why:** Flutter needs a stable HTTP API; background jobs need a worker process independent of the web deploy; and the web UI should be deployable without exposing database access. A separate API also gives one authorization boundary for both clients.

**Consequence:** The web app becomes an HTTP client. It keeps a local demo mode for sales and offline demonstration.

### D2 — Stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js 22 LTS |
| API framework | NestJS 11 with the Fastify adapter |
| Language | TypeScript strict |
| Validation and contracts | Zod + `nestjs-zod`; OpenAPI 3.0.3 |
| ORM and migrations | Drizzle ORM + Drizzle Kit |
| Database | PostgreSQL 16 |
| Cache and queues | Redis 7 + BullMQ |
| Object storage | S3-compatible private storage; MinIO locally |
| PDF rendering | Headless Chromium worker using the existing print HTML/CSS |
| Email | SMTP-compatible provider (Resend or the school's mail host) |
| Testing | Vitest, Supertest, Testcontainers |

**Why NestJS:** The domain has many modules, guards, background jobs, and cross-cutting audit requirements. NestJS modules, dependency injection, guards, and interceptors keep those boundaries explicit. Fastify keeps the HTTP layer lean.

**Why Drizzle:** The existing product spec already selects Drizzle. It keeps SQL visible for fee, salary, and analytics queries where hand-written SQL is the correct tool, while still generating typed queries and reviewed migrations.

### D3 — Single-school production, multi-school-ready schema

**Decision:** Deploy one school per environment for the first release. Put `school_id` on every school-scoped table and derive it from the authenticated session, never from the request body.

**Why:** The current product is a school-level ERP. Adding tenant-selection UI now would add risk without a user. Keeping `school_id` from day one prevents a painful migration if the software is later sold to a second school.

**Rule:** A repository method never queries a school-scoped table without a `school_id` predicate. Cross-school access is a Critical bug and is covered by integration tests.

### D4 — Authentication

- Staff-only accounts. No student or guardian accounts.
- Email/employee ID plus password for web and mobile.
- Argon2id password hashes, never reversible encryption.
- Access token: JWT, 15 minutes, held in memory on mobile and in an httpOnly cookie on web.
- Refresh token: opaque 256-bit value, hashed in the database, 30 days, rotated on every use. Reuse of an old token revokes the session family.
- Device sessions: each refresh-token family is attached to a registered device; users can revoke devices.
- TOTP MFA mandatory for Headmaster and Clerk; optional for teachers and management. Recovery codes are hashed.
- Rate limits and lockouts on login and password reset.
- Password reset by email. The Headmaster can issue a one-time reset for a staff member without email.

**Why not phone OTP first:** Phone OTP is useful, but it introduces an SMS vendor, per-message cost, and delivery failures before the school has even used the system. Password plus MFA covers the staff-only first release. Phone OTP can be added as a second factor later.

### D5 — API contract

- REST under `/v1`, resource-oriented, JSON.
- OpenAPI 3.0.3 generated from the same Zod schemas the server validates with.
- RFC 9457 `application/problem+json` errors with a stable `code`, human `detail`, and `requestId`.
- Cursor pagination for lists: opaque cursor, `limit` 1–100, stable ordering.
- Every mutating request carries `Idempotency-Key` when the side effect matters (attendance submission, payments, salary transitions, cover assignment, admissions decisions).
- Optimistic concurrency with `version` and `If-Match`; conflicts return `409`.
- Every request has a request ID in logs and responses.
- API versioning by path. Breaking changes create `/v2`; additive changes do not.

**Why REST over tRPC:** Flutter cannot consume tRPC without reimplementing it, and the API must outlive the current web UI. OpenAPI gives both clients a contract and makes external inspection possible.

### D6 — Offline scope

Only two workflows are offline in the first backend release:

1. Teacher attendance marking and submission.
2. Teacher cover claims.

Everything else — admissions, marks, fees, salary, notices, reports — is online-only. This is a deliberate scope limit. It keeps sync testable and prevents half-finished conflict handling across the whole ERP.

The Flutter app will move from bundled seed data to Drift/SQLite for the cached roster, timetable, notices, attendance drafts, and a mutation queue. The web console remains online-only.

### D7 — Hosting and data residency

**Default:** DigitalOcean Bangalore (`blr1`) with managed PostgreSQL, managed Redis, and API/worker containers. If the school or government procurement requires AWS, use AWS Mumbai (`ap-south-1`) with RDS, ElastiCache, and S3.

- Data at rest and backups stay in India.
- Object storage is private; downloads use short-lived signed URLs.
- TLS in front of all public endpoints.
- One production region, one staging region, and local Docker for development.
- Backups are encrypted and copied to a second bucket in the same country.

### D8 — Files and reports

- Receipts, report cards, payslips, registers, and exports are generated by a worker using headless Chromium against the same print HTML used by the web console.
- Bengali shaping is verified in Chromium before the first PDF task ships. A PDF generated with a library that does not shape Bengali is not acceptable.
- Generated files are private objects with short-lived signed URLs.
- Uploaded documents: PDF/JPEG/PNG only, size-limited, MIME-sniffed, EXIF-stripped, virus-scanned, stored private.
- No student photograph or guardian document is ever served from a public bucket.

### D9 — Money and time

- All money is integer paise in PostgreSQL. No floating point.
- API money fields are integers named `...Paise`.
- Storage timestamps are `timestamptz` in UTC.
- Business dates (attendance date, fee due date, salary month) are stored as dates and interpreted in `Asia/Kolkata`.
- The API includes an `X-School-Date` response header in staging/demo so testers can reason about "today".

### D10 — Audit

- `audit_events` is append-only. The application database role can insert but not update or delete audit rows.
- Every authentication event, authorization denial, admission decision, attendance submission, correction, result publication, fee payment/waiver, salary transition, cover assignment, notice publication, export, and settings change is audited.
- Audit data includes actor, school, action, entity, before/after (PII-redacted), request ID, IP, and user agent.
- Audit retention is 7 years by default, subject to legal review.

### D11 — Payments

- Phase B6 records cash, UPI reference, cheque, and manual reconciliation.
- A gateway (Razorpay or similar) is a later integration with webhooks and reconciliation. It is not needed to run the school.
- No card data is ever stored.

### D12 — GSD compatibility

The delivery loop follows discuss → plan → execute → verify → ship. If GSD Core is attached to this repository later, this document becomes the source for its project/roadmap artifacts. The backend does not depend on GSD to run.

---

## 3. System context

```
┌────────────────────┐        HTTPS/JSON        ┌─────────────────────────┐
│ Next.js web console│ ───────────────────────▶ │                         │
└────────────────────┘                          │     Baranda API         │
                                                │  NestJS + Fastify       │
┌────────────────────┐        HTTPS/JSON        │                         │
│ Flutter Hazira app │ ───────────────────────▶ │  Auth · RBAC · Audit    │
└────────────────────┘                          │  Attendance · Timetable │
                                                │  Exams · Fees · Salary  │
┌────────────────────┐        HTTPS             │  Reports · Sync         │
│ Admin / monitoring │ ───────────────────────▶ │                         │
└────────────────────┘                          └───────┬─────────┬───────┘
                                                        │         │
                                                ┌───────▼───┐ ┌───▼────────┐
                                                │PostgreSQL │ │ Redis      │
                                                │16         │ │ queues     │
                                                └───────────┘ └────────────┘
                                                        │
                                                ┌───────▼──────────┐
                                                │ Private S3/MinIO │
                                                │ documents, PDFs  │
                                                └──────────────────┘
```

---

## 4. Runtime topology

### Local development

- Docker Compose: PostgreSQL, Redis, MinIO, API, worker.
- API and worker run with hot reload outside Compose if preferred.
- Seed command imports the existing demo seed.
- No cloud credentials required for day-to-day work.

### Staging

- Same containers, separate database and bucket.
- Synthetic demo data only.
- Public test accounts with clearly labelled demo passwords.
- Used for Playwright, Flutter integration, UAT, and restore drills.

### Production

- Managed PostgreSQL with automated daily backups and PITR if available.
- Managed Redis, private network only.
- API and worker containers on one VM or a small app platform.
- Caddy or the platform load balancer for TLS.
- Private object storage.
- Uptime monitor, error tracker, log drain.
- Single API instance initially; a restart is acceptable outside school hours. Horizontal scaling is a later change.

---

## 5. Module map

```
apps/api/src/
  main.ts
  app.module.ts
  config/                 validated environment
  db/                     Drizzle client, schema, migrations
  common/                 errors, request id, pagination, idempotency, time, money
  modules/
    auth/                 login, refresh, MFA, devices, password reset
    school/               school profile, academic years, sections, subjects
    staff/                staff records, assignments, staff attendance, leave
    students/             students, guardians, documents, risk read models
    admissions/           application queue, verification, decision, enrolment
    attendance/           student registers, corrections, submission
    timetable/            weekly timetable, cover desk, substitutions
    exams/                exams, subjects, marks, moderation, results
    fees/                 fee heads, structures, bills, payments, concessions
    salary/               structures, monthly bills, verify/approve/disburse
    notices/              notices and audiences
    analytics/            aggregate read models
    reports/              report jobs and exports
    audit/                append-only audit queries
    sync/                 bootstrap, pull, push, device cursors
    files/                presigned uploads/downloads, scanning
  workers/                PDF, email, exports, cleanup
```

### Shared kernel

| Component | Responsibility |
| --- | --- |
| `config/env.ts` | Fail fast on missing/invalid environment variables |
| `authz` | Policy evaluation, role/assignment scopes |
| `audit` | Transactional audit append |
| `errors` | Problem-details mapping |
| `idempotency` | Key storage and replay |
| `storage` | S3/MinIO interface |
| `queue` | BullMQ producers and worker bootstrap |
| `clock` | UTC now + Asia/Kolkata business date |

---

## 6. Data model

### Common columns

Every school-scoped table has:

- `id uuid` primary key (UUIDv7 generated in the application)
- `school_id uuid not null` references `schools(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `version integer not null default 1`
- `deleted_at timestamptz null` on soft-deletable records

### Identity and access

| Table | Key fields | Constraints |
| --- | --- | --- |
| `schools` | name_en, name_bn, code, udise, address, district, phone, email | code unique |
| `academic_years` | label, start_date, end_date, is_active | one active year per school |
| `users` | staff_id, employee_id, email, phone, password_hash, role, status, mfa_secret_encrypted, mfa_enabled, token_version, failed_login_count, locked_until | employee_id unique per school; email unique when present |
| `staff` | employee_id, name_en, name_bn, designation, phone, email, pay_level, joined_at, status | employee_id unique per school |
| `staff_assignments` | staff_id, type, section_id, subject_id, exam_id | scoped uniqueness per assignment |
| `refresh_tokens` | user_id, device_id, token_hash, family_id, expires_at, rotated_at, revoked_at, ip, user_agent | token_hash unique |
| `devices` | user_id, platform, name, app_version, last_seen_at, revoked_at | one active device row per install |
| `password_reset_tokens` | user_id, token_hash, expires_at, used_at | token_hash unique |
| `mfa_recovery_codes` | user_id, code_hash, used_at | one row per unused code |

### Academic and student records

| Table | Key fields | Constraints |
| --- | --- | --- |
| `sections` | class_level, section, room, capacity, class_teacher_id, academic_year_id | unique `(academic_year_id, class_level, section)` |
| `subjects` | code, name_en, name_bn | code unique per school |
| `students` | admission_no, roll_no, section_id, name_en, name_bn, gender, dob, category, status, avatar_key, admission_date | unique `(section_id, roll_no)`; admission_no unique per school |
| `guardians` | name_en, name_bn, phone, address | phone indexed |
| `student_guardians` | student_id, guardian_id, relationship, is_primary | unique pair |
| `student_documents` | student_id, type, file_id, verified, verified_by | file_id references files |
| `admissions` | application_no, applicant fields, class_applied, status, decision, decided_by, student_id | application_no unique per school |
| `admission_documents` | admission_id, type, file_id, verified | |

### Attendance and timetable

| Table | Key fields | Constraints |
| --- | --- | --- |
| `attendance_records` | student_id, section_id, date, session, status, marked_by, marked_at, source, note | unique `(student_id, date, session)`; section/date index |
| `attendance_registers` | section_id, date, session, status, submitted_by, submitted_at, version | unique `(section_id, date, session)`; submission transaction gate |
| `attendance_corrections` | register_id, student_id, old_status, new_status, reason, requested_by, approved_by | append-only |
| `staff_attendance` | staff_id, date, check_in, check_out, status, note | unique `(staff_id, date)` |
| `leave_requests` | staff_id, from_date, to_date, type, reason, status, approved_by | |
| `timetable_entries` | academic_year_id, day, period, start, end, section_id, subject_id, teacher_id, room | unique `(academic_year_id, day, period, section_id)` |
| `substitutions` | date, day, period, section_id, subject_id, absent_teacher_id, substitute_teacher_id, status, assigned_by, reason | unique `(date, period, section_id)` |

### Examinations

| Table | Key fields | Constraints |
| --- | --- | --- |
| `exams` | name, term, start_date, end_date, status | |
| `exam_subjects` | exam_id, class_level, subject_id, exam_date, max_marks, pass_marks, theory_max, internal_max, practical_max | unique `(exam_id, class_level, subject_id)` |
| `marks` | exam_subject_id, student_id, theory, internal, practical, total, status, entered_by | unique `(exam_subject_id, student_id)`; values bounded by maxima |
| `results` | exam_id, student_id, total, percentage, grade, rank, pass, subjects_failed | materialized after moderation; unique `(exam_id, student_id)` |

### Finance

| Table | Key fields | Constraints |
| --- | --- | --- |
| `fee_heads` | code, name_en, name_bn, frequency | code unique |
| `fee_structures` | academic_year_id, class_level, fee_head_id, amount_paise, due_date | unique `(academic_year_id, class_level, fee_head_id)` |
| `bills` | bill_no, student_id, academic_year_id, period, total_paise, concession_paise, due_paise, status, due_date | bill_no unique; balance derived |
| `bill_items` | bill_id, fee_head_id, name_en, name_bn, amount_paise | append-only |
| `payments` | receipt_no, bill_id, student_id, amount_paise, method, reference, paid_at, collected_by, status | receipt_no unique; void is audited |
| `concessions` | student_id, fee_head_id, type, value, reason, approved_by, valid_from, valid_to | |
| `salary_structures` | staff_id, basic_pay_paise, pay_level, da_percent, hra_percent, medical_paise, other_allowance_paise, standard_deduction_paise, effective_from | one active per staff |
| `salary_bills` | month, year, status, totals, prepared_by, verified_by, approved_by, disbursed_at | unique `(year, month)` |
| `salary_lines` | salary_bill_id, staff_id, payable_days, leave_days, earnings_paise, deductions_paise, net_pay_paise, payslip_no | unique `(salary_bill_id, staff_id)` |

### Platform

| Table | Key fields | Purpose |
| --- | --- | --- |
| `audit_events` | actor_user_id, action, entity_type, entity_id, before jsonb, after jsonb, request_id, ip, user_agent | append-only |
| `files` | owner_type, owner_id, storage_key, mime, size, sha256, scan_status | private objects |
| `report_jobs` | requested_by, type, parameters, status, file_id, error | async PDF/CSV |
| `outbox_events` | type, payload, status, attempts, available_at | reliable side effects |
| `idempotency_keys` | user_id, key, route, request_hash, response_status, response_body, expires_at | unique `(user_id, key)` |
| `sync_changes` | school_id, entity_type, entity_id, operation, version, changed_at | cursor feed |
| `sync_operations` | device_id, mutation_id, result, applied_at | unique `(device_id, mutation_id)` |

### Example Drizzle schema

```ts
// apps/api/src/db/schema/identity.ts
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { schools } from "./school";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    employeeId: text("employee_id").notNull(),
    email: text("email"),
    passwordHash: text("password_hash").notNull(),
    role: text("role", {
      enum: ["headmaster", "teacher", "clerk", "management"],
    }).notNull(),
    status: text("status", { enum: ["active", "disabled"] }).notNull(),
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),
    mfaSecretEncrypted: text("mfa_secret_encrypted"),
    tokenVersion: integer("token_version").notNull().default(1),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    employeeUnique: uniqueIndex("users_school_employee_uq").on(
      table.schoolId,
      table.employeeId,
    ),
  }),
);
```

### Indexes that matter

- `attendance_records (school_id, date, section_id)`
- `attendance_records (student_id, date)`
- `timetable_entries (school_id, day, period)`
- `substitutions (school_id, date, period, section_id)`
- `marks (student_id, exam_subject_id)`
- `bills (school_id, student_id, due_date, status)`
- `payments (bill_id, status)`
- `audit_events (school_id, created_at desc)`
- `sync_changes (school_id, seq)`
- `students (school_id, section_id, roll_no)`
- `staff_assignments (staff_id, type)`

All indexes are created in reviewed migrations, not ad hoc in application code.

---

## 7. Authorization model

### Sign-in roles

| Role | Scope |
| --- | --- |
| Headmaster | Whole school |
| Teacher | Own staff record and assigned sections/subjects; cover classes |
| Clerk | Whole-school operations, fee collection, records; no result publication |
| Management | Aggregate only; no student-level PII |

Assistant Headmaster is a staff assignment, not a new sign-in role. It grants cover-desk management without Headmaster approval, fee, or salary powers.

### Policy order

1. Authenticate the access token.
2. Confirm the user and school are active.
3. Load role and assignment scopes.
4. Check the required permission for the operation.
5. Apply the row scope: school, section, own record, or aggregate.
6. Apply field-level redaction for management and exports.
7. Write the audit event for the attempt when the operation mutates data.

### Examples

- Teacher may read students only in sections where they hold a class-teacher or subject-teacher assignment, or where they are the substitute for today.
- Teacher may submit attendance only for an assigned section or today's covered section.
- Teacher may claim a cover class only if free in that period and not absent.
- Clerk may collect a fee payment but cannot approve a salary bill.
- Management may see aggregate attendance but not a named student's record.
- Headmaster can do everything except bypass the audit log.

Authorization is implemented in a `PolicyService` with unit tests for every role and assignment. Response DTOs are separate from database rows so an accidental `select *` cannot leak a guardian phone number to management.

---

## 8. API surface

| Area | Key endpoints |
| --- | --- |
| Auth | `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `GET /v1/auth/me`, `POST /v1/auth/mfa/enroll`, `POST /v1/auth/mfa/verify`, `GET /v1/auth/devices`, `DELETE /v1/auth/devices/:id` |
| School | `GET /v1/school`, `PATCH /v1/school`, `GET/POST /v1/academic-years`, `GET/POST /v1/sections`, `GET/POST /v1/subjects` |
| Staff | `GET/POST /v1/staff`, `GET/PATCH /v1/staff/:id`, `GET/POST /v1/staff/:id/assignments`, `GET /v1/staff-attendance`, `POST /v1/staff-attendance`, `GET/POST /v1/leave-requests`, `POST /v1/leave-requests/:id/approve` |
| Students | `GET/POST /v1/students`, `GET/PATCH /v1/students/:id`, `GET /v1/students/:id/attendance`, `GET /v1/students/:id/results`, `GET /v1/students/:id/fees` |
| Admissions | `GET/POST /v1/admissions`, `GET/PATCH /v1/admissions/:id`, `POST /v1/admissions/:id/verify`, `POST /v1/admissions/:id/decide`, `POST /v1/admissions/:id/enrol` |
| Attendance | `GET /v1/attendance/registers?date=&sectionId=`, `POST /v1/attendance/registers/:id/submit`, `POST /v1/attendance/corrections`, `POST /v1/attendance/corrections/:id/approve` |
| Timetable | `GET /v1/timetable?day=&sectionId=`, `GET /v1/cover/uncovered?date=`, `GET /v1/cover/free-teachers?date=&period=`, `POST /v1/substitutions`, `POST /v1/substitutions/:id/claim`, `POST /v1/substitutions/:id/complete` |
| Exams | `GET/POST /v1/exams`, `GET/POST /v1/exams/:id/subjects`, `PUT /v1/exam-subjects/:id/marks`, `POST /v1/exams/:id/moderate`, `POST /v1/exams/:id/publish`, `GET /v1/exams/:id/results` |
| Fees | `GET/POST /v1/fee-heads`, `GET/POST /v1/fee-structures`, `GET/POST /v1/bills`, `POST /v1/bills/:id/payments`, `POST /v1/payments/:id/void`, `GET/POST /v1/concessions` |
| Salary | `GET/POST /v1/salary-structures`, `GET/POST /v1/salary-bills`, `POST /v1/salary-bills/:id/verify`, `POST /v1/salary-bills/:id/approve`, `POST /v1/salary-bills/:id/disburse`, `GET /v1/salary-lines/:id/payslip` |
| Notices | `GET/POST /v1/notices`, `POST /v1/notices/:id/publish` |
| Analytics | `GET /v1/analytics/school`, `GET /v1/analytics/students/:id`, `GET /v1/analytics/risk` |
| Reports | `POST /v1/reports`, `GET /v1/reports/:id`, `GET /v1/reports/:id/download` |
| Audit | `GET /v1/audit` |
| Sync | `POST /v1/devices`, `GET /v1/sync/bootstrap`, `GET /v1/sync/pull?cursor=`, `POST /v1/sync/push` |
| Files | `POST /v1/files/presign`, `POST /v1/files/:id/complete`, `GET /v1/files/:id/download` |
| Health | `GET /health/live`, `GET /health/ready` |

### Error shape

```json
{
  "type": "https://api.baranda.school/errors/validation",
  "title": "Validation failed",
  "status": 422,
  "code": "VALIDATION_FAILED",
  "detail": "The attendance register contains an unknown student.",
  "requestId": "req_01J...",
  "errors": [
    { "path": "records[4].studentId", "message": "Unknown student" }
  ]
}
```

### Attendance submission

```json
{
  "clientMutationId": "3a9f...",
  "registerVersion": 4,
  "records": [
    { "studentId": "uuid", "status": "present" },
    { "studentId": "uuid", "status": "absent", "note": "No response" }
  ]
}
```

The server validates the section, date, student membership, uniqueness, and permissions in one transaction. It writes the register and audit event atomically.

### Cover assignment

```json
{
  "date": "2026-10-31",
  "period": 4,
  "sectionId": "uuid",
  "substituteTeacherId": "uuid"
}
```

The server re-checks that the period is uncovered, the substitute is free, and the actor has Headmaster or Assistant Headmaster authority. The unique `(date, period, section_id)` constraint makes concurrent double assignment impossible.

---

## 9. Offline sync protocol

### Bootstrap

`GET /v1/sync/bootstrap` returns the teacher's profile, assigned sections, students for those sections, today's timetable, active notices, current cover board, and a cursor. The app stores these in Drift.

### Pull

`GET /v1/sync/pull?cursor=...` returns changes since the cursor for the teacher's visible scope, plus the next cursor. Changes cover student records in assigned sections, notices, timetable, and substitutions.

### Push

`POST /v1/sync/push` accepts a batch of mutations:

```json
{
  "deviceId": "uuid",
  "operations": [
    {
      "mutationId": "uuid",
      "type": "attendance.submit",
      "registerId": "uuid",
      "baseVersion": 4,
      "records": [
        { "studentId": "uuid", "status": "present" }
      ]
    }
  ]
}
```

Each operation is recorded in `sync_operations` keyed by `(device_id, mutation_id)`. A replay returns the original result. The client applies per-operation results and keeps failed drafts for a visible retry/conflict state.

### Conflict policy

- **Attendance:** one register per section/date/session. If `baseVersion` is stale, return `409` with the server register; the app keeps the local draft and shows a conflict for the teacher to resolve.
- **Cover claim:** if the period is already assigned, return `409` with the assigned substitute; the app refreshes the cover board.
- **Everything else:** online only.

The app never silently discards a mark. Failed sync operations remain visible in the app until accepted or explicitly resolved.

---

## 10. Security and privacy

### Controls

- TLS 1.2+ everywhere; HSTS.
- Argon2id with per-user salt, tuned cost, verified on login.
- JWT signed with an asymmetric key or a 256-bit secret held in the environment; short access lifetime.
- Refresh-token hashing and rotation with reuse detection.
- TOTP MFA for Headmaster and Clerk; recovery code rotation.
- Password policy: minimum 12 characters or a passphrase; breached-password check can be added later; no forced periodic rotation.
- Login rate limiting per account and IP; lockout after repeated failures.
- CSRF protection for cookie-authenticated mutating routes; CORS allowlist for the web origin.
- Strict validation on every request; no trust in client-provided school, role, or scope.
- Parameterized queries through Drizzle; no string-built SQL with user input.
- File upload MIME sniffing, extension allowlist, size limits, virus scan, EXIF strip, private storage.
- Signed URLs expire in five minutes.
- Secrets never in the repository; `.env.example` only.
- Security headers via Fastify Helmet.
- Dependency scanning and secret scanning in CI.
- No PII in application logs; request bodies are not logged by default.
- Error responses do not reveal whether an employee ID exists.

### Privacy

- DPDP Act 2023 posture: purpose limitation, data minimization, guardian consent for minors, retention schedule, correction/deletion process, breach playbook, and a published privacy notice.
- Management sees aggregates only. Query projections and DTOs are separate from raw rows.
- Documents and photographs are private objects.
- Audit records contain redacted before/after values.
- Retention: defaults are 7 years after a student leaves or a staff member exits, subject to West Bengal record rules and legal review. Audit and financial records follow statutory retention.
- Backups are encrypted, access-controlled, and restored only in audited drills.
- Data residency: primary database, object storage, and backups remain in India.

### RLS as defense in depth

Application authorization is the first line. In B2, add PostgreSQL row-level security for school-scoped tables using a transaction-local `app.school_id` setting and a restricted application role. Tests attempt a cross-school read and must receive zero rows. RLS is a safety net, not a replacement for policy tests.

---

## 11. Reliability and observability

### Async work

- BullMQ queues for PDFs, CSV exports, email, and cleanup.
- Transactional outbox for side effects that must survive a crash.
- Retries with exponential backoff and a dead-letter queue.
- Report jobs expose status and a signed download when ready.
- No long PDF generation inside an HTTP request.

### Health and metrics

- `/health/live` checks the process.
- `/health/ready` checks database and Redis connectivity.
- Structured logs with request ID, route, status, latency, actor, and school, with PII scrubbed.
- Metrics: request latency, error rate, queue depth, sync failures, login failures, backup status.
- Alerts: API down, error rate above threshold, database connection exhaustion, queue backlog, backup failure, certificate expiry.

### Backup and recovery

- Managed PostgreSQL daily backups plus PITR where offered.
- Nightly encrypted logical dump to a second India bucket.
- 30 daily, 12 monthly retention.
- Restore drill every quarter into staging.
- Target RPO: 15 minutes with PITR, 24 hours without. Target RTO: 4 hours.
- Documented runbook with exact commands and ownership.

### Performance targets

| Operation | Target |
| --- | --- |
| Read API p95 | under 300 ms in India |
| Write API p95 | under 500 ms |
| Attendance register load (50 students) | under 500 ms |
| Attendance submit | under 1 s |
| Sync push (one register) | under 2 s |
| Report PDF | under 30 s, asynchronous |
| Availability | 99.5% monthly initially |

The data volume is small: 480 students and about 220 attendance days per year. PostgreSQL is comfortably sufficient.

---

## 12. Testing strategy

- **Unit:** domain rules, money math, authorization policy, attendance/cover conflict rules, salary calculations.
- **Integration:** real PostgreSQL and Redis via Testcontainers; migrations applied from zero; API tests with Supertest.
- **Contract:** OpenAPI snapshot; generated web types; no hand-written client drift.
- **E2E:** Playwright web flows and Flutter integration against staging.
- **Security:** unauthorized route matrix, cross-school access, IDOR, file upload abuse, rate limits; OWASP ZAP baseline.
- **Migration:** empty DB → all migrations → seed; rollback/recovery procedure documented.
- **Load:** 50 concurrent attendance submits, 100 concurrent reads, report generation queue.
- **Restore:** nightly backup restored into staging on a schedule; result recorded.

No module is considered complete until its policy tests and audit tests pass.

---

## 13. Delivery phases

Each phase is independently shippable. The local demo remains available until its module is migrated.

| Phase | Deliverable | Estimate |
| --- | --- | --- |
| **B0** | This architecture, decisions, and B1 plan | 1 day |
| **B1** | API foundation: repo, config, Postgres, Drizzle, auth, MFA, RBAC, audit, seed, CI, Docker, health | 8–10 days |
| **B2** | School, staff, sections, subjects, students, guardians, admissions, files; web remote reads | 10–12 days |
| **B3** | Attendance, staff attendance, leave, corrections, Flutter Drift + sync | 10–12 days |
| **B4** | Timetable, cover desk, substitutions, free-teacher suggestions | 5–7 days |
| **B5** | Exams, marks, moderation, results, report cards | 8–10 days |
| **B6** | Fees, bills, payments, receipts, concessions | 8–10 days |
| **B7** | Salary structures, bills, verify/approve/disburse, payslips | 5–7 days |
| **B8** | Notices, analytics, reports/exports, settings, audit UI | 10–12 days |
| **B9** | Production hardening, import, UAT, go-live, backup drill | 5–7 days |

Total: about 11–14 working weeks for a solo developer using AI assistance, excluding school-side UAT delays.

### Phase gates

- **B1 gate:** API runs locally and in staging; login/refresh/logout/MFA work; RBAC tests cover every role; audit writes; seed imports; CI green; health checks pass.
- **B2 gate:** Web can read staff, students, sections, admissions from the API in remote mode; no PII leaks to management; documents upload privately.
- **B3 gate:** Teacher can submit attendance offline, sync, and resolve a conflict; no duplicate or lost marks; web register reads the same data.
- **B4 gate:** Headmaster/AHM can assign cover, teacher can claim, register unlocks, every step audited.
- **B5 gate:** Marks, results, and PDF report cards agree with the spec; publication is irreversible except by audit.
- **B6 gate:** Fee totals, concessions, payments, receipts, and idempotent retries are correct.
- **B7 gate:** Salary totals, approvals, disbursement, and payslips are correct and immutable after approval.
- **B8 gate:** Management sees aggregates only; exports are permissioned and audited; backup/restore tested.
- **B9 gate:** UAT signed off; restore drill passed; monitoring alerts fired correctly; runbooks complete.

---

## 14. Migration and rollout

1. Keep the local demo store behind `DATA_SOURCE=demo`.
2. Add `DATA_SOURCE=api` for the remote backend.
3. Import the existing seed into staging on day one of B1 so screens look familiar.
4. Switch web routes to the API module by module: auth first, then staff/students, attendance, timetable, exams, fees, salary, notices/analytics.
5. Add a remote login path to Flutter in B3; keep offline attendance in Drift.
6. Do not delete the local demo path until the remote path has passed UAT.
7. Production starts from a clean database with the real school profile, staff, sections, and students imported once; no demo records.

### Rollback

- Keep the previous API image and database migration version.
- Deploy migrations separately; never auto-migrate API containers.
- Feature flags per module allow the web to read from demo/local if an API module is unhealthy.
- Database backups are taken before every schema migration.

---

## 15. Cost estimate

For a single school in an India region:

| Item | Monthly estimate |
| --- | --- |
| API/worker VM | $12–24 |
| Managed PostgreSQL | $15–25 |
| Managed Redis | $10–15 |
| Object storage + backup | $3–8 |
| Domain/TLS | negligible |
| Error tracking/monitoring | free–$10 |
| Email | negligible initially |
| **Total** | **$40–80/month** |

SMS and a payment gateway are added only when used.

---

## 16. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Backend scope is large | Phase gates; ship B1/B2 first; do not parallelize unfinished modules |
| Offline sync becomes a second app | Limit offline to attendance and cover claims |
| Bengali PDFs break | Prove Chromium PDF output early in B5 with the real font |
| PII leak | DTO separation, policy tests, management aggregate views, audit |
| Hosting not compliant | India region; DPA with provider; encryption; documented retention |
| Single developer bus factor | Runbooks, ADRs, backups, seed/recovery automation |
| Migration destroys demo | Keep demo mode; import seed to staging; no destructive clean |
| Concurrent cover assignment | Unique constraints and 409 conflict responses |
| Financial mistakes | Integer paise, derived balances, idempotent payments, reconciliation report |
| Government procurement | Keep deployment portable; export adapters instead of direct coupling |

---

## 17. Open decisions for approval

1. **Stack:** NestJS + Fastify + Drizzle + PostgreSQL + Redis. Recommended.
2. **Hosting:** DigitalOcean Bangalore; AWS Mumbai only if procurement requires it. Recommended.
3. **Tenancy:** single-school deployment with multi-school-ready schema. Recommended.
4. **MFA:** mandatory for Headmaster and Clerk, optional for other staff. Recommended.
5. **Payments:** manual recording first; gateway later. Recommended.
6. **Retention:** 7 years default, subject to legal review. Recommended.
7. **Offline scope:** attendance and cover claims only. Recommended.
8. **Email provider:** school SMTP or Resend; confirm before B1 password-reset work.
9. **Approval to write the B1 execution plan and begin B1 implementation.**

---

## 18. Approval

Once the decisions above are approved, the next action is the B1 foundation plan:

`docs/superpowers/plans/2026-10-31-backend-foundation.md`

No backend code will be written before that approval.
