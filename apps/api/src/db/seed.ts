import { createHash } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { v5 as uuidv5 } from "uuid";

import { hashPassword } from "../common/security/password-hash";
import { createDb } from "./client";
import {
  academicYears,
  guardians,
  sections,
  schools,
  staff,
  staffAssignments,
  studentGuardians,
  students,
  subjects,
  users,
} from "./schema";
import {
  isLoginRole,
  readDemoSeed,
  type DemoAssignment,
} from "./seed-data";

export const SEED_NAMESPACE = "6f9c6f0a-6b6e-5a1d-9f4a-7c1d2e3f4051";

export function seedId(kind: string, value: string): string {
  return uuidv5(`${kind}:${value}`, SEED_NAMESPACE);
}

function digest(parts: string[]): string {
  return createHash("sha256")
    .update(parts.join("|"))
    .digest("hex")
    .slice(0, 32);
}

function assignmentId(staffKey: string, assignment: DemoAssignment): string {
  return seedId(
    "assignment",
    digest([
      staffKey,
      assignment.type,
      assignment.sectionId ?? "-",
      assignment.subjectId ?? "-",
      assignment.examId ?? "-",
    ]),
  );
}

export type SeedResult = {
  schoolId: string;
  academicYearId: string;
  subjects: number;
  sections: number;
  staff: number;
  assignments: number;
  students: number;
  guardians: number;
  logins: number;
};

export type SeedOptions = {
  demo: boolean;
  password?: string;
};

