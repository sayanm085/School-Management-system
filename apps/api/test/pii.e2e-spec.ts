// apps/api/test/pii.e2e-spec.ts
//
// Design §3.2 (permission matrix) and §3.3 (privacy boundary) as an executable
// lock over every B2a read route. Later milestones (attendance, exams, fees,
// exports) all add endpoints that touch student PII; this file is what catches
// a widened projection or a slipped permission at the moment it happens.
//
// Three rules govern every assertion here:
//
//  1. A boundary guard that passes because the payload was empty proves
//     nothing. Each negative assertion sits next to a positive one that first
//     proves the seeded row really is in the response (brief Corrections 1
//     and 2).
//  2. If this file goes red, the projection or the permission check is wrong.
//     Fix the service, never the assertion — unless the comment at that
//     assertion says it is a wire-shape tripwire, which a maintainer widening
//     the contract is expected to widen too.
//  3. No assertion may depend on which test in this file ran first. A test
//     either reads what beforeAll seeded or creates its own state; vitest can
//     shuffle this file without changing a single result. (Rule 3 is fix
//     round 2 item 4: round 0 broke it, see the audit-boundary note below.)
//
// PII discipline: the phone, address and date below are synthetic values
// invented for this file. Nothing here comes from apps/web/src/data/seed.json,
// and no failure message prints a whole response body.
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { hashPassword } from "../src/common/security/password-hash";
import { createTestApp, type TestApp, type TestResponse } from "./app";
import {
  seedAssignment,
  seedGuardian,
  seedSchool,
  seedSection,
  seedStaffUser,
  seedStudent,
  seedSubject,
} from "./fixtures";

const SCHOOL_A = "WB-PII-01";
const SCHOOL_B = "WB-PII-02";
const PASSWORD = "demo1234";

const PHONE = "9012345678";
const OTHER_PHONE = "9123456789";
const ADDRESS = "House 7, Kalitala, Nabagram";
const DOB = "2016-03-14";
const STUDENT_NAME = "Boundary Child";

/**
 * Keys a roster row must never carry. A student list row is an entry point —
 * name, roll, class, status, version — not a record; birth and contact data
 * live on the detail route only. Checked at any depth, so a leak that arrives
 * as a nested `guardians: [{ phone }]` is caught by the same set.
 */
const FORBIDDEN_ROW_KEYS = [
  "dob",
  "address",
  "guardians",
  "guardianPhone",
  "phone",
] as const;

let context: TestApp;
let schoolAId: string;
let academicYearAId: string;
let sectionAId: string;
let subjectAId: string;
let studentAId: string;
let schoolBId: string;
let studentBId: string;

/** Whole-school readers of school A. */
let headmasterA: string;
let clerkA: string;
/** Aggregate-only reader: no `students.view`, no `staff.view`. */
let managementA: string;
/** Teacher holding a `class_teacher` assignment on the student's section. */
let classTeacherA: string;
/** Teacher with no assignment at all, for the empty-roster case. */
let floatingTeacherA: string;
/** The other tenant's whole-school reader. */
let headmasterB: string;

type Row = Record<string, unknown>;

async function tokenFor(schoolCode: string, employeeId: string): Promise<string> {
  const response = await context.request({
    method: "POST",
    url: "/v1/auth/login",
    payload: { schoolCode, employeeId, password: PASSWORD },
  });
  expect(response.statusCode).toBe(200);
  return response.json().accessToken as string;
}

async function get(url: string, token?: string): Promise<TestResponse> {
  return context.request({
    method: "GET",
    url,
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
}

function pageOf(response: TestResponse): Row[] {
  return (response.json().data as Row[]) ?? [];
}

function idsOf(rows: Row[]): string[] {
  return rows.map((row) => row.id as string);
}

/** Collects every forbidden key anywhere in the payload, nested included. */
function forbiddenKeysIn(value: unknown): string[] {
  const found = new Set<string>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === "object") {
      for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
        if ((FORBIDDEN_ROW_KEYS as readonly string[]).includes(key)) found.add(key);
        walk(child);
      }
    }
  };
  walk(value);
  return [...found].sort();
}

