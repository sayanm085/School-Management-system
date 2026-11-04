import { Injectable } from "@nestjs/common";
import { and, asc, eq, gt, isNull, ne, or } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import { AuditService } from "../../common/audit/audit.service";
import type { CurrentUser } from "../../common/authz/permissions";
import { ApiException, notFound } from "../../common/errors/api-error";
import { isUniqueViolation } from "../../common/errors/db-error";
import {
  decodeCursor,
  encodeCursor,
  type CursorPage,
} from "../../common/http/pagination";
import {
  assertVersion,
  bumpVersion,
  versionConflict,
} from "../../common/http/version";
import type { DbOrTx, Transaction } from "../../db/client";
import { DatabaseService } from "../../db/database.service";
import {
  academicYears,
  schools,
  sections,
  staff,
  subjects,
} from "../../db/schema";
import type { RequestContext } from "../auth/auth.service";
import type {
  AcademicYearRow,
  CreateAcademicYearInput,
  CreateSectionInput,
  CreateSubjectInput,
  ListQuery,
  SchoolProfile,
  SectionRow,
  SubjectRow,
  UpdateSchoolInput,
} from "./school.schemas";

@Injectable()
export class SchoolService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async profile(db: DbOrTx, schoolId: string): Promise<SchoolProfile> {
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);
    if (!school) throw notFound("School");

    const [year] = await db
      .select()
      .from(academicYears)
      .where(
        and(eq(academicYears.schoolId, schoolId), eq(academicYears.isActive, true)),
      )
      .limit(1);

    return {
      id: school.id,
      nameEn: school.nameEn,
      nameBn: school.nameBn,
      code: school.code,
      udise: school.udise,
      type: school.type,
      address: school.address,
      district: school.district,
      established: school.established,
      phone: school.phone,
      email: school.email,
      version: school.version,
      academicYear: year ? toAcademicYear(year) : null,
    };
  }

  async listYears(
    schoolId: string,
    query: ListQuery,
  ): Promise<CursorPage<AcademicYearRow>> {
    const conditions = [eq(academicYears.schoolId, schoolId)];
    if (query.cursor) {
      conditions.push(gt(academicYears.startDate, readDateCursor(query.cursor)));
    }

    const rows = await this.database.db
      .select()
      .from(academicYears)
      .where(and(...conditions))
      .orderBy(asc(academicYears.startDate), asc(academicYears.id))
      .limit(query.limit + 1);

    const data = rows.slice(0, query.limit).map(toAcademicYear);
    const last = data.at(-1);
    return {
      data,
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor({ d: last.startDate, i: last.id })
          : null,
    };
  }

  async updateProfile(
    user: CurrentUser,
    patch: UpdateSchoolInput,
    expectedVersion: number,
    context: RequestContext,
  ): Promise<SchoolProfile> {
    return this.database.db.transaction(async (tx) => {
      // Lock the row first: under READ COMMITTED a second PATCH that arrives
      // with the same If-Match waits here and then re-reads the new version,
      // so it can neither pass the check below nor overwrite the first write.
      const locked = await lockSchool(tx, user.schoolId);
      assertVersion(expectedVersion, locked.version);
      const before = await this.profile(tx, user.schoolId);

      const changed = await tx
        .update(schools)
        .set({
          ...patch,
          version: bumpVersion(locked.version),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schools.id, user.schoolId),
            eq(schools.version, expectedVersion),
          ),
        )
        .returning({ version: schools.version });
      if (changed.length === 0) {
        throw versionConflict(expectedVersion, locked.version);
      }

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "school.updated",
        entityType: "school",
        entityId: user.schoolId,
        before,
        after: { ...patch, version: bumpVersion(locked.version) },
        ...context,
      });

      return this.profile(tx, user.schoolId);
    });
  }

  async createYear(
    user: CurrentUser,
    input: CreateAcademicYearInput,
    context: RequestContext,
  ): Promise<AcademicYearRow> {
    if (input.endDate <= input.startDate) {
      throw new ApiException(
        422,
        "INVALID_ACADEMIC_YEAR",
        "The academic year must end after it starts.",
      );
    }

    const id = uuidv7();
    return this.database.db.transaction(async (tx) => {
      try {
        await tx.insert(academicYears).values({
          id,
          schoolId: user.schoolId,
          label: input.label,
          startDate: input.startDate,
          endDate: input.endDate,
          isActive: false,
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ApiException(
            409,
            "ACADEMIC_YEAR_EXISTS",
            "An academic year with that label already exists.",
          );
        }
        throw error;
      }

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "academic_year.created",
        entityType: "academic_year",
        entityId: id,
        after: {
          label: input.label,
          startDate: input.startDate,
          endDate: input.endDate,
        },
        ...context,
      });

      const [row] = await tx
        .select()
        .from(academicYears)
        .where(eq(academicYears.id, id))
        .limit(1);
      return toAcademicYear(row);
    });
  }

  async activateYear(
    user: CurrentUser,
    academicYearId: string,
    context: RequestContext,
  ): Promise<void> {
    return this.database.db.transaction(async (tx) => {
      const [target] = await tx
        .select()
        .from(academicYears)
        .where(
          and(
            eq(academicYears.id, academicYearId),
            eq(academicYears.schoolId, user.schoolId),
          ),
        )
        .limit(1);
      if (!target) throw notFound("Academic year");

      const deactivated = await tx
        .update(academicYears)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(academicYears.schoolId, user.schoolId),
            ne(academicYears.id, academicYearId),
            eq(academicYears.isActive, true),
          ),
        )
        .returning({ id: academicYears.id });

      await tx
        .update(academicYears)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(academicYears.id, academicYearId));

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "academic_year.activated",
        entityType: "academic_year",
        entityId: academicYearId,
        before: { deactivated: deactivated.map((row) => row.id) },
        after: { label: target.label },
        ...context,
      });
    });
  }

  async listSections(
    schoolId: string,
    query: ListQuery,
  ): Promise<CursorPage<SectionRow>> {
    const conditions = [eq(sections.schoolId, schoolId)];
    if (query.cursor) {
      conditions.push(gt(sections.id, readIdCursor(query.cursor)));
    }

    const rows = await this.database.db
      .select()
      .from(sections)
      .where(and(...conditions))
      .orderBy(asc(sections.id))
      .limit(query.limit + 1);

    const data = rows.slice(0, query.limit).map(toSection);
    const last = data.at(-1);
    return {
      data,
      nextCursor:
        rows.length > query.limit && last ? encodeCursor({ i: last.id }) : null,
    };
  }

  async createSection(
    user: CurrentUser,
    input: CreateSectionInput,
    context: RequestContext,
  ): Promise<SectionRow> {
    const academicYearId = await this.resolveYear(user.schoolId, input.academicYearId);
    const id = uuidv7();

    return this.database.db.transaction(async (tx) => {
      await assertClassTeacher(tx, user.schoolId, input.classTeacherId);

      try {
        await tx.insert(sections).values({
          id,
          schoolId: user.schoolId,
          academicYearId,
          classLevel: input.classLevel,
          section: input.section,
          room: input.room,
          capacity: input.capacity,
          classTeacherId: input.classTeacherId ?? null,
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ApiException(
            409,
            "SECTION_EXISTS",
            "That class section already exists for this academic year.",
          );
        }
        throw error;
      }

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "section.created",
        entityType: "section",
        entityId: id,
        after: {
          classLevel: input.classLevel,
          section: input.section,
          room: input.room,
        },
        ...context,
      });

      const [row] = await tx
        .select()
        .from(sections)
        .where(eq(sections.id, id))
        .limit(1);
      return toSection(row);
    });
  }

  async listSubjects(
    schoolId: string,
    query: ListQuery,
  ): Promise<CursorPage<SubjectRow>> {
    const conditions = [eq(subjects.schoolId, schoolId)];
    if (query.cursor) {
      const keyset = subjectKeyset(query.cursor);
      if (keyset) conditions.push(keyset);
    }

    const rows = await this.database.db
      .select()
      .from(subjects)
      .where(and(...conditions))
      .orderBy(asc(subjects.code), asc(subjects.id))
      .limit(query.limit + 1);

    const data = rows.slice(0, query.limit).map(toSubject);
    const last = data.at(-1);
    return {
      data,
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor({ c: last.code, i: last.id })
          : null,
    };
  }

  async createSubject(
    user: CurrentUser,
    input: CreateSubjectInput,
    context: RequestContext,
  ): Promise<SubjectRow> {
    const id = uuidv7();
    return this.database.db.transaction(async (tx) => {
      try {
        await tx.insert(subjects).values({
          id,
          schoolId: user.schoolId,
          code: input.code,
          nameEn: input.nameEn,
          nameBn: input.nameBn,
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ApiException(
            409,
            "SUBJECT_EXISTS",
            "A subject with that code already exists.",
          );
        }
        throw error;
      }

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "subject.created",
        entityType: "subject",
        entityId: id,
        after: { code: input.code, nameEn: input.nameEn },
        ...context,
      });

      const [row] = await tx
        .select()
        .from(subjects)
        .where(eq(subjects.id, id))
        .limit(1);
      return toSubject(row);
    });
  }

  private async resolveYear(schoolId: string, explicit?: string): Promise<string> {
    if (explicit) {
      const [row] = await this.database.db
        .select({ id: academicYears.id })
        .from(academicYears)
        .where(
          and(eq(academicYears.id, explicit), eq(academicYears.schoolId, schoolId)),
        )
        .limit(1);
      if (!row) throw notFound("Academic year");
      return row.id;
    }

    const [row] = await this.database.db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(
        and(eq(academicYears.schoolId, schoolId), eq(academicYears.isActive, true)),
      )
      .limit(1);
    if (!row) {
      throw new ApiException(
        409,
        "NO_ACTIVE_ACADEMIC_YEAR",
        "Activate an academic year before adding sections.",
      );
    }
    return row.id;
  }
}