// Seed write contract: the fixture wins — a re-seed overwrites live edits, so
// a retired student is re-activated; rows absent from the fixture are never
// pruned; `students` is required, so an operator-supplied DEMO_SEED_FILE must
// carry it. Every update below bumps `version`, so a stale pre-seed ETag
// gets 409 VERSION_CONFLICT instead of blind-writing over the import.
export async function seedDatabase(
  url: string,
  options: SeedOptions,
): Promise<SeedResult> {
  if (options.demo && process.env.NODE_ENV === "production") {
    throw new Error("Refusing to import demo data into a production database.");
  }

  const seed = readDemoSeed();
  const demoPassword = options.demo
    ? (options.password ?? process.env.DEMO_PASSWORD)
    : undefined;
  if (options.demo && !demoPassword) {
    throw new Error("DEMO_PASSWORD must be set to seed demo logins.");
  }
  const passwordHash = demoPassword ? await hashPassword(demoPassword) : null;

  const schoolId = seedId("school", seed.school.id);
  const academicYearId = seedId("academic_year", seed.academicYear.id);
  const handle = createDb(url, 2);

  try {
    return await handle.db.transaction(async (tx) => {
      await tx
        .insert(schools)
        .values({
          id: schoolId,
          nameEn: seed.school.nameEn,
          nameBn: seed.school.nameBn,
          code: seed.school.code,
          udise: seed.school.udise ?? null,
          type: seed.school.type,
          address: seed.school.address,
          district: seed.school.district,
          established: seed.school.established ?? null,
          phone: seed.school.phone ?? null,
          email: seed.school.email ?? null,
        })
        .onConflictDoUpdate({
          target: schools.id,
          set: {
            nameEn: seed.school.nameEn,
            nameBn: seed.school.nameBn,
            code: seed.school.code,
            udise: seed.school.udise ?? null,
            type: seed.school.type,
            address: seed.school.address,
            district: seed.school.district,
            established: seed.school.established ?? null,
            phone: seed.school.phone ?? null,
            email: seed.school.email ?? null,
            version: sql`${schools.version} + 1`,
            updatedAt: new Date(),
          },
        });

      await tx
        .insert(academicYears)
        .values({
          id: academicYearId,
          schoolId,
          label: seed.academicYear.label,
          startDate: seed.academicYear.startDate,
          endDate: seed.academicYear.endDate,
          isActive: seed.academicYear.isActive,
        })
        .onConflictDoUpdate({
          target: academicYears.id,
          set: {
            label: seed.academicYear.label,
            startDate: seed.academicYear.startDate,
            endDate: seed.academicYear.endDate,
            isActive: seed.academicYear.isActive,
            updatedAt: new Date(),
          },
        });

      const subjectIds = new Map<string, string>();
      for (const item of seed.subjects) {
        const id = seedId("subject", item.id);
        subjectIds.set(item.id, id);
        await tx
          .insert(subjects)
          .values({
            id,
            schoolId,
            code: item.code,
            nameEn: item.nameEn,
            nameBn: item.nameBn,
          })
          .onConflictDoUpdate({
            target: subjects.id,
            set: {
              code: item.code,
              nameEn: item.nameEn,
              nameBn: item.nameBn,
              version: sql`${subjects.version} + 1`,
              updatedAt: new Date(),
            },
          });
      }

      const sectionIds = new Map<string, string>();
      for (const item of seed.sections) {
        const id = seedId("section", item.id);
        sectionIds.set(item.id, id);
        await tx
          .insert(sections)
          .values({
            id,
            schoolId,
            academicYearId,
            classLevel: item.classLevel,
            section: item.section,
            room: item.room,
            capacity: item.capacity,
            classTeacherId: null,
          })
          .onConflictDoUpdate({
            target: sections.id,
            set: {
              academicYearId,
              classLevel: item.classLevel,
              section: item.section,
              room: item.room,
              capacity: item.capacity,
              version: sql`${sections.version} + 1`,
              updatedAt: new Date(),
            },
          });
      }

      const staffIds = new Map<string, string>();
      for (const member of seed.staff) {
        const id = seedId("staff", member.id);
        staffIds.set(member.id, id);
        await tx
          .insert(staff)
          .values({
            id,
            schoolId,
            employeeId: member.employeeId,
            nameEn: member.nameEn,
            nameBn: member.nameBn,
            designation: member.designation,
            phone: member.phone ?? null,
            email: member.email ?? null,
            payLevel: member.payLevel ?? null,
            joinedAt: member.joinedAt ?? null,
            status: member.status === "active" ? "active" : "inactive",
            avatarKey: member.avatar ?? null,
          })
          .onConflictDoUpdate({
            target: staff.id,
            set: {
              employeeId: member.employeeId,
              nameEn: member.nameEn,
              nameBn: member.nameBn,
              designation: member.designation,
              phone: member.phone ?? null,
              email: member.email ?? null,
              payLevel: member.payLevel ?? null,
              joinedAt: member.joinedAt ?? null,
              status: member.status === "active" ? "active" : "inactive",
              avatarKey: member.avatar ?? null,
              version: sql`${staff.version} + 1`,
              updatedAt: new Date(),
            },
          });
      }

      for (const item of seed.sections) {
        // A section with no class teacher is normal data: skip silently.
        if (!item.classTeacherId) continue;
        const teacherId = staffIds.get(item.classTeacherId);
        if (!teacherId)
          throw new Error(
            `Demo section ${item.id} references unknown class teacher key "${item.classTeacherId}"`,
          );
        const sectionId = sectionIds.get(item.id);
        if (!sectionId)
          throw new Error(`Demo section ${item.id} was not seeded`);
        await tx
          .update(sections)
          .set({
            classTeacherId: teacherId,
            version: sql`${sections.version} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(sections.id, sectionId));
      }

      let assignments = 0;
      for (const member of seed.staff) {
        const staffId = staffIds.get(member.id);
        if (!staffId)
          throw new Error(`Demo staff key "${member.id}" was not seeded`);
        for (const assignment of member.assignments) {
          // A missing sectionId/subjectId (e.g. an accountant) is normal;
          // a present key that does not resolve fails the whole import.
          let sectionId: string | null = null;
          if (assignment.sectionId !== undefined) {
            const resolved = sectionIds.get(assignment.sectionId);
            if (!resolved)
              throw new Error(
                `Demo staff ${member.id} assignment references unknown section "${assignment.sectionId}"`,
              );
            sectionId = resolved;
          }
          let subjectId: string | null = null;
          if (assignment.subjectId !== undefined) {
            const resolved = subjectIds.get(assignment.subjectId);
            if (!resolved)
              throw new Error(
                `Demo staff ${member.id} assignment references unknown subject "${assignment.subjectId}"`,
              );
            subjectId = resolved;
          }
          await tx
            .insert(staffAssignments)
            .values({
              id: assignmentId(member.id, assignment),
              schoolId,
              staffId,
              type: assignment.type,
              sectionId,
              subjectId,
              examId: null,
            })
            .onConflictDoUpdate({
              target: staffAssignments.id,
              set: {
                type: assignment.type,
                sectionId,
                subjectId,
              },
            });
          assignments += 1;
        }
      }

      let studentCount = 0;
      let guardianCount = 0;
      for (const item of seed.students) {
        const studentId = seedId("student", item.id);
        const sectionId = sectionIds.get(item.sectionId);
        // A student's sectionId is required: an unresolvable key fails the
        // whole import instead of committing a partial roster.
        if (!sectionId)
          throw new Error(
            `Demo student ${item.id} references unknown section "${item.sectionId}"`,
          );

        await tx
          .insert(students)
          .values({
            id: studentId,
            schoolId,
            sectionId,
            admissionNo: item.admissionNo,
            rollNo: item.rollNo,
            nameEn: item.nameEn,
            nameBn: item.nameBn,
            gender: item.gender,
            dob: item.dob,
            category: item.category,
            status: item.status,
            address: item.address,
            avatarKey: item.avatar ?? null,
            admissionDate: item.admissionDate,
          })
          .onConflictDoUpdate({
            target: students.id,
            set: {
              sectionId,
              admissionNo: item.admissionNo,
              rollNo: item.rollNo,
              nameEn: item.nameEn,
              nameBn: item.nameBn,
              gender: item.gender,
              dob: item.dob,
              category: item.category,
              status: item.status,
              address: item.address,
              avatarKey: item.avatar ?? null,
              admissionDate: item.admissionDate,
              version: sql`${students.version} + 1`,
              updatedAt: new Date(),
            },
          });
        studentCount += 1;

        const guardianId = seedId("guardian", item.id);
        await tx
          .insert(guardians)
          .values({
            id: guardianId,
            schoolId,
            nameEn: item.guardianName,
            nameBn: item.guardianName,
            phone: item.guardianPhone,
            address: item.address,
          })
          .onConflictDoUpdate({
            target: guardians.id,
            set: {
              nameEn: item.guardianName,
              nameBn: item.guardianName,
              phone: item.guardianPhone,
              address: item.address,
              version: sql`${guardians.version} + 1`,
              updatedAt: new Date(),
            },
          });
        guardianCount += 1;

        await tx
          .insert(studentGuardians)
          .values({
            id: seedId("student_guardian", item.id),
            schoolId,
            studentId,
            guardianId,
            relationship: "guardian",
            isPrimary: true,
          })
          .onConflictDoUpdate({
            target: studentGuardians.id,
            set: {
              studentId,
              guardianId,
              relationship: "guardian",
              isPrimary: true,
              version: sql`${studentGuardians.version} + 1`,
              updatedAt: new Date(),
            },
          });
      }

      let logins = 0;
      if (passwordHash) {
        for (const member of seed.staff) {
          const staffId = staffIds.get(member.id);
          if (!staffId || !isLoginRole(member.role)) continue;
          await tx
            .insert(users)
            .values({
              id: seedId("user", member.id),
              schoolId,
              staffId,
              employeeId: member.employeeId,
              email: member.email ?? null,
              passwordHash,
              role: member.role,
              status: "active",
            })
            .onConflictDoUpdate({
              target: users.id,
              set: {
                email: member.email ?? null,
                role: member.role,
                version: sql`${users.version} + 1`,
                updatedAt: new Date(),
              },
            });
          logins += 1;
        }
      }

      return {
        schoolId,
        academicYearId,
        subjects: seed.subjects.length,
        sections: seed.sections.length,
        staff: seed.staff.length,
        assignments,
        students: studentCount,
        guardians: guardianCount,
        logins,
      };
    });
  } finally {
    await handle.close();
  }
}