/**
 * The roster guard. The key-set check is the durable one; the substring checks
 * are a cheap catch-all for the same data smuggled out under another name.
 * With one student and `limit=100` there is no cursor, so a base64url
 * `nextCursor` cannot produce a chance match — the assertions below say so.
 */
function expectRosterIsClean(payload: unknown, label: string): void {
  expect(forbiddenKeysIn(payload), `${label}: forbidden keys`).toEqual([]);
  const body = JSON.stringify(payload);
  for (const secret of [PHONE, OTHER_PHONE, ADDRESS, DOB]) {
    expect(body, `${label}: ${secret.slice(0, 4)}… leaked`).not.toContain(secret);
  }
  for (const key of ['"dob"', '"address"', '"guardians"']) {
    expect(body, `${label}: ${key} present`).not.toContain(key);
  }
}

/**
 * Fix round 2 item 2 — LOAD-BEARING structural lock on the audit wire row.
 *
 * `toWire` (src/modules/audit/audit.controller.ts:68-82) gates its payload
 * column-by-column: `before: withDiff ? ... : null`. So every column added to
 * it later is ungated by default, and the exact-key-set assertion this helper
 * sits next to is satisfied by appending the new key to `AUDIT_ROW_KEYS` —
 * which would ship a wide-open JSON column. A payload is *carried* by a
 * structure, so the property that keeps holding as the contract widens is: for
 * a reader without `students.view`, no field of any returned audit row is an
 * object or an array. Everything must be scalar or `null`.
 *
 * This fails loudly, with a privacy-flavoured message, on the day somebody
 * adds an ungated `jsonb` column. Update the key list freely; do not update
 * this.
 */
function expectAuditPayloadColumnsAreScalar(rows: Row[], label: string): void {
  for (const [index, row] of rows.entries()) {
    for (const [key, value] of Object.entries(row)) {
      const scalarOrNothing =
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean";
      expect(
        scalarOrNothing,
        `${label}: audit column "${key}" carries a structure for a reader without students.view — a new payload-shaped column must be gated at audit.controller.ts:60 before it ships`,
      ).toBe(true);
      expect(
        Array.isArray(value),
        `${label}: audit column "${key}" is an array for a reader without students.view`,
      ).toBe(false);
    }
    // Every row is inspected, so a page of `[]` proves nothing (file rule 1).
    expect(Object.keys(row).length, `${label}: row ${index} has columns`).toBeGreaterThan(0);
  }
}

