import { TODAY } from "@/lib/data/selectors";
import type { Database, Role, Staff } from "@/lib/types";

export type Permission =
  | "dashboard.view"
  | "students.view"
  | "students.edit"
  | "students.create"
  | "admissions.view"
  | "admissions.manage"
  | "admissions.approve"
  | "attendance.view"
  | "attendance.mark"
  | "attendance.correct"
  | "attendance.approve"
  | "staff_attendance.view"
  | "staff_attendance.manage"
  | "substitutions.view"
  | "substitutions.assign"
  | "substitutions.claim"
  | "exams.view"
  | "exams.manage"
  | "marks.enter"
  | "results.publish"
  | "fees.view"
  | "fees.manage"
  | "fees.collect"
  | "fees.waive"
  | "salary.view"
  | "salary.prepare"
  | "salary.approve"
  | "analytics.view"
  | "analytics.pii"
  | "notices.view"
  | "notices.publish"
  | "reports.view"
  | "reports.export"
  | "settings.manage"
  | "settings.fees"
  | "audit.view"
  | "roles.manage";

const headmaster: Permission[] = [
  "dashboard.view",
  "students.view",
  "students.edit",
  "students.create",
  "admissions.view",
  "admissions.manage",
  "admissions.approve",
  "attendance.view",
  "attendance.mark",
  "attendance.correct",
  "attendance.approve",
  "staff_attendance.view",
  "staff_attendance.manage",
  "substitutions.view",
  "substitutions.assign",
  "substitutions.claim",
  "exams.view",
  "exams.manage",
  "marks.enter",
  "results.publish",
  "fees.view",
  "fees.manage",
  "fees.collect",
  "fees.waive",
  "salary.view",
  "salary.prepare",
  "salary.approve",
  "analytics.view",
  "analytics.pii",
  "notices.view",
  "notices.publish",
  "reports.view",
  "reports.export",
  "settings.manage",
  "settings.fees",
  "audit.view",
  "roles.manage",
];

const teacher: Permission[] = [
  "dashboard.view",
  "students.view",
  "attendance.view",
  "attendance.mark",
  "substitutions.view",
  "substitutions.claim",
  "exams.view",
  "marks.enter",
  "analytics.view",
  "notices.view",
  "reports.view",
  "salary.view",
];

const clerk: Permission[] = [
  "dashboard.view",
  "students.view",
  "students.edit",
  "students.create",
  "admissions.view",
  "admissions.manage",
  "attendance.view",
  "attendance.correct",
  "staff_attendance.view",
  "staff_attendance.manage",
  "exams.view",
  "fees.view",
  "fees.manage",
  "fees.collect",
  "salary.view",
  "salary.prepare",
  "analytics.view",
  "notices.view",
  "notices.publish",
  "reports.view",
  "reports.export",
  "settings.fees",
];

const management: Permission[] = [
  "dashboard.view",
  "analytics.view",
  "notices.view",
  "reports.view",
  "audit.view",
];

const byRole: Record<Role, Permission[]> = {
  headmaster,
  teacher,
  clerk,
  management,
  support: [],
};

export function can(role: Role | null | undefined, permission: Permission) {
  if (!role) return false;
  return byRole[role]?.includes(permission) ?? false;
}

export function canAccessSection(
  staff: Staff | null | undefined,
  sectionId: string,
) {
  if (!staff) return false;
  if (staff.role === "headmaster" || staff.role === "clerk") return true;
  if (staff.role !== "teacher") return false;

  return staff.assignments.some(
    (assignment) =>
      (assignment.type === "class_teacher" ||
        assignment.type === "subject_teacher") &&
      assignment.sectionId === sectionId,
  );
}

export function isSubstituteToday(
  db: Database,
  staffId: string,
  sectionId: string,
) {
  return db.substitutions.some(
    (item) =>
      item.date === TODAY &&
      item.substituteTeacherId === staffId &&
      item.sectionId === sectionId,
  );
}

export function canMarkAttendanceForSection(
  staff: Staff | null | undefined,
  sectionId: string,
  db: Database,
) {
  if (canAccessSection(staff, sectionId)) return true;
  if (!staff || staff.role !== "teacher") return false;
  return isSubstituteToday(db, staff.id, sectionId);
}

export function canApprove(role: Role | null | undefined) {
  return role === "headmaster";
}

export function canPublishResults(role: Role | null | undefined) {
  return role === "headmaster";
}
