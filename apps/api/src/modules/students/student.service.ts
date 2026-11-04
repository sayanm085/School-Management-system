import { Injectable } from "@nestjs/common";
import {
  and,
  asc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import { AuditService } from "../../common/audit/audit.service";
import type { CurrentUser } from "../../common/authz/permissions";
import { PolicyService } from "../../common/authz/policy.service";
import {
  ApiException,
  crossSchoolForeignKey,
  forbidden,
  notFound,
} from "../../common/errors/api-error";
import { isUniqueViolation } from "../../common/errors/db-error";
import {
  decodeCursor,
  encodeCursor,
  type CursorPage,
} from "../../common/http/pagination";
import { assertVersion, bumpVersion } from "../../common/http/version";
import { businessToday } from "../../common/time/clock";
import type { DbOrTx, Transaction } from "../../db/client";
import { DatabaseService } from "../../db/database.service";
import {
  guardians,
  sections,
  studentGuardians,
  students,
} from "../../db/schema";
import type { RequestContext } from "../auth/auth.service";
import { toGuardianRow } from "./guardian.mapper";
import type {
  CreateStudentInput,
  StudentDetail,
  StudentListQuery,
  StudentSummary,
  UpdateStudentInput,
} from "./student.schemas";

/** A student row joined with the section that gives the row its class label. */
type StudentWithSection = {
  student: typeof students.$inferSelect;
  classLevel: string;
  sectionName: string;
};

/**
 * The class label is derived from the joined `sections` row in exactly one
 * place; both the list projection and the detail read their label through it.
 */
function classLabelOf(classLevel: string, sectionName: string): string {
  return `${classLevel} ${sectionName}`;
}

@Injectable()
export class StudentService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly policy: PolicyService,
  ) {}

  async list(
    user: CurrentUser,
    query: StudentListQuery,
  ): Promise<CursorPage<StudentSummary>> {
    if (query.sectionId) this.requireSection(user, query.sectionId);

    const scoped =
      user.role === "teacher" && !user.isAssistantHeadmaster
        ? user.sectionIds
        : null;
    if (scoped && scoped.length === 0 && !query.sectionId) {
      return { data: [], nextCursor: null };
    }

    const conditions = [
      eq(students.schoolId, user.schoolId),
      eq(students.status, query.status),
      isNull(students.deletedAt),
    ];

    if (query.sectionId) {
      conditions.push(eq(students.sectionId, query.sectionId));
    } else if (scoped) {
      conditions.push(inArray(students.sectionId, scoped));
    }

    if (query.search) {
      const pattern = `%${query.search}%`;
      const matches = or(
        ilike(students.nameEn, pattern),
        ilike(students.nameBn, pattern),
        ilike(students.admissionNo, pattern),
        eq(students.rollNo, query.search),
      );
      if (matches) conditions.push(matches);
    }

    if (query.cursor) {
      const keyset = keysetAfter(query.cursor);
      if (keyset) conditions.push(keyset);
    }

    const rows = await this.database.db
      .select({
        id: students.id,
        admissionNo: students.admissionNo,
        rollNo: students.rollNo,
        sectionId: students.sectionId,
        classLevel: sections.classLevel,
        sectionName: sections.section,
        nameEn: students.nameEn,
        nameBn: students.nameBn,
        gender: students.gender,
        category: students.category,
        status: students.status,
        version: students.version,
      })
      .from(students)
      .innerJoin(sections, eq(sections.id, students.sectionId))
      .where(and(...conditions))
      .orderBy(asc(students.sectionId), asc(students.rollNo), asc(students.id))
      .limit(query.limit + 1);

    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      data: page.map((row) => ({
        id: row.id,
        admissionNo: row.admissionNo,
        rollNo: row.rollNo,
        sectionId: row.sectionId,
        classLabel: classLabelOf(row.classLevel, row.sectionName),
        nameEn: row.nameEn,
        nameBn: row.nameBn,
        gender: row.gender,
        category: row.category,
        status: row.status,
        version: row.version,
      })),
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor({ s: last.sectionId, k: last.rollNo, i: last.id })
          : null,
    };
  }

  async detail(user: CurrentUser, studentId: string): Promise<StudentDetail> {
    return this.detailOn(this.database.db, user, studentId);
  }

  async create(
    user: CurrentUser,
    input: CreateStudentInput,
    context: RequestContext,
  ): Promise<StudentDetail> {
    this.requireSection(user, input.sectionId);

    const id = uuidv7();
    const admissionDate = input.admissionDate ?? businessToday();

    return this.database.db.transaction(async (tx) => {
      const rollNo = input.rollNo ?? (await this.nextRoll(tx, input.sectionId));
      try {
        await tx.insert(students).values({
          id,
          schoolId: user.schoolId,
          sectionId: input.sectionId,
          admissionNo: input.admissionNo,
          rollNo,
          nameEn: input.nameEn,
          nameBn: input.nameBn,
          gender: input.gender,
          dob: input.dob,
          category: input.category,
          address: input.address ?? null,
          avatarKey: input.avatarKey ?? null,
          admissionDate,
          status: "active",
        });
      } catch (error) {
        // A foreign section is tenancy (403); admission/roll clashes stay
        // conflicts (409); anything else keeps the generic path.
        throw crossSchoolForeignKey(error) ?? studentConflict(error, input.admissionNo);
      }

      if (input.guardian) {
        const guardianId = uuidv7();
        await tx.insert(guardians).values({
          id: guardianId,
          schoolId: user.schoolId,
          nameEn: input.guardian.nameEn,
          nameBn: input.guardian.nameBn,
          phone: input.guardian.phone,
          address: input.guardian.address ?? input.address ?? null,
        });
        await tx.insert(studentGuardians).values({
          id: uuidv7(),
          schoolId: user.schoolId,
          studentId: id,
          guardianId,
          relationship: input.guardian.relationship,
          isPrimary: true,
        });
      }

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "student.created",
        entityType: "student",
        entityId: id,
        after: {
          admissionNo: input.admissionNo,
          rollNo,
          sectionId: input.sectionId,
          nameEn: input.nameEn,
        },
        ...context,
      });

      // Read through the transaction: the outer pool cannot see the rows this
      // transaction has not committed yet.
      const created = await this.findRow(tx, user.schoolId, id);
      if (!created) throw notFound("Student");
      return this.withGuardians(tx, created);
    });
  }

  async update(
    user: CurrentUser,
    studentId: string,
    patch: UpdateStudentInput,
    expectedVersion: number,
    context: RequestContext,
  ): Promise<StudentDetail> {
    return this.database.db.transaction(async (tx) => {
      // Lock the row first (the SchoolService pattern): under READ COMMITTED a
      // second PATCH that arrives with the same If-Match waits here and then
      // re-reads the new version, so it can neither pass the check below nor
      // overwrite the first write.
      const locked = await this.lockStudent(tx, user.schoolId, studentId);
      if (!locked) throw notFound("Student");
      assertVersion(expectedVersion, locked.version);
      const before = await this.detailOn(tx, user, studentId);

      const targetSection = patch.sectionId ?? before.sectionId;
      this.requireSection(user, targetSection);

      const rollNo =
        patch.rollNo ??
        (patch.sectionId && patch.sectionId !== before.sectionId
          ? await this.nextRoll(tx, patch.sectionId, studentId)
          : before.rollNo);

      try {
        await tx
          .update(students)
          .set({
            ...patch,
            sectionId: targetSection,
            rollNo,
            version: bumpVersion(locked.version),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(students.id, studentId),
              eq(students.schoolId, user.schoolId),
            ),
          );
      } catch (error) {
        throw crossSchoolForeignKey(error) ?? studentConflict(error, before.admissionNo);
      }

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "student.updated",
        entityType: "student",
        entityId: studentId,
        before,
        after: { ...patch, sectionId: targetSection, rollNo },
        ...context,
      });

      return this.detailOn(tx, user, studentId);
    });
  }

  async retire(
    user: CurrentUser,
    studentId: string,
    status: "transferred" | "alumni",
    reason: string | undefined,
    context: RequestContext,
  ): Promise<StudentDetail> {
    return this.database.db.transaction(async (tx) => {
      const locked = await this.lockStudent(tx, user.schoolId, studentId);
      if (!locked) throw notFound("Student");

      await tx
        .update(students)
        .set({
          status,
          version: bumpVersion(locked.version),
          updatedAt: new Date(),
        })
        .where(
          and(eq(students.id, studentId), eq(students.schoolId, user.schoolId)),
        );

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "student.retired",
        entityType: "student",
        entityId: studentId,
        before: { status: locked.status },
        after: { status, reason: reason ?? null },
        ...context,
      });

      return this.detailOn(tx, user, studentId);
    });
  }

  async nextRoll(
    tx: DbOrTx,
    sectionId: string,
    excludeStudentId?: string,
  ): Promise<string> {
    const conditions = [eq(students.sectionId, sectionId)];
    if (excludeStudentId) {
      conditions.push(ne(students.id, excludeStudentId));
    }
    const rows = await tx
      .select({ rollNo: students.rollNo })
      .from(students)
      .where(and(...conditions));

    const highest = rows.reduce(
      (max, row) => Math.max(max, Number.parseInt(row.rollNo, 10) || 0),
      0,
    );
    return String(highest + 1).padStart(2, "0");
  }

  private requireSection(user: CurrentUser, sectionId: string): void {
    if (!this.policy.canAccessSection(user, sectionId)) {
      throw forbidden(["students.view"]);
    }
  }

  /** `SELECT … FOR UPDATE` so the version check is the only writer's check. */
  private async lockStudent(
    tx: Transaction,
    schoolId: string,
    studentId: string,
  ): Promise<typeof students.$inferSelect | null> {
    const [row] = await tx
      .select()
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
      .limit(1)
      .for("update");
    return row ?? null;
  }

  private findRow(
    db: DbOrTx,
    schoolId: string,
    studentId: string,
  ): Promise<StudentWithSection | null> {
    return db
      .select({
        student: students,
        classLevel: sections.classLevel,
        sectionName: sections.section,
      })
      .from(students)
      .innerJoin(sections, eq(sections.id, students.sectionId))
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  private async detailOn(
    db: DbOrTx,
    user: CurrentUser,
    studentId: string,
  ): Promise<StudentDetail> {
    const row = await this.findRow(db, user.schoolId, studentId);
    if (!row) throw notFound("Student");
    this.requireSection(user, row.student.sectionId);
    return this.withGuardians(db, row);
  }

  private async withGuardians(
    db: DbOrTx,
    row: StudentWithSection,
  ): Promise<StudentDetail> {
    const student = row.student;
    const links = await db
      .select({
        guardians: guardians,
        relationship: studentGuardians.relationship,
        isPrimary: studentGuardians.isPrimary,
      })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .where(eq(studentGuardians.studentId, student.id))
      .orderBy(sql`${studentGuardians.isPrimary} desc`);

    return {
      id: student.id,
      admissionNo: student.admissionNo,
      rollNo: student.rollNo,
      sectionId: student.sectionId,
      classLabel: classLabelOf(row.classLevel, row.sectionName),
      nameEn: student.nameEn,
      nameBn: student.nameBn,
      gender: student.gender,
      category: student.category,
      status: student.status,
      dob: student.dob,
      address: student.address,
      avatarKey: student.avatarKey,
      admissionDate: student.admissionDate,
      version: student.version,
      guardians: links.map(toGuardianRow),
    };
  }
}