beforeAll(async () => {
  context = await createTestApp();
  const passwordHash = await hashPassword(PASSWORD);

  const schoolA = await seedSchool(context.db, SCHOOL_A);
  schoolAId = schoolA.schoolId;
  academicYearAId = schoolA.academicYearId;
  sectionAId = await seedSection(context.db, {
    schoolId: schoolAId,
    academicYearId: schoolA.academicYearId,
    classLevel: "VIII",
    section: "B",
  });
  subjectAId = await seedSubject(context.db, { schoolId: schoolAId, code: "HIN" });
  studentAId = (
    await seedStudent(context.db, {
      schoolId: schoolAId,
      sectionId: sectionAId,
      admissionNo: "NUV-PII-0001",
      rollNo: "01",
      nameEn: STUDENT_NAME,
      dob: DOB,
      address: ADDRESS,
    })
  ).id;
  await seedGuardian(context.db, {
    schoolId: schoolAId,
    studentId: studentAId,
    nameEn: "Boundary Guardian",
    phone: PHONE,
    relationship: "guardian",
    isPrimary: true,
  });

  headmasterA = (
    await seedStaffUser(context.db, {
      schoolId: schoolAId,
      employeeId: "HM-PII-01",
      role: "headmaster",
      passwordHash,
    })
  ).employeeId;
  clerkA = (
    await seedStaffUser(context.db, {
      schoolId: schoolAId,
      employeeId: "CLK-PII-01",
      role: "clerk",
      passwordHash,
    })
  ).employeeId;
  managementA = (
    await seedStaffUser(context.db, {
      schoolId: schoolAId,
      employeeId: "MC-PII-01",
      role: "management",
      passwordHash,
    })
  ).employeeId;
  const assigned = await seedStaffUser(context.db, {
    schoolId: schoolAId,
    employeeId: "TCH-PII-01",
    role: "teacher",
    passwordHash,
  });
  classTeacherA = assigned.employeeId;
  // The assignment is what makes this teacher's roster non-empty. Without it
  // `GET /v1/students` answers `[]` for a teacher and every negative
  // assertion in this file would pass without proving anything.
  await seedAssignment(context.db, {
    schoolId: schoolAId,
    staffId: assigned.staffId,
    type: "class_teacher",
    sectionId: sectionAId,
  });
  floatingTeacherA = (
    await seedStaffUser(context.db, {
      schoolId: schoolAId,
      employeeId: "TCH-PII-02",
      role: "teacher",
      passwordHash,
    })
  ).employeeId;

  // A second tenant with its own student and its own PII, so a cross-school
  // assertion can tell "scoped away" apart from "broken".
  const schoolB = await seedSchool(context.db, SCHOOL_B);
  schoolBId = schoolB.schoolId;
  const sectionBId = await seedSection(context.db, {
    schoolId: schoolBId,
    academicYearId: schoolB.academicYearId,
    classLevel: "VIII",
    section: "C",
  });
  studentBId = (
    await seedStudent(context.db, {
      schoolId: schoolBId,
      sectionId: sectionBId,
      admissionNo: "NUV-PII-0101",
      rollNo: "01",
      nameEn: "Other School Child",
      dob: "2015-11-02",
      address: "House 2, Bankura Bazar",
    })
  ).id;
  await seedGuardian(context.db, {
    schoolId: schoolBId,
    studentId: studentBId,
    nameEn: "Other School Guardian",
    phone: OTHER_PHONE,
  });
  headmasterB = (
    await seedStaffUser(context.db, {
      schoolId: schoolBId,
      employeeId: "HM-PII-02",
      role: "headmaster",
      passwordHash,
    })
  ).employeeId;
});

afterAll(async () => {
  await context.close();
});

/** Every student-level and aggregate route, for the uniform-refusal case. */
function allRoutes(): string[] {
  return [
    "/v1/students?limit=100",
    `/v1/students/${studentAId}`,
    `/v1/students/${studentAId}/guardians`,
    "/v1/staff?limit=100",
    "/v1/school",
    "/v1/academic-years?limit=100",
    "/v1/sections?limit=100",
    "/v1/subjects?limit=100",
    "/v1/audit?limit=100",
  ];
}

test("management is refused on every student-level route", async () => {
  const token = await tokenFor(SCHOOL_A, managementA);

  const studentRoutes = [
    "/v1/students?limit=100",
    `/v1/students/${studentAId}`,
    `/v1/students/${studentAId}/guardians`,
  ];
  for (const url of studentRoutes) {
    const response = await get(url, token);
    expect(response.statusCode, url).toBe(403);
    expect(response.json().code, url).toBe("FORBIDDEN");
    // The refusal names the permission it is missing, which proves it came
    // from the guard rather than from an unrelated 4xx on the way in.
    expect(response.json().required, url).toContain("students.view");
    // A refusal must not carry the payload it refused.
    const body = JSON.stringify(response.json());
    expect(body, url).not.toContain(PHONE);
    expect(body, url).not.toContain(ADDRESS);
  }

  const staff = await get("/v1/staff?limit=100", token);
  expect(staff.statusCode).toBe(403);
  expect(staff.json().required).toContain("staff.view");
  expect(JSON.stringify(staff.json())).not.toContain(PHONE);
});