/**
 * `SELECT … FOR UPDATE` on the school row: the version check in
 * `updateProfile` is only meaningful once the row is locked for this
 * transaction.
 */
async function lockSchool(
  tx: Transaction,
  schoolId: string,
): Promise<typeof schools.$inferSelect> {
  const [school] = await tx
    .select()
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1)
    .for("update");
  if (!school) throw notFound("School");
  return school;
}

/**
 * `sections_class_teacher_id_staff_id_fk` targets `staff(id)` alone, so the
 * database cannot tell a teacher of this school from a teacher of another one.
 * A `classTeacherId` straight from the request body is therefore checked
 * against the caller's own, not-deleted staff rows before it is written; the
 * id is not real until it belongs to this school.
 */
async function assertClassTeacher(
  tx: Transaction,
  schoolId: string,
  classTeacherId?: string,
): Promise<void> {
  if (!classTeacherId) return;

  const [teacher] = await tx
    .select({ id: staff.id })
    .from(staff)
    .where(
      and(
        eq(staff.id, classTeacherId),
        eq(staff.schoolId, schoolId),
        isNull(staff.deletedAt),
      ),
    )
    .limit(1);
  if (!teacher) throw notFound("Staff");
}

function readIdCursor(cursor: string): string {
  const raw = decodeCursor(cursor);
  if (typeof raw.i !== "string") throw invalidCursor();
  return raw.i;
}

