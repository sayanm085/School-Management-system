import { Injectable } from "@nestjs/common";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import { AuditService } from "../../common/audit/audit.service";
import type { CurrentUser } from "../../common/authz/permissions";
import { PolicyService } from "../../common/authz/policy.service";
import {
  ApiException,
  crossSchoolForeignKey,
  notFound,
} from "../../common/errors/api-error";
import { isUniqueViolation } from "../../common/errors/db-error";
import type { DbOrTx } from "../../db/client";
import { DatabaseService } from "../../db/database.service";
import { guardians, studentGuardians, students } from "../../db/schema";
import type { RequestContext } from "../auth/auth.service";
import { toGuardianRow } from "./guardian.mapper";
import type { AttachGuardianInput, GuardianRow } from "./guardian.schemas";

@Injectable()
export class GuardianService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly policy: PolicyService,
  ) {}

  async listForStudent(
    user: CurrentUser,
    studentId: string,
  ): Promise<{ data: GuardianRow[]; nextCursor: null }> {
    await this.student(user, studentId);
    return { data: await this.rows(studentId), nextCursor: null };
  }

  async attach(
    user: CurrentUser,
    studentId: string,
    input: AttachGuardianInput,
    context: RequestContext,
  ): Promise<GuardianRow> {
    await this.student(user, studentId);

    return this.database.db.transaction(async (tx) => {
      await this.lockStudent(tx, user, studentId);

      const guardianId = input.guardianId ?? (await this.createPerson(tx, user, input));

      // The demote happens inside the same transaction as the insert, so the
      // order of the two writes is safe. It is lockStudent's row lock, not
      // this order, that serialises guardian writes per student: without the
      // lock, two concurrent primary attaches under READ COMMITTED could both
      // demote (zero rows) and both insert isPrimary, leaving two primaries.
      if (input.isPrimary) {
        await tx
          .update(studentGuardians)
          .set({ isPrimary: false })
          .where(eq(studentGuardians.studentId, studentId));
      }

      try {
        await tx.insert(studentGuardians).values({
          id: uuidv7(),
          schoolId: user.schoolId,
          studentId,
          guardianId,
          relationship: input.relationship,
          isPrimary: input.isPrimary,
        });
      } catch (error) {
        // A body-supplied guardianId from another school is tenancy (403);
        // the pair-unique index is the already-linked conflict (409);
        // anything else keeps the generic path.
        const crossSchool = crossSchoolForeignKey(error);
        if (crossSchool) throw crossSchool;
        if (isUniqueViolation(error)) {
          throw new ApiException(
            409,
            "GUARDIAN_ALREADY_LINKED",
            "This guardian is already linked to the student.",
          );
        }
        throw error;
      }

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "guardian.attached",
        entityType: "student",
        entityId: studentId,
        after: {
          guardianId,
          relationship: input.relationship,
          isPrimary: input.isPrimary,
        },
        ...context,
      });

      const created = (await this.rows(studentId, tx)).find(
        (row) => row.id === guardianId,
      );
      if (!created) throw notFound("Guardian");
      return created;
    });
  }

  async detach(
    user: CurrentUser,
    studentId: string,
    guardianId: string,
    context: RequestContext,
  ): Promise<void> {
    await this.student(user, studentId);
    return this.database.db.transaction(async (tx) => {
      await this.lockStudent(tx, user, studentId);

      const deleted = await tx
        .delete(studentGuardians)
        .where(
          and(
            eq(studentGuardians.studentId, studentId),
            eq(studentGuardians.guardianId, guardianId),
          ),
        )
        .returning({ id: studentGuardians.id });
      if (deleted.length === 0) throw notFound("Guardian link");

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "guardian.detached",
        entityType: "student",
        entityId: studentId,
        before: { guardianId },
        after: { detached: true },
        ...context,
      });
    });
  }

  async setPrimary(
    user: CurrentUser,
    studentId: string,
    guardianId: string,
    context: RequestContext,
  ): Promise<void> {
    await this.student(user, studentId);
    return this.database.db.transaction(async (tx) => {
      await this.lockStudent(tx, user, studentId);

      const [link] = await tx
        .select({ id: studentGuardians.id })
        .from(studentGuardians)
        .where(
          and(
            eq(studentGuardians.studentId, studentId),
            eq(studentGuardians.guardianId, guardianId),
          ),
        )
        .limit(1);
      if (!link) throw notFound("Guardian link");

      await tx
        .update(studentGuardians)
        .set({ isPrimary: false })
        .where(eq(studentGuardians.studentId, studentId));
      await tx
        .update(studentGuardians)
        .set({ isPrimary: true })
        .where(eq(studentGuardians.id, link.id));

      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "guardian.primary_changed",
        entityType: "student",
        entityId: studentId,
        after: { guardianId },
        ...context,
      });
    });
  }

  /**
   * `SELECT … FOR UPDATE` on the student row, taken at the start of every
   * guardian-mutating transaction: guardian writes for one student are
   * serialised against each other. `student_guardians` has no unique index
   * that can express "at most one primary", so this lock — not the
   * demote-then-promote order — is what keeps concurrent mutations from
   * leaving two primary links under READ COMMITTED.
   */
  private async lockStudent(
    tx: DbOrTx,
    user: CurrentUser,
    studentId: string,
  ): Promise<void> {
    const [row] = await tx
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, user.schoolId)))
      .limit(1)
      .for("update");
    if (!row) throw notFound("Student");
  }

  private async createPerson(
    tx: DbOrTx,
    user: CurrentUser,
    input: AttachGuardianInput,
  ): Promise<string> {
    const id = uuidv7();
    await tx.insert(guardians).values({
      id,
      schoolId: user.schoolId,
      nameEn: input.nameEn ?? "",
      nameBn: input.nameBn ?? "",
      phone: input.phone ?? "",
      altPhone: input.altPhone ?? null,
      address: input.address ?? null,
    });
    return id;
  }

  private async student(user: CurrentUser, studentId: string) {
    const [row] = await this.database.db
      .select({ id: students.id, sectionId: students.sectionId })
      .from(students)
      .where(
        and(
          eq(students.id, studentId),
          eq(students.schoolId, user.schoolId),
          isNull(students.deletedAt),
        ),
      )
      .limit(1);
    if (!row) throw notFound("Student");
    if (!this.policy.canAccessSection(user, row.sectionId)) {
      throw new ApiException(
        403,
        "FORBIDDEN",
        "You do not have permission to perform this action.",
        { required: ["students.view"] },
      );
    }
    return row;
  }

  private async rows(
    studentId: string,
    tx = this.database.db,
  ): Promise<GuardianRow[]> {
    const links = await tx
      .select({
        guardians: guardians,
        relationship: studentGuardians.relationship,
        isPrimary: studentGuardians.isPrimary,
      })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .where(eq(studentGuardians.studentId, studentId))
      .orderBy(desc(studentGuardians.isPrimary), sql`${guardians.nameEn} asc`);
    return links.map(toGuardianRow);
  }
}