test("management still reaches the aggregate-safe routes", async () => {
  const token = await tokenFor(SCHOOL_A, managementA);

  const school = await get("/v1/school", token);
  expect(school.statusCode).toBe(200);
  expect(school.json()).toMatchObject({ id: schoolAId, code: SCHOOL_A });
  // The school's own landline is not student PII, so only the student values
  // are checked against this payload.
  expect(JSON.stringify(school.json())).not.toContain(PHONE);

  const sections = pageOf(await get("/v1/sections?limit=100", token));
  expect(idsOf(sections), "section list carries the seeded section").toContain(sectionAId);
  expect(JSON.stringify(sections)).not.toContain(PHONE);

  const subjects = pageOf(await get("/v1/subjects?limit=100", token));
  expect(idsOf(subjects), "subject list carries the seeded subject").toContain(subjectAId);
  expect(JSON.stringify(subjects)).not.toContain(PHONE);

  // Fix round 2 item 5: this route is `dashboard.view`, so it is
  // management-reachable and it belonged in the sweep the round-1 brief
  // claimed to have covered. Static answer (school.service.ts:522-530) is an
  // allow-listed projection — label, two dates, isActive — and this asserts
  // that stays true instead of leaving the conclusion unguarded.
  const years = pageOf(await get("/v1/academic-years?limit=100", token));
  expect(idsOf(years), "year list carries the seeded year").toContain(academicYearAId);
  expectRosterIsClean(years, "management academic-years list");

  const audit = pageOf(await get("/v1/audit?limit=100", token));
  // Non-empty on its own terms: every sign-in appends an `auth.login` row into
  // this reader's own school, so this guard reads real rows regardless of
  // whether any other test in this file has run (file rule 3).
  expect(audit.length, "audit feed is not empty").toBeGreaterThan(0);
  // The boundary for this reader is the PAYLOAD, not the row. Round 0 asserted
  // "no audit row is about the student record", which fix round 1 made both
  // false and beside the point: management holds `audit.view`, so a clerk's
  // amendment legitimately appears here with `entityId` = that student — the
  // ledger is exactly what §3.2 promises. What must never appear is the diff.
  // Asserting the payload keeps this assertion true before and after the
  // amendment, so the file has no order dependence left in it.
  for (const row of audit) {
    expect(row.before, "no diff payload for a reader without students.view").toBeNull();
    expect(row.after, "no diff payload for a reader without students.view").toBeNull();
  }
  expectAuditPayloadColumnsAreScalar(audit, "management audit feed");
  expectRosterIsClean(audit, "management audit feed");
});

test("no student list response carries contact or birth data", async () => {
  const readers: [string, string][] = [
    ["headmaster", headmasterA],
    ["clerk", clerkA],
    ["assigned class teacher", classTeacherA],
  ];

  for (const [label, employeeId] of readers) {
    const token = await tokenFor(SCHOOL_A, employeeId);
    const response = await get("/v1/students?limit=100", token);
    expect(response.statusCode, label).toBe(200);
    const data = pageOf(response);

    // Positive pairing first: the student really is in the roster this reader
    // got back, so the guard below has something to guard.
    expect(idsOf(data), `${label}: sees the student`).toContain(studentAId);
    const row = data.find((entry) => entry.id === studentAId) as Row;
    expect(row.nameEn, `${label}: row is the seeded student`).toBe(STUDENT_NAME);
    expect(row.classLabel).toBe("VIII B");

    // With one student and limit=100 the page has no cursor, so the substring
    // guards above cannot be tripped by a chance base64url match.
    expect(response.json().nextCursor, label).toBeNull();
    expectRosterIsClean(data, label);
  }
});

test("only the detail routes give a permitted reader the guardian phone", async () => {
  const token = await tokenFor(SCHOOL_A, headmasterA);

  // §3.3 bars *management* from guardian phones; it says nothing about the
  // school's own readers, and no masking exists anywhere in src/ — masking is
  // a web-demo presentation concern. So the headmaster, who is the full-school
  // reader, is expected to see the real number on the record route.
  const detail = await get(`/v1/students/${studentAId}`, token);
  expect(detail.statusCode).toBe(200);
  const student = detail.json() as Row;
  expect(student.id).toBe(studentAId);
  expect(student.dob).toBe(DOB);
  expect(student.address).toBe(ADDRESS);
  const guardians = student.guardians as Row[];
  expect(guardians, "detail carries the linked guardians").toHaveLength(1);
  expect(guardians[0]).toMatchObject({ phone: PHONE, relationship: "guardian" });

  const guardianRoute = await get(`/v1/students/${studentAId}/guardians`, token);
  expect(guardianRoute.statusCode).toBe(200);
  expect(pageOf(guardianRoute).map((row) => row.phone)).toContain(PHONE);

  // The same reader on the same student, one route earlier, still gets a
  // roster row with nothing behind it.
  const list = await get("/v1/students?limit=100", token);
  expect(idsOf(pageOf(list))).toContain(studentAId);
  expectRosterIsClean(pageOf(list), "headmaster roster");
});

