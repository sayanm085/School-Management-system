import { afterAll, beforeAll, expect, test } from "vitest";
import { and, eq } from "drizzle-orm";

import { auditEvents, schools, sections, staff } from "../src/db/schema";
import { hashPassword } from "../src/common/security/password-hash";
import { ApiException } from "../src/common/errors/api-error";
import { SessionService } from "../src/modules/auth/session.service";
import { TokenService } from "../src/modules/auth/token.service";
import { SchoolService } from "../src/modules/school/school.service";
import { createTestApp, type TestApp } from "./app";
import { seedSchool, seedSection, seedStaffUser } from "./fixtures";

const SCHOOL_CODE = "WB-SCH-09";
const OTHER_SCHOOL_CODE = "WB-SCH-10";
const PASSWORD = "demo1234";
const SEAL_KEY = "baranda-seal-09-not-for-the-response";
const RIVAL_DISTRICT = "Written By The Rival Transaction";

let context: TestApp;
let schoolId: string;
let headmaster: string;
let clerk: string;

async function signIn(employeeId: string) {
  const response = await context.request({
    method: "POST",
    url: "/v1/auth/login",
    payload: { schoolCode: SCHOOL_CODE, employeeId, password: PASSWORD },
  });
  expect(response.statusCode).toBe(200);
  return response.json().accessToken as string;
}

async function patchSchool(
  token: string,
  ifMatch: string | null,
  payload: Record<string, unknown>,
) {
  return context.request({
    method: "PATCH",
    url: "/v1/school",
    headers: {
      authorization: `Bearer ${token}`,
      ...(ifMatch ? { "if-match": ifMatch } : {}),
      "content-type": "application/json",
    },
    payload,
  });
}

async function readProfile(token: string) {
  const response = await context.request({
    method: "GET",
    url: "/v1/school",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(response.statusCode).toBe(200);
  return {
    body: response.json() as Record<string, unknown>,
    version: response.json().version as number,
    etag: String(response.headers["etag"]),
  };
}

async function createSection(token: string, payload: Record<string, unknown>) {
  return context.request({
    method: "POST",
    url: "/v1/sections",
    headers: { authorization: `Bearer ${token}` },
    payload,
  });
}

async function countSections(school: string) {
  const rows = await context.db
    .select({ id: sections.id })
    .from(sections)
    .where(eq(sections.schoolId, school));
  return rows.length;
}

async function countProfileAudits() {
  const rows = await context.db
    .select({ id: auditEvents.id })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.schoolId, schoolId),
        eq(auditEvents.action, "school.updated"),
      ),
    );
  return rows.length;
}

/** A promise the test can resolve from inside a transaction callback. */
function deferred(): { promise: Promise<void>; resolve: () => void } {
  let release: () => void = () => undefined;
  const promise = new Promise<void>((inner) => {
    release = inner;
  });
  return { promise, resolve: release };
}

