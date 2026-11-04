// apps/api/test/master-data-schema.e2e-spec.ts
import { afterAll, beforeAll, expect, test } from "vitest";
import { sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import { createTestApp, type TestApp } from "./app";
import { errorChain } from "./errors";

let context: TestApp;
let schoolId: string;
let sectionId: string;

function rows<T>(result: unknown): T[] {
  return result as T[];
}

beforeAll(async () => {
  context = await createTestApp();
  schoolId = uuidv7();
  await context.db.execute(sql`
    insert into schools (id, name_en, name_bn, code, type, address, district)
    values (${schoolId}, 'Test', 'টেস্ট', 'WB-SCH-01', 'x', 'y', 'z')
  `);
  const yearId = uuidv7();
  await context.db.execute(sql`
    insert into academic_years (id, school_id, label, start_date, end_date, is_active)
    values (${yearId}, ${schoolId}, '2026–27', '2026-04-01', '2027-03-31', true)
  `);
  sectionId = uuidv7();
  await context.db.execute(sql`
    insert into sections (id, school_id, academic_year_id, class_level, section, room)
    values (${sectionId}, ${schoolId}, ${yearId}, 'VIII', 'B', 'R-201')
  `);
});

afterAll(async () => {
  await context.close();
});

function insertStudent(rollNo: string, admissionNo: string) {
  return context.db.execute(sql`
    insert into students (id, school_id, section_id, admission_no, roll_no, name_en, name_bn,
                          gender, dob, category, status, admission_date)
    values (${uuidv7()}, ${schoolId}, ${sectionId}, ${admissionNo}, ${rollNo},
            'Purnima Satra', 'পূর্ণিমা সাঁতরা', 'female', '2016-08-04', 'general',
            'active', '2017-04-01')
  `);
}

test("the student domain tables exist", async () => {
  const result = await context.db.execute(sql`
    select table_name from information_schema.tables where table_schema = 'public'
  `);
  const names = rows<{ table_name: string }>(result).map((row) => row.table_name);
  expect(names).toEqual(
    expect.arrayContaining(["students", "guardians", "student_guardians"]),
  );
});

test("a student cannot be placed in another school's section", async () => {
  const other = uuidv7();
  await context.db.execute(sql`
    insert into schools (id, name_en, name_bn, code, type, address, district)
    values (${other}, 'Other', 'অন্য', 'WB-SCH-02', 'x', 'y', 'z')
  `);
  const otherYear = uuidv7();
  await context.db.execute(sql`
    insert into academic_years (id, school_id, label, start_date, end_date, is_active)
    values (${otherYear}, ${other}, '2026–27', '2026-04-01', '2027-03-31', true)
  `);
  const stolen = uuidv7();
  await context.db.execute(sql`
    insert into sections (id, school_id, academic_year_id, class_level, section, room)
    values (${stolen}, ${other}, ${otherYear}, 'VIII', 'Z', 'R-999')
  `);

  const failure = await context.db.execute(sql`
    insert into students (id, school_id, section_id, admission_no, roll_no, name_en, name_bn,
                          gender, dob, category, status, admission_date)
    values (${uuidv7()}, ${schoolId}, ${stolen}, 'NUV-2017-0500', '50',
            'Cross Tenant', 'ক্রস', 'male', '2016-01-01', 'general', 'active', '2017-04-01')
  `)
    .then(() => null)
    .catch((error: unknown) => error);
  expect(errorChain(failure)).toContain("students_section_school_fk");
});

test("roll numbers are unique per section and admission numbers per school", async () => {
  await insertStudent("07", "NUV-2017-0101");

  const duplicateRoll = await insertStudent("07", "NUV-2017-0102")
    .then(() => null)
    .catch((error: unknown) => error);
  expect(duplicateRoll).toBeInstanceOf(Error);

  const duplicateAdmission = await insertStudent("08", "NUV-2017-0101")
    .then(() => null)
    .catch((error: unknown) => error);
  expect(duplicateAdmission).toBeInstanceOf(Error);

  const count = await context.db.execute(sql`select count(*)::int as total from students`);
  expect(rows<{ total: number }>(count)[0]?.total).toBe(1);
});

test("a soft-deleted student still holds the roll", async () => {
  await context.db.execute(sql`update students set deleted_at = now() where roll_no = '07'`);
  const active = await context.db.execute(
    sql`select count(*)::int as total from students where deleted_at is null`,
  );
  expect(rows<{ total: number }>(active)[0]?.total).toBe(0);

  const reuse = await insertStudent("07", "NUV-2017-0103")
    .then(() => null)
    .catch((error: unknown) => error);
  expect(reuse).toBeInstanceOf(Error);
});

test("schools, sections, subjects, students and guardians all carry a version", async () => {
  const result = await context.db.execute(sql`
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'version'
      and table_name in ('schools', 'sections', 'subjects', 'students', 'guardians')
    order by table_name
  `);
  expect(rows<{ table_name: string }>(result).map((row) => row.table_name)).toEqual([
    "guardians",
    "schools",
    "sections",
    "students",
    "subjects",
  ]);
});

test("a guardian link is unique per pair and disappears with the student", async () => {
  const guardianId = uuidv7();
  await context.db.execute(sql`
    insert into guardians (id, school_id, name_en, name_bn, phone, address)
    values (${guardianId}, ${schoolId}, 'Niladri Satra', 'নীলাদ্রি সাঁতরা', '9894911322', 'Nabagram')
  `);
  const studentId = uuidv7();
  await context.db.execute(sql`
    insert into students (id, school_id, section_id, admission_no, roll_no, name_en, name_bn,
                          gender, dob, category, status, admission_date)
    values (${studentId}, ${schoolId}, ${sectionId}, 'NUV-2017-0201', '09',
            'Aisha Khatun', 'আইশা খাতুন', 'female', '2016-01-12', 'obc', 'active', '2017-04-01')
  `);
  await context.db.execute(sql`
    insert into student_guardians (id, school_id, student_id, guardian_id, relationship, is_primary)
    values (${uuidv7()}, ${schoolId}, ${studentId}, ${guardianId}, 'father', true)
  `);

  const duplicate = await context.db.execute(sql`
    insert into student_guardians (id, school_id, student_id, guardian_id, relationship, is_primary)
    values (${uuidv7()}, ${schoolId}, ${studentId}, ${guardianId}, 'mother', false)
  `)
    .then(() => null)
    .catch((error: unknown) => error);
  expect(duplicate).toBeInstanceOf(Error);

  await context.db.execute(sql`delete from students where id = ${studentId}`);
  const links = await context.db.execute(
    sql`select count(*)::int as total from student_guardians where student_id = ${studentId}`,
  );
  expect(rows<{ total: number }>(links)[0]?.total).toBe(0);
});

/**
 * The student half of the tenancy fix, mirroring the guardian half covered
 * over HTTP in guardians.e2e-spec.ts (`student_guardians_guardian_school_fk`).
 * It cannot be reached through the API: a foreign `:studentId` on the route
 * path is scoped to a 404 by `GuardianService.student()` long before the
 * insert runs, so the composite key is only provable against the database.
 */
test("a guardian link cannot name another school's student", async () => {
  const other = uuidv7();
  await context.db.execute(sql`
    insert into schools (id, name_en, name_bn, code, type, address, district)
    values (${other}, 'Foreign', 'বিদেশী', 'WB-SCH-03', 'x', 'y', 'z')
  `);
  const otherYear = uuidv7();
  await context.db.execute(sql`
    insert into academic_years (id, school_id, label, start_date, end_date, is_active)
    values (${otherYear}, ${other}, '2026–27', '2026-04-01', '2027-03-31', true)
  `);
  const otherSection = uuidv7();
  await context.db.execute(sql`
    insert into sections (id, school_id, academic_year_id, class_level, section, room)
    values (${otherSection}, ${other}, ${otherYear}, 'VIII', 'Y', 'R-998')
  `);
  const otherStudent = uuidv7();
  await context.db.execute(sql`
    insert into students (id, school_id, section_id, admission_no, roll_no, name_en, name_bn,
                          gender, dob, category, status, admission_date)
    values (${otherStudent}, ${other}, ${otherSection}, 'NUV-2017-0600', '60',
            'Foreign Child', 'বিদেশী', 'male', '2016-01-01', 'general', 'active', '2017-04-01')
  `);

  // Both the school id and the guardian are school A's own; only the student
  // crosses the boundary, which is exactly what the pair key must reject.
  const ownGuardian = uuidv7();
  await context.db.execute(sql`
    insert into guardians (id, school_id, name_en, name_bn, phone, address)
    values (${ownGuardian}, ${schoolId}, 'Own Guardian', 'নিজের', '9894911900', 'Nabagram')
  `);

  const failure = await context.db
    .execute(sql`
      insert into student_guardians (id, school_id, student_id, guardian_id, relationship, is_primary)
      values (${uuidv7()}, ${schoolId}, ${otherStudent}, ${ownGuardian}, 'father', true)
    `)
    .then(() => null)
    .catch((error: unknown) => error);

  expect(failure).toBeInstanceOf(Error);
  expect(errorChain(failure)).toContain("student_guardians_student_school_fk");
  expect(errorChain(failure)).not.toContain("student_guardians_guardian_school_fk");

  const survivors = await context.db.execute(
    sql`select count(*)::int as total from student_guardians where student_id = ${otherStudent}`,
  );
  expect(rows<{ total: number }>(survivors)[0]?.total).toBe(0);
});