test("an unauthenticated caller gets one uniform answer for every route", async () => {
  const statuses: number[] = [];
  for (const url of allRoutes()) {
    const response = await get(url);
    statuses.push(response.statusCode);
    expect(response.statusCode, url).toBe(401);
    expect(response.json().code, url).toBe("AUTH_REQUIRED");
    expect(JSON.stringify(response.json()), url).not.toContain(PHONE);
  }
  expect([...new Set(statuses)]).toEqual([401]);
});

test("a second school cannot see the first school's rows", async () => {
  const token = await tokenFor(SCHOOL_B, headmasterB);

  const list = await get("/v1/students?limit=100", token);
  expect(list.statusCode).toBe(200);
  const data = pageOf(list);
  // Positive pairing: this tenant's own roster is not empty, so the absence
  // of school A below is scoping and not a broken query.
  expect(idsOf(data), "sees its own student").toContain(studentBId);
  expect(idsOf(data), "never sees the other school's student").not.toContain(studentAId);
  expectRosterIsClean(data, "school B roster");

  const school = await get("/v1/school", token);
  expect(school.statusCode).toBe(200);
  expect(school.json()).toMatchObject({ id: schoolBId, code: SCHOOL_B });

  // NOTE: this feed is not empty — the headmaster's own sign-in is audited
  // into their school, so the boundary is that nothing in it is about the
  // other tenant's student.
  const audit = pageOf(await get("/v1/audit?limit=100", token));
  expect(audit.length, "own audit feed exists").toBeGreaterThan(0);
  for (const row of audit) {
    expect(row.entityId, "no row about the foreign student").not.toBe(studentAId);
    expect(row.entityType, "no student-level row").not.toBe("student");
  }
  expect(JSON.stringify(audit)).not.toContain(PHONE);
  expect(JSON.stringify(audit)).not.toContain(ADDRESS);

  // Borrowing a foreign id is a 404 — not a 403, and not the row.
  const detail = await get(`/v1/students/${studentAId}`, token);
  expect(detail.statusCode).toBe(404);
  expect(detail.json().code).toBe("NOT_FOUND");
  expect(JSON.stringify(detail.json())).not.toContain(PHONE);

  const guardians = await get(`/v1/students/${studentAId}/guardians`, token);
  expect(guardians.statusCode).toBe(404);
  expect(JSON.stringify(guardians.json())).not.toContain(PHONE);
});

test("a teacher with no section assignments gets an empty roster", async () => {
  const token = await tokenFor(SCHOOL_A, floatingTeacherA);

  const list = await get("/v1/students?limit=100", token);
  expect(list.statusCode).toBe(200);
  expect(list.json().data).toEqual([]);
  expect(list.json().nextCursor).toBeNull();

  // The emptiness is the missing assignment, not a dead route: the same
  // account is refused when it names the section it is not assigned to, and
  // the roster test proves the *assigned* teacher (TCH-PII-01) does see this
  // section. Independent of which of these tests runs first.
  const scoped = await get(`/v1/students?sectionId=${sectionAId}&limit=100`, token);
  expect(scoped.statusCode).toBe(403);

  const detail = await get(`/v1/students/${studentAId}`, token);
  expect(detail.statusCode).toBe(403);
  expect(JSON.stringify(detail.json())).not.toContain(PHONE);

  const guardians = await get(`/v1/students/${studentAId}/guardians`, token);
  expect(guardians.statusCode).toBe(403);
  expect(JSON.stringify(guardians.json())).not.toContain(PHONE);
});