function hold(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

beforeAll(async () => {
  context = await createTestApp();
  const passwordHash = await hashPassword(PASSWORD);
  const school = await seedSchool(context.db, SCHOOL_CODE);
  schoolId = school.schoolId;
  // The seal key is a storage key B2b owns; the column is real and filled, so
  // the reads below prove it stays out of the response rather than being null.
  await context.db
    .update(schools)
    .set({ sealKey: SEAL_KEY })
    .where(eq(schools.id, schoolId));
  // One section already exists so the page-by-id assertions below have a second row.
  await seedSection(context.db, {
    schoolId,
    academicYearId: school.academicYearId,
    classLevel: "IX",
    section: "A",
  });
  headmaster = (
    await seedStaffUser(context.db, {
      schoolId,
      employeeId: "HM-SCH-01",
      role: "headmaster",
      passwordHash,
    })
  ).employeeId;
  clerk = (
    await seedStaffUser(context.db, {
      schoolId,
      employeeId: "CLK-SCH-01",
      role: "clerk",
      passwordHash,
    })
  ).employeeId;
});

afterAll(async () => {
  await context.close();
});

test("reads the school profile with its active academic year", async () => {
  const response = await context.request({
    method: "GET",
    url: "/v1/school",
    headers: { authorization: `Bearer ${await signIn(headmaster)}` },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
    code: SCHOOL_CODE,
    nameEn: "Test School",
    version: 1,
    academicYear: { label: "2026–27", isActive: true },
  });
  expect(String(response.headers["etag"])).toBe('"1"');

  // The seal key is not part of the profile contract, whatever the column holds.
  expect(response.json()).not.toHaveProperty("sealKey");
  const stored = await context.db
    .select({ sealKey: schools.sealKey })
    .from(schools)
    .where(eq(schools.id, schoolId));
  expect(stored[0]?.sealKey).toBe(SEAL_KEY);
});

test("the headmaster patches the profile and the write is audited", async () => {
  const token = await signIn(headmaster);
  const updated = await patchSchool(token, '"1"', {
    phone: "03452 255014",
    udise: "19000000009",
  });
  expect(updated.statusCode).toBe(200);
  expect(updated.json()).toMatchObject({ phone: "03452 255014", version: 2 });
  expect(String(updated.headers["etag"])).toBe('"2"');
  expect(updated.json()).not.toHaveProperty("sealKey");

  const rows = await context.db
    .select()
    .from(auditEvents)
    .where(
      and(eq(auditEvents.schoolId, schoolId), eq(auditEvents.action, "school.updated")),
    );
  expect(rows).toHaveLength(1);
  expect(rows[0].after).toMatchObject({ phone: "03452 255014", version: 2 });
  expect(JSON.stringify(rows[0].before)).toContain('"version":1');
  expect(JSON.stringify(rows[0].before)).not.toContain(SEAL_KEY);
});

test("a stale entity tag is refused and a missing one is a precondition failure", async () => {
  const token = await signIn(headmaster);
  const stale = await patchSchool(token, '"1"', { district: "Bardhaman" });
  expect(stale.statusCode).toBe(409);
  expect(stale.json().code).toBe("VERSION_CONFLICT");
  expect(stale.json().current).toBe(2);

  const missing = await patchSchool(token, null, { district: "Bardhaman" });
  expect(missing.statusCode).toBe(428);
  expect(missing.json().code).toBe("PRECONDITION_REQUIRED");
});

test("a clerk cannot change the school profile", async () => {
  const response = await patchSchool(await signIn(clerk), '"2"', {
    nameEn: "Hijacked School",
  });
  expect(response.statusCode).toBe(403);
  expect(response.json().code).toBe("FORBIDDEN");
});

test("sections are created once, by the headmaster only, and page by id", async () => {
  const token = await signIn(headmaster);
  const created = await context.request({
    method: "POST",
    url: "/v1/sections",
    headers: { authorization: `Bearer ${token}` },
    payload: { classLevel: "VIII", section: "C", room: "R-204", capacity: 40 },
  });
  expect(created.statusCode).toBe(201);
  expect(created.json()).toMatchObject({
    classLevel: "VIII",
    section: "C",
    room: "R-204",
    version: 1,
  });

  const replay = await context.request({
    method: "POST",
    url: "/v1/sections",
    headers: { authorization: `Bearer ${token}` },
    payload: { classLevel: "VIII", section: "C", room: "R-204", capacity: 40 },
  });
  expect(replay.statusCode).toBe(409);
  expect(replay.json().code).toBe("SECTION_EXISTS");

  const first = await context.request({
    method: "GET",
    url: "/v1/sections?limit=1",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(first.statusCode).toBe(200);
  expect(first.json().data).toHaveLength(1);
  expect(first.json().nextCursor).toBeTruthy();

  const next = await context.request({
    method: "GET",
    url: `/v1/sections?limit=1&cursor=${encodeURIComponent(first.json().nextCursor)}`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(next.json().data[0].id).not.toBe(first.json().data[0].id);

  const forbidden = await context.request({
    method: "POST",
    url: "/v1/sections",
    headers: { authorization: `Bearer ${await signIn(clerk)}` },
    payload: { classLevel: "VIII", section: "D", room: "R-205" },
  });
  expect(forbidden.statusCode).toBe(403);
});

test("subjects are upper-cased on the way in and unique by code", async () => {
  const token = await signIn(headmaster);
  const created = await context.request({
    method: "POST",
    url: "/v1/subjects",
    headers: { authorization: `Bearer ${token}` },
    payload: { code: "hpe", nameEn: "Physical Education", nameBn: "শারীরিক শিক্ষা" },
  });
  expect(created.statusCode).toBe(201);
  expect(created.json().code).toBe("HPE");

  const duplicate = await context.request({
    method: "POST",
    url: "/v1/subjects",
    headers: { authorization: `Bearer ${token}` },
    payload: { code: "HPE", nameEn: "Duplicate", nameBn: "ডুপ্লিকেট" },
  });
  expect(duplicate.statusCode).toBe(409);
  expect(duplicate.json().code).toBe("SUBJECT_EXISTS");
});

test("activating a year deactivates the previous one and the profile follows", async () => {
  const token = await signIn(headmaster);
  const created = await context.request({
    method: "POST",
    url: "/v1/academic-years",
    headers: { authorization: `Bearer ${token}` },
    payload: { label: "2027–28", startDate: "2027-04-01", endDate: "2028-03-31" },
  });
  expect(created.statusCode).toBe(201);
  expect(created.json().isActive).toBe(false);

  const activated = await context.request({
    method: "POST",
    url: `/v1/academic-years/${created.json().id}/activate`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(activated.statusCode).toBe(204);

  const profile = await context.request({
    method: "GET",
    url: "/v1/school",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(profile.json().academicYear.label).toBe("2027–28");

  const years = await context.request({
    method: "GET",
    url: "/v1/academic-years",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(
    years.json().data.filter((row: { isActive: boolean }) => row.isActive),
  ).toHaveLength(1);

  const reversed = await context.request({
    method: "POST",
    url: "/v1/academic-years",
    headers: { authorization: `Bearer ${token}` },
    payload: { label: "2030–31", startDate: "2031-04-01", endDate: "2030-03-31" },
  });
  expect(reversed.statusCode).toBe(422);
  expect(reversed.json().code).toBe("INVALID_ACADEMIC_YEAR");
});

test("two PATCHes sent with the same entity tag leave exactly one write", async () => {
  const token = await signIn(headmaster);
  const before = await readProfile(token);
  const audits = await countProfileAudits();

  const [first, second] = await Promise.all([
    patchSchool(token, before.etag, { district: "Purba Bardhaman" }),
    patchSchool(token, before.etag, { district: "Paschim Bardhaman" }),
  ]);
  expect([first.statusCode, second.statusCode].sort()).toEqual([200, 409]);

  const loser = first.statusCode === 200 ? second : first;
  expect(loser.json().code).toBe("VERSION_CONFLICT");
  expect(loser.json().expected).toBe(before.version);
  expect(loser.json().current).toBe(before.version + 1);

  const after = await readProfile(token);
  expect(after.version).toBe(before.version + 1);
  const written = after.body.district;
  expect(["Purba Bardhaman", "Paschim Bardhaman"]).toContain(written);

  expect(await countProfileAudits()).toBe(audits + 1);

  // The same stale tag stays refused when the retries are sequential, too.
  const staleAgain = await patchSchool(token, before.etag, { district: "Hooghly" });
  expect(staleAgain.statusCode).toBe(409);
  expect(staleAgain.json().current).toBe(before.version + 1);

  const staleOnceMore = await patchSchool(token, before.etag, { district: "Medinipur" });
  expect(staleOnceMore.statusCode).toBe(409);
  expect(staleOnceMore.json().current).toBe(before.version + 1);

  const unchanged = await readProfile(token);
  expect(unchanged.version).toBe(before.version + 1);
  expect(unchanged.body.district).toBe(written);
});

test("a rival write that commits during the read cannot be overwritten", async () => {
  const token = await signIn(headmaster);
  const before = await readProfile(token);
  const claims = await context.app.get(TokenService).verifyAccessToken(token);
  const user = await context.app.get(SessionService).loadCurrentUser(claims);
  if (!user) throw new Error("The test session could not be loaded.");
  const school = context.app.get(SchoolService);
  const audits = await countProfileAudits();

  // A second writer holds the row for the whole of its transaction, so the
  // PATCH below has to queue behind it. A read-then-save version check cannot
  // survive that: it would read the version before the rival commits, pass the
  // check and then write over the rival's change.
  const locked = deferred();
  const rival = context.db.transaction(async (tx) => {
    await tx
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1)
      .for("update");
    locked.resolve();

    await tx
      .update(schools)
      .set({
        district: RIVAL_DISTRICT,
        version: before.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(schools.id, schoolId));
    await hold(150);
  });

  await locked.promise;
  const attempt = school
    .updateProfile(
      user,
      { district: "Purba Bardhaman" },
      before.version,
      { requestId: "race-1", ip: "127.0.0.1", userAgent: "vitest" },
    )
    .then(
      (profile) => ({ landed: true as const, profile }),
      (error: unknown) => ({ landed: false as const, error }),
    );

  const [, attemptOutcome] = await Promise.all([rival, attempt]);

  // The stale PATCH is refused instead of overwriting the rival write.
  expect(attemptOutcome.landed).toBe(false);
  if (attemptOutcome.landed) throw new Error("The stale PATCH must not land.");
  if (!(attemptOutcome.error instanceof ApiException)) {
    throw new Error(
      `Expected an ApiException, got ${String(attemptOutcome.error)}`,
    );
  }
  expect(attemptOutcome.error.getStatus()).toBe(409);
  expect(attemptOutcome.error.getResponse()).toMatchObject({
    code: "VERSION_CONFLICT",
    expected: before.version,
    current: before.version + 1,
  });

  const after = await readProfile(token);
  expect(after.version).toBe(before.version + 1);
  expect(after.body.district).toBe(RIVAL_DISTRICT);
  expect(await countProfileAudits()).toBe(audits);
});

test("a section only takes a class teacher from the caller's own school", async () => {
  const token = await signIn(headmaster);
  const passwordHash = await hashPassword(PASSWORD);

  const other = await seedSchool(context.db, OTHER_SCHOOL_CODE);
  const foreign = await seedStaffUser(context.db, {
    schoolId: other.schoolId,
    employeeId: "HM-SCH-10",
    role: "headmaster",
    passwordHash,
  });
  const local = await seedStaffUser(context.db, {
    schoolId,
    employeeId: "TCH-SCH-01",
    role: "teacher",
    passwordHash,
  });
  const gone = await seedStaffUser(context.db, {
    schoolId,
    employeeId: "TCH-SCH-02",
    role: "teacher",
    passwordHash,
  });
  await context.db
    .update(staff)
    .set({ deletedAt: new Date() })
    .where(eq(staff.id, gone.staffId));

  const before = await countSections(schoolId);

  const wrongSchool = await createSection(token, {
    classLevel: "X",
    section: "A",
    room: "R-301",
    classTeacherId: foreign.staffId,
  });
  expect(wrongSchool.statusCode).toBe(404);
  expect(wrongSchool.json().code).toBe("NOT_FOUND");

  const softDeleted = await createSection(token, {
    classLevel: "X",
    section: "B",
    room: "R-302",
    classTeacherId: gone.staffId,
  });
  expect(softDeleted.statusCode).toBe(404);

  expect(await countSections(schoolId)).toBe(before);

  const accepted = await createSection(token, {
    classLevel: "X",
    section: "C",
    room: "R-303",
    classTeacherId: local.staffId,
  });
  expect(accepted.statusCode).toBe(201);
  expect(accepted.json().classTeacherId).toBe(local.staffId);
  expect(await countSections(schoolId)).toBe(before + 1);

  const teachers = await context.db
    .select({ classTeacherId: sections.classTeacherId })
    .from(sections)
    .where(eq(sections.schoolId, schoolId));
  expect(teachers.map((row) => row.classTeacherId)).not.toContain(foreign.staffId);
  expect(teachers.map((row) => row.classTeacherId)).not.toContain(gone.staffId);
});
