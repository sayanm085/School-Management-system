import { Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";

import type {
  CurrentUser,
  StaffAssignment,
} from "../../common/authz/permissions";
import { DatabaseService } from "../../db/database.service";
import {
  staff,
  staffAssignments,
  users,
} from "../../db/schema";
import type { AccessClaims } from "./token.service";

export type UserRecord = {
  userId: string;
  staffId: string;
  schoolId: string;
  employeeId: string;
  email: string | null;
  role: CurrentUser["role"];
  status: "active" | "disabled";
  mfaEnabled: boolean;
  mfaSecretEncrypted: string | null;
  tokenVersion: number;
  failedLoginCount: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  passwordHash: string;
  nameEn: string;
  nameBn: string;
  designation: string;
  assignments: StaffAssignment[];
  isAssistantHeadmaster: boolean;
};

@Injectable()
export class SessionService {
  constructor(private readonly database: DatabaseService) {}

  async findByEmployee(
    schoolId: string,
    employeeId: string,
  ): Promise<UserRecord | null> {
    const rows = await this.database.db
      .select(userColumns())
      .from(users)
      .innerJoin(staff, and(eq(users.staffId, staff.id), isNull(staff.deletedAt)))
      .where(and(eq(users.schoolId, schoolId), eq(users.employeeId, employeeId)))
      .limit(1);
    const row = rows[0];
    return row ? this.withAssignments(row) : null;
  }

  async findById(userId: string): Promise<UserRecord | null> {
    const rows = await this.database.db
      .select(userColumns())
      .from(users)
      .innerJoin(staff, and(eq(users.staffId, staff.id), isNull(staff.deletedAt)))
      .where(eq(users.id, userId))
      .limit(1);
    const row = rows[0];
    return row ? this.withAssignments(row) : null;
  }

  async loadCurrentUser(claims: AccessClaims): Promise<CurrentUser | null> {
    const record = await this.findById(claims.sub);
    if (!record || record.status !== "active") return null;
    if (record.tokenVersion !== claims.tv) return null;
    return {
      userId: record.userId,
      schoolId: record.schoolId,
      employeeId: record.employeeId,
      staffId: record.staffId,
      role: record.role,
      nameEn: record.nameEn,
      nameBn: record.nameBn,
      designation: record.designation,
      tokenVersion: record.tokenVersion,
      isAssistantHeadmaster: record.isAssistantHeadmaster,
      assignments: record.assignments,
      sectionIds: uniqueSectionIds(record.assignments),
    };
  }

  private async withAssignments(
    row: UserRow,
  ): Promise<UserRecord> {
    const rows = await this.database.db
      .select({
        type: staffAssignments.type,
        sectionId: staffAssignments.sectionId,
        subjectId: staffAssignments.subjectId,
        examId: staffAssignments.examId,
      })
      .from(staffAssignments)
      .where(eq(staffAssignments.staffId, row.staffId));

    return {
      ...row,
      assignments: rows,
      isAssistantHeadmaster: rows.some(
        (assignment) => assignment.type === "assistant_headmaster",
      ),
    };
  }
}

function userColumns() {
  return {
    userId: users.id,
    staffId: staff.id,
    schoolId: users.schoolId,
    employeeId: users.employeeId,
    email: users.email,
    role: users.role,
    status: users.status,
    mfaEnabled: users.mfaEnabled,
    mfaSecretEncrypted: users.mfaSecretEncrypted,
    tokenVersion: users.tokenVersion,
    failedLoginCount: users.failedLoginCount,
    lockedUntil: users.lockedUntil,
    lastLoginAt: users.lastLoginAt,
    passwordHash: users.passwordHash,
    nameEn: staff.nameEn,
    nameBn: staff.nameBn,
    designation: staff.designation,
  };
}

type UserRow = Omit<
  UserRecord,
  "assignments" | "isAssistantHeadmaster"
>;

function uniqueSectionIds(assignments: StaffAssignment[]): string[] {
  const ids = assignments
    .map((assignment) => assignment.sectionId)
    .filter((id): id is string => typeof id === "string");
  return Array.from(new Set(ids));
}