// ---------------------------------------------------------------------------
// Fix round 1 — the audit-feed diff gate.
//
// A student amendment stores the editor's FULL detail projection as the audit
// event's `before` (src/modules/students/student.service.ts:257, appended at
// :288-297), guardian phones included. `GET /v1/audit` is readable with
// `audit.view` alone, which management holds — so the only line between
// management and that PII is the read-side gate in AuditController: a caller
// without `students.view` receives `before: null` and `after: null`, and
// keeps every other ledger column. Design §3.2 (audit access "read-only")
// and §3.3 (never guardian phones, addresses, individual student records).
//
// These tests are the lock. The headmaster test is what makes it a
// *permission gate* rather than a blanket payload removal: without it,
// deleting the diff for everyone would also pass.
//
// Fix round 2 item 4: the amendment these three tests read used to be created
// by the first of them, which meant (a) tests 2 and 3 silently depended on test
// 1 having run, and (b) the round-0 "no audit row is about the student"
// assertion only stayed green because this block happened to run later. The
// amendment is now this block's own beforeAll fixture, and the round-0
// assertion is stated as the payload invariant, so no result here depends on
// execution order (file rule 3). The surrounding `describe` also gives the
// block its own setup boundary; the tables are truncated per file, so no other
// spec can see these rows either way.
// ---------------------------------------------------------------------------

/**
 * The complete wire shape of one audit row; nothing else may appear.
 *
 * SECONDARY guard (fix round 2 item 2): it exists to catch a *renamed* column
 * and to force whoever widens the audit contract to open this file. It is not
 * the privacy lock — appending a key here satisfies it while leaving a new
 * object-bearing column ungated, because `toWire` gates column by column. The
 * load-bearing assertion is `expectAuditPayloadColumnsAreScalar()`. If a
 * legitimate contract change makes this list wrong, updating it is the correct
 * fix; if that same change makes the scalar sweep red, that is a privacy
 * finding and the gate has to move first.
 */
const AUDIT_ROW_KEYS = [
  "action",
  "actorUserId",
  "after",
  "before",
  "createdAt",
  "entityId",
  "entityType",
  "id",
  "ip",
  "requestId",
  "userAgent",
];

async function patchStudent(
  token: string,
  version: number,
  payload: Row,
): Promise<TestResponse> {
  return context.request({
    method: "PATCH",
    url: `/v1/students/${studentAId}`,
    headers: {
      authorization: `Bearer ${token}`,
      "if-match": `"${version}"`,
      "content-type": "application/json",
    },
    payload,
  });
}

function amendmentEvents(rows: Row[]): Row[] {
  return rows.filter(
    (row) => row.action === "student.updated" && row.entityId === studentAId,
  );
}

