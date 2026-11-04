export type Role = "headmaster" | "teacher" | "clerk" | "management";

export type AssignmentType =
  | "class_teacher"
  | "subject_teacher"
  | "exam_coordinator"
  | "accountant"
  | "assistant_headmaster";

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
  | "staff.view"
  | "staff.create"
  | "staff.edit"
  | "sections.manage"
  | "audit.view"
  | "roles.manage";

export const ALL_PERMISSIONS: Permission[] = [
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
  "staff.view",
  "staff.create",
  "staff.edit",
  "sections.manage",
  "audit.view",
  "roles.manage",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  headmaster: ALL_PERMISSIONS,
  teacher: [
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
  ],
  clerk: [
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
    "staff.view",
    "staff.create",
    "staff.edit",
  ],
  management: [
    "dashboard.view",
    "analytics.view",
    "notices.view",
    "reports.view",
    "audit.view",
  ],
};

export const ASSISTANT_HEADMASTER_PERMISSIONS: Permission[] = [
  "substitutions.view",
  "substitutions.assign",
  "substitutions.claim",
  "staff_attendance.view",
];

export type StaffAssignment = {
  type: AssignmentType;
  sectionId: string | null;
  subjectId: string | null;
  examId: string | null;
};

export type CurrentUser = {
  userId: string;
  schoolId: string;
  employeeId: string;
  staffId: string;
  role: Role;
  nameEn: string;
  nameBn: string;
  designation: string;
  tokenVersion: number;
  isAssistantHeadmaster: boolean;
  assignments: StaffAssignment[];
  sectionIds: string[];
};