function keysetAfter(cursor: string) {
  const raw = decodeCursor(cursor);
  const sectionId = typeof raw.s === "string" ? raw.s : "";
  const rollNo = typeof raw.k === "string" ? raw.k : "";
  const id = typeof raw.i === "string" ? raw.i : "";
  if (!sectionId || !rollNo || !id) throw invalidCursor();
  return or(
    gt(students.sectionId, sectionId),
    and(
      eq(students.sectionId, sectionId),
      or(
        gt(students.rollNo, rollNo),
        and(eq(students.rollNo, rollNo), gt(students.id, id)),
      ),
    ),
  );
}

function invalidCursor() {
  return new ApiException(
    400,
    "INVALID_CURSOR",
    "The cursor parameter is not a valid page cursor.",
  );
}

/**
 * The two unique indexes on `students` both surface as SQLSTATE 23505, so the
 * constraint name on the error (or its cause) is what tells them apart.
 */
function studentConflict(error: unknown, admissionNo: string): unknown {
  if (!isUniqueViolation(error)) return error;
  if (uniqueConstraint(error) === "students_school_admission_uq") {
    return new ApiException(
      409,
      "ADMISSION_NO_TAKEN",
      `Admission number ${admissionNo} is already used in this school.`,
    );
  }
  return new ApiException(
    409,
    "ROLL_NO_TAKEN",
    "That roll number is already used in this class section.",
  );
}

/** Walks the cause chain the way `errorCode` does; postgres-js uses `constraint_name`. */
function uniqueConstraint(error: unknown): string | null {
  let current: unknown = error;
  while (current instanceof Error) {
    const fields = current as { constraint_name?: unknown; cause?: unknown };
    if (typeof fields.constraint_name === "string") {
      return fields.constraint_name;
    }
    current = fields.cause;
  }
  return null;
}