describe("the audit diff gate: a reader without students.view loses the payloads, not the ledger", () => {
  /** Recorded by the fixture below and asserted by test 1 — proof the edit
   *  really happened, so the nulls below are a redaction and not an empty
   *  feed (file rule 1). */
  let amendmentStatus = 0;
  let amendmentBody: Row = {};

  beforeAll(async () => {
    // A real edit with a real PII snapshot behind it: the clerk amends the
    // seeded student (category only, so nothing else in this file is disturbed)
    // and StudentService.update() audits the whole detail projection
    // (dob, address, guardians[].phone) as `before`.
    const clerkToken = await tokenFor(SCHOOL_A, clerkA);
    const detail = await get(`/v1/students/${studentAId}`, clerkToken);
    expect(detail.statusCode).toBe(200);
    const version = (detail.json() as Row).version as number;

    const patched = await patchStudent(clerkToken, version, { category: "sc" });
    amendmentStatus = patched.statusCode;
    amendmentBody = patched.json() as Row;
  });

  test("management gets the amendment ledger, not the amended contents", async () => {
    expect(amendmentStatus, "this block's clerk amendment was accepted").toBe(200);
    expect(amendmentBody, "the amendment changed the record").toMatchObject({
      category: "sc",
    });

    const managementToken = await tokenFor(SCHOOL_A, managementA);
    const response = await get("/v1/audit?limit=100", managementToken);
    expect(response.statusCode).toBe(200);
    const rows = pageOf(response);

    // Positive pairing (file header rule 1): the PII-carrying event really is
    // in the feed management just read. An empty page here would make every
    // guard below vacuous — which is exactly how round 0's green audit
    // assertion coexisted with the leak.
    const events = amendmentEvents(rows);
    expect(events.length, "the student.updated event reached the feed").toBeGreaterThan(0);
    const event = events[0] as Row;

    // The gate: null, not omitted, not the object.
    expect(event.before, "before is nulled for a students.view-less reader").toBeNull();
    expect(event.after, "after is nulled for a students.view-less reader").toBeNull();

    // The ledger survives: this is still the who/what/where/when record §3.2
    // promises management — a count of events, contents withheld. Including
    // `entityId` = the student: the row being *about* a student is not the
    // leak, which is why the round-0 sweep asserts the payload instead.
    expect(event.entityType).toBe("student");
    expect(event.entityId).toBe(studentAId);
    expect(typeof event.actorUserId).toBe("string");
    expect(typeof event.id).toBe("string");
    expect(typeof event.createdAt).toBe("string");

    // And nothing anywhere in the serialised page carries the synthetic PII —
    // forbidden keys at any depth, values, and the raw key names.
    expectRosterIsClean(rows, "management audit feed after an amendment");
  });

  test("the headmaster still reads the diff — this is a gate, not a removal", async () => {
    const token = await tokenFor(SCHOOL_A, headmasterA);
    const rows = pageOf(await get("/v1/audit?limit=100", token));

    const events = amendmentEvents(rows);
    expect(events.length, "headmaster sees the same amendment events").toBeGreaterThan(0);
    for (const row of events) {
      expect(row.before, "diff payload present for students.view").not.toBeNull();
    }

    // The forensic record the clerk's edit wrote, verbatim: the point of the
    // audit log for the reader who is entitled to it.
    const before = events[0].before as Row;
    expect(before.id, "before is the student detail projection").toBe(studentAId);
    expect(before.dob).toBe(DOB);
    expect(before.address).toBe(ADDRESS);
    const guardians = before.guardians as Row[];
    expect(guardians, "before carries the guardian list").toHaveLength(1);
    expect(guardians[0].phone, "permitted reader still gets the guardian phone").toBe(PHONE);

    const after = events[0].after as Row;
    expect(after).toMatchObject({ category: "sc", rollNo: before.rollNo });
  });

  test("the two diff columns are the only STRUCTURED columns a non-privileged reader loses", async () => {
    const token = await tokenFor(SCHOOL_A, managementA);
    const rows = pageOf(await get("/v1/audit?limit=100", token));
    expect(rows.length, "feed is reading real rows").toBeGreaterThan(0);

    // LOAD-BEARING (fix round 2 item 2): scalar-or-nothing only, for a reader
    // without students.view. One call over the whole page.
    expectAuditPayloadColumnsAreScalar(rows, "management audit feed");

    for (const row of rows) {
      // SECONDARY: the fixed wire shape. A hidden twelfth column fails here,
      // which is the point — see the note on AUDIT_ROW_KEYS about which of the
      // two guards a maintainer may edit.
      expect([...Object.keys(row)].sort(), "audit row wire shape").toEqual(AUDIT_ROW_KEYS);
      // `before`/`after` are the only *structured* payload columns, and for
      // this reader both are null on EVERY row — the amendment, whose before
      // holds the detail projection, and the policy.denied rows, whose after
      // would otherwise expose refused routes' student ids (round 0's minor
      // observation).
      expect(row.before).toBeNull();
      expect(row.after).toBeNull();
      expect(typeof row.entityId).toBe("string");
      expect(typeof row.requestId === "string" || row.requestId === null).toBe(true);

      // What is NOT redacted, stated plainly (fix round 2 item 3): `action`,
      // `entityType`, `entityId`, `requestId`, `ip` and `userAgent` are free
      // text and reach this reader verbatim — review confirmed a
      // client-chosen `user-agent` string round-tripping into this feed. That
      // is intentional: §3.2 promises Management the ledger, and a URL/id the
      // caller already has is not a student payload. But it is exposure, so no
      // claim in this file may call before/after the only columns that could
      // carry anything. Residual risk for the lead, not for this test: nothing
      // here stops a future module writing a natural key (an applicant's phone)
      // into `entityId`; the value sweep below only catches the constants this
      // file seeded.
    }

    expect(forbiddenKeysIn(rows), "no PII-shaped key anywhere").toEqual([]);
    const body = JSON.stringify(rows);
    for (const secret of [PHONE, OTHER_PHONE, ADDRESS, DOB]) {
      expect(body, `${secret.slice(0, 4)}… leaked`).not.toContain(secret);
    }
  });
});