function readDateCursor(cursor: string): string {
  const raw = decodeCursor(cursor);
  if (typeof raw.d !== "string") throw invalidCursor();
  return raw.d;
}

function subjectKeyset(cursor: string) {
  const raw = decodeCursor(cursor);
  if (typeof raw.c !== "string" || typeof raw.i !== "string") throw invalidCursor();
  return or(
    gt(subjects.code, raw.c),
    and(eq(subjects.code, raw.c), gt(subjects.id, raw.i)),
  );
}

function invalidCursor() {
  return new ApiException(
    400,
    "INVALID_CURSOR",
    "The cursor parameter is not a valid page cursor.",
  );
}

function toAcademicYear(row: typeof academicYears.$inferSelect): AcademicYearRow {
  return {
    id: row.id,
    label: row.label,
    startDate: row.startDate,
    endDate: row.endDate,
    isActive: row.isActive,
  };
}

function toSection(row: typeof sections.$inferSelect): SectionRow {
  return {
    id: row.id,
    classLevel: row.classLevel as SectionRow["classLevel"],
    section: row.section,
    room: row.room,
    capacity: row.capacity,
    classTeacherId: row.classTeacherId,
    version: row.version,
  };
}

function toSubject(row: typeof subjects.$inferSelect): SubjectRow {
  return {
    id: row.id,
    code: row.code,
    nameEn: row.nameEn,
    nameBn: row.nameBn,
    version: row.version,
  };
}
