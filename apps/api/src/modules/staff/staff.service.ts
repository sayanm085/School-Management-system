import { Injectable } from "@nestjs/common";
import { and, asc, eq, gt, ilike, isNull, or } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import { AuditService } from "../../common/audit/audit.service";
import type { CurrentUser } from "../../common/authz/permissions";
import {
  ApiException,
  notFound,
} from "../../common/errors/api-error";
import { isUniqueViolation } from "../../common/errors/db-error";
import {
  decodeCursor,
  encodeCursor,
  type CursorPage,
} from "../../common/http/pagination";
import {
  assertVersion,
  bumpVersion,
} from "../../common/http/version";
import type { DbOrTx, Transaction } from "../../db/client";
import { DatabaseService } from "../../db/database.service";
import {
  sections,
  staff as staffTable,
  staffAssignments,
  subjects as subjectsTable,
} from "../../db/schema";
import type { RequestContext } from "../auth/auth.service";
import type {
  CreateAssignmentInput,
  CreateStaffInput,
  StaffAssignmentRow,
  StaffListQuery,
  StaffRecord,
  StaffSummaryWire,
  UpdateStaffInput,
} from "./staff.schemas";

@Injectable()
export class StaffService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async list(
    schoolId: string,
    query: StaffListQuery,
  ): Promise<CursorPage<StaffSummaryWire>> {
    const conditions = [
      eq(staffTable.schoolId, schoolId),
      eq(staffTable.status, query.status),
    ];

    if (query.status === "active") {
      conditions.push(isNull(staffTable.deletedAt));
    }

    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      const employeeId =
        typeof cursor.e === "string" ? cursor.e : undefined;
      const id = typeof cursor.i === "string" ? cursor.i : undefined;
      if (!employeeId || !id) {
        throw new ApiException(
          400,
          "INVALID_CURSOR",
          "The cursor parameter is not a valid page cursor.",
        );
      }
      const keyset = or(
        gt(staffTable.employeeId, employeeId),
        and(
          eq(staffTable.employeeId, employeeId),
          gt(staffTable.id, id),
        ),
      );
      if (keyset) conditions.push(keyset);
    }

    if (query.search) {
      const pattern = `%${query.search}%`;
      const matches = or(
        ilike(staffTable.nameEn, pattern),
        ilike(staffTable.nameBn, pattern),
        ilike(staffTable.employeeId, pattern),
      );
      if (matches) conditions.push(matches);
    }

    const rows = await this.database.db
      .select({
        id: staffTable.id,
        employeeId: staffTable.employeeId,
        nameEn: staffTable.nameEn,
        nameBn: staffTable.nameBn,
        designation: staffTable.designation,
        status: staffTable.status,
      })
      .from(staffTable)
      .where(and(...conditions))
      .orderBy(asc(staffTable.employeeId), asc(staffTable.id))
      .limit(query.limit + 1);

    const data = rows.slice(0, query.limit);
    const last = data.at(-1);
    return {
      data,
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor({ e: last.employeeId, i: last.id })
          : null,
    };
  }

  async record(
    user: CurrentUser,
    id: string,
    tx: DbOrTx = this.database.db,
  ): Promise<StaffRecord> {
    const [row] = await tx
      .select()
      .from(staffTable)
      .where(and(eq(staffTable.schoolId, user.schoolId), eq(staffTable.id, id)))
      .limit(1);
    if (!row || row.deletedAt) throw notFound("Staff");

    const assignments = await tx
      .select({
        id: staffAssignments.id,
        type: staffAssignments.type,
        sectionId: staffAssignments.sectionId,
        subjectId: staffAssignments.subjectId,
      })
      .from(staffAssignments)
      .where(eq(staffAssignments.staffId, id));

    return { ...toWire(row), assignments };
  }

  async create(
    user: CurrentUser,
    input: CreateStaffInput,
    context: RequestContext,
  ): Promise<StaffRecord> {
    const id = uuidv7();
    return this.database.db.transaction(async (tx) => {
      try {
        await tx.insert(staffTable).values({
          id,
          schoolId: user.schoolId,
          employeeId: input.employeeId,
          nameEn: input.nameEn,
          nameBn: input.nameBn,
          designation: input.designation,
          phone: input.phone ?? null,
          email: input.email ?? null,
          payLevel: input.payLevel ?? null,
          joinedAt: input.joinedAt ?? null,
          status: "active",
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ApiException(
            409,
            "EMPLOYEE_ID_TAKEN",
            `Employee ID ${input.employeeId} already exists in this school.`,
          );
        }
        throw error;
      }

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "staff.created",
        entityType: "staff",
        entityId: id,
        after: {
          employeeId: input.employeeId,
          nameEn: input.nameEn,
          designation: input.designation,
        },
        ...context,
      });

      return this.record(user, id, tx);
    });
  }

  async update(
    user: CurrentUser,
    id: string,
    patch: UpdateStaffInput,
    expectedVersion: number,
    context: RequestContext,
  ): Promise<StaffRecord> {
    return this.database.db.transaction(async (tx) => {
      // Lock the row first (the SchoolService pattern): under READ COMMITTED a
      // second PATCH that arrives with the same If-Match waits here and then
      // re-reads the new version, so it can neither pass the check below nor
      // overwrite the first write.
      const locked = await this.lockStaff(tx, user.schoolId, id);
      if (!locked || locked.deletedAt) throw notFound("Staff");
      assertVersion(expectedVersion, locked.version);
      const before = await this.record(user, id, tx);

      await tx
        .update(staffTable)
        .set({
          ...patch,
          version: bumpVersion(locked.version),
          updatedAt: new Date(),
        })
        .where(and(eq(staffTable.id, id), eq(staffTable.schoolId, user.schoolId)));

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "staff.updated",
        entityType: "staff",
        entityId: id,
        before,
        after: { ...patch, version: bumpVersion(locked.version) },
        ...context,
      });

      return this.record(user, id, tx);
    });
  }

  async addAssignment(
    user: CurrentUser,
    staffId: string,
    input: CreateAssignmentInput,
    context: RequestContext,
  ): Promise<StaffAssignmentRow> {
    const id = uuidv7();

    return this.database.db.transaction(async (tx) => {
      // Lock the staff row first (the guardian pattern): two identical
      // assignment POSTs serialise on that lock, and the loser re-reads the
      // winner's committed row below and answers 409 instead of inserting a
      // duplicate. `staff_assignments` has no unique index that could express
      // this rule, so the lock — not the database — is what keeps it under
      // concurrency.
      const locked = await this.lockStaff(tx, user.schoolId, staffId);
      if (!locked || locked.deletedAt) throw notFound("Staff");

      // Existing assignments are re-read inside the locked transaction; a
      // duplicate check against a pre-transaction read lets a parallel
      // identical POST slip through.
      const assignments = await tx
        .select({
          id: staffAssignments.id,
          type: staffAssignments.type,
          sectionId: staffAssignments.sectionId,
          subjectId: staffAssignments.subjectId,
        })
        .from(staffAssignments)
        .where(eq(staffAssignments.staffId, staffId));

      // `staff_assignments` carries single-column foreign keys only, so the
      // database cannot tell a section or subject of this school from one of
      // another school. These service-level checks are the tenancy gate.
      if (input.sectionId) {
        const [section] = await tx
          .select({ id: sections.id })
          .from(sections)
          .where(
            and(
              eq(sections.id, input.sectionId),
              eq(sections.schoolId, user.schoolId),
            ),
          )
          .limit(1);
        if (!section) throw notFound("Section");
      }
      if (input.subjectId) {
        const [subject] = await tx
          .select({ id: subjectsTable.id })
          .from(subjectsTable)
          .where(
            and(
              eq(subjectsTable.id, input.subjectId),
              eq(subjectsTable.schoolId, user.schoolId),
            ),
          )
          .limit(1);
        if (!subject) throw notFound("Subject");
      }

      const clash = assignments.find(
        (assignment) =>
          assignment.type === input.type &&
          assignment.sectionId === (input.sectionId ?? null) &&
          assignment.subjectId === (input.subjectId ?? null),
      );
      if (clash) {
        throw new ApiException(
          409,
          "ASSIGNMENT_EXISTS",
          "This staff member already holds that assignment.",
        );
      }

      await tx.insert(staffAssignments).values({
        id,
        schoolId: user.schoolId,
        staffId,
        type: input.type,
        sectionId: input.sectionId ?? null,
        subjectId: input.subjectId ?? null,
      });

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "staff.assignment_created",
        entityType: "staff",
        entityId: staffId,
        after: {
          assignmentId: id,
          type: input.type,
          sectionId: input.sectionId ?? null,
          subjectId: input.subjectId ?? null,
        },
        ...context,
      });

      const [created] = await tx
        .select({
          id: staffAssignments.id,
          type: staffAssignments.type,
          sectionId: staffAssignments.sectionId,
          subjectId: staffAssignments.subjectId,
        })
        .from(staffAssignments)
        .where(eq(staffAssignments.id, id))
        .limit(1);
      return created;
    });
  }

  /**
   * `SELECT … FOR UPDATE` on the staff row, taken as the first statement of
   * every staff-mutating transaction. For `update` the lock is what makes
   * the version re-check meaningful under READ COMMITTED; for
   * `addAssignment` it serialises the service-level duplicate-assignment
   * rule (no unique index backs it), so a parallel identical POST waits,
   * re-reads, and answers 409 instead of inserting a second row.
   */
  private async lockStaff(
    tx: Transaction,
    schoolId: string,
    id: string,
  ): Promise<typeof staffTable.$inferSelect | undefined> {
    const [row] = await tx
      .select()
      .from(staffTable)
      .where(and(eq(staffTable.id, id), eq(staffTable.schoolId, schoolId)))
      .limit(1)
      .for("update");
    return row;
  }
}

function toWire(row: typeof staffTable.$inferSelect) {
  return {
    id: row.id,
    employeeId: row.employeeId,
    nameEn: row.nameEn,
    nameBn: row.nameBn,
    designation: row.designation,
    status: row.status,
    phone: row.phone,
    email: row.email,
    payLevel: row.payLevel,
    joinedAt: row.joinedAt,
    avatarKey: row.avatarKey,
    version: row.version,
  };
}
