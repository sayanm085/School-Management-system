import { describe, expect, test } from "vitest";

import { PolicyService } from "../src/common/authz/policy.service";
import {
  ASSISTANT_HEADMASTER_PERMISSIONS,
  ROLE_PERMISSIONS,
} from "../src/common/authz/permissions";
import type {
  CurrentUser,
  Permission,
  Role,
  StaffAssignment,
} from "../src/common/authz/permissions";

const policy = new PolicyService();

function user(overrides: Partial<CurrentUser> & { role: Role }): CurrentUser {
  const assignments: StaffAssignment[] = overrides.assignments ?? [];
  return {
    userId: "01900000-0000-7000-8000-000000000001",
    schoolId: "01900000-0000-7000-8000-000000000002",
    employeeId: "TCH-001",
    staffId: "01900000-0000-7000-8000-000000000003",
    nameEn: "Test",
    nameBn: "পরীক্ষা",
    designation: "Teacher",
    tokenVersion: 1,
    isAssistantHeadmaster: false,
    assignments,
    sectionIds: [],
    ...overrides,
  };
}

describe("role permission matrix", () => {
  const headmaster = user({ role: "headmaster" });
  const teacher = user({ role: "teacher" });
  const clerk = user({ role: "clerk" });
  const management = user({ role: "management" });

  const everyPermission: Permission[] = [
    "students.view",
    "attendance.mark",
    "fees.collect",
    "salary.approve",
    "substitutions.assign",
    "audit.view",
    "roles.manage",
  ];

  test("the headmaster holds every permission", () => {
    for (const permission of everyPermission) {
      expect(policy.can(headmaster, permission), permission).toBe(true);
    }
  });

  test("a teacher teaches, marks attendance and claims cover only", () => {
    expect(policy.can(teacher, "attendance.mark")).toBe(true);
    expect(policy.can(teacher, "substitutions.claim")).toBe(true);
    expect(policy.can(teacher, "substitutions.assign")).toBe(false);
    expect(policy.can(teacher, "fees.collect")).toBe(false);
    expect(policy.can(teacher, "salary.approve")).toBe(false);
    expect(policy.can(teacher, "students.edit")).toBe(false);
    expect(policy.can(teacher, "audit.view")).toBe(false);
  });

  test("the clerk runs fees, admissions and staff attendance", () => {
    expect(policy.can(clerk, "fees.collect")).toBe(true);
    expect(policy.can(clerk, "admissions.manage")).toBe(true);
    expect(policy.can(clerk, "staff_attendance.manage")).toBe(true);
    expect(policy.can(clerk, "salary.approve")).toBe(false);
    expect(policy.can(clerk, "results.publish")).toBe(false);
    expect(policy.can(clerk, "substitutions.claim")).toBe(false);
  });

  test("management sees aggregates, never named students", () => {
    expect(policy.can(management, "analytics.view")).toBe(true);
    expect(policy.can(management, "audit.view")).toBe(true);
    expect(policy.can(management, "students.view")).toBe(false);
    expect(policy.can(management, "analytics.pii")).toBe(false);
    expect(policy.can(management, "attendance.mark")).toBe(false);
  });
});

describe("assistant headmaster assignment", () => {
  const teacher = user({ role: "teacher" });
  const assistant = user({
    role: "teacher",
    isAssistantHeadmaster: true,
    assignments: [{ type: "assistant_headmaster", sectionId: null, subjectId: null, examId: null }],
  });

  test("adds cover management without opening money or results", () => {
    expect(policy.can(assistant, "substitutions.assign")).toBe(true);
    expect(policy.can(assistant, "staff_attendance.view")).toBe(true);
    expect(policy.can(assistant, "salary.approve")).toBe(false);
    expect(policy.can(assistant, "fees.waive")).toBe(false);
    expect(policy.can(assistant, "students.edit")).toBe(false);
  });

  test("is purely additive to the teacher permission set", () => {
    const base = policy.permissionsFor(teacher);
    const withRole = policy.permissionsFor(assistant);
    for (const permission of base) {
      expect(withRole).toContain(permission);
    }
    expect(withRole.length).toBeGreaterThan(base.length);
  });
});

describe("section scope", () => {
  const teacher = user({
    role: "teacher",
    sectionIds: ["section-viii-b", "section-ix-a"],
    assignments: [
      { type: "subject_teacher", sectionId: "section-viii-b", subjectId: "psci", examId: null },
      { type: "class_teacher", sectionId: "section-ix-a", subjectId: null, examId: null },
    ],
  });

  test("a teacher reaches only assigned sections", () => {
    expect(policy.canAccessSection(teacher, "section-viii-b")).toBe(true);
    expect(policy.canAccessSection(teacher, "section-ix-a")).toBe(true);
    expect(policy.canAccessSection(teacher, "section-x-a")).toBe(false);
  });

  test("headmaster and clerk reach every section, management reaches none", () => {
    expect(
      policy.canAccessSection(user({ role: "headmaster" }), "section-x-a"),
    ).toBe(true);
    expect(policy.canAccessSection(user({ role: "clerk" }), "section-x-a")).toBe(
      true,
    );
    expect(
      policy.canAccessSection(user({ role: "management" }), "section-x-a"),
    ).toBe(false);
  });

  test("roleHas reports the base role table only", () => {
    expect(policy.roleHas("teacher", "substitutions.assign")).toBe(false);
    expect(policy.roleHas("headmaster", "substitutions.assign")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 8 fix round 2, item 1 — the invariant the audit diff gate rests on.
//
// GET /v1/audit gates its `before`/`after` diff payloads on ONE permission, for
// the whole page, with no awareness of entity type and no awareness of section:
// `src/modules/audit/audit.controller.ts:60` is
// `const withDiff = this.policy.can(user, "students.view")`.
//
// That gate is correct today because of *who can hold* `audit.view` — headmaster
// (whole-school student + staff reader) and management (neither) — not because
// of anything the controller computes. Nothing in the suite pinned that
// "who", so the gate was one permission grant away from being wrong in silence:
// adding `"audit.view"` to `teacher` would hand a section-scoped reader the
// diff of every student in the school (dob, address, guardian phones), and a
// future `audit.view` + `students.view` without `staff.view` role would read
// staff phone/email/pay grade out of the audit feed while being refused
// GET /v1/staff — because staff amendments store the whole staff record as
// `before` (src/modules/staff/staff.service.ts:206, :224).
//
// These are unit tests over the permission table, deliberately placed here
// rather than in pii.e2e-spec.ts: the assumption lives in `ROLE_PERMISSIONS`,
// this file is the existing home of the permission model, and a DB-free test
// fails in milliseconds with the role's name in the message instead of
// needing a booted app and a PII fixture to notice the grant. The wire
// behaviour the invariant protects stays in pii.e2e-spec.ts tests 1-3.
//
// Written as rules, not as a snapshot of the table: a snapshot would have to be
// edited on every legitimate permission change and would then be ignored.
// ---------------------------------------------------------------------------
describe("audit reader invariant (protects the diff gate at audit.controller.ts:60)", () => {
  /** The permissions the audit gate treats as one bundle. */
  const GATED: Permission[] = ["students.view", "staff.view"];

  function auditReaders(): Role[] {
    return (Object.keys(ROLE_PERMISSIONS) as Role[]).filter((role) =>
      policy.roleHas(role, "audit.view"),
    );
  }

  test("every role that can read the audit log holds both gated permissions or neither", () => {
    const readers = auditReaders();
    // Non-vacuity: if audit.view were removed from every role, the sweep below
    // would pass while proving nothing.
    expect(readers.length, "some role must hold audit.view").toBeGreaterThan(0);

    const violations: string[] = [];
    for (const role of readers) {
      const holds = GATED.map((permission) => policy.roleHas(role, permission));
      const allOrNone = holds.every((held) => held) || holds.every((held) => !held);
      if (!allOrNone) {
        violations.push(
          `${role}: audit.view with ${GATED
            .map((permission, i) => `${permission}=${holds[i]}`)
            .join(", ")}`,
        );
      }
    }

    // Breaking here means `students.view` is no longer a sound stand-in for
    // authority over both data classes in audit_events. The fix is NOT to edit
    // this test: make `withDiff` per-entityType (student/guardian.* rows gated
    // on students.view, staff rows on staff.view) at
    // src/modules/audit/audit.controller.ts:60, then re-check §3.2 for the new
    // role.
    expect(
      violations,
      "an audit reader holding one of students.view/staff.view but not the other can read the other class's payloads from the audit feed while being refused its own record route; gate withDiff per entityType before granting this combination",
    ).toEqual([]);
  });

  test("no role whose student reads are section-scoped can read the audit log", () => {
    const probes = ["section-viii-b", "section-ix-a", "section-x-a"];
    for (const role of auditReaders()) {
      // A role that reaches some sections and not others is section-scoped
      // (teacher, per PolicyService.canAccessSection); headmaster/clerk reach
      // all, management reaches none.
      const reachable = new Set(
        probes.map((sectionId) =>
          policy.canAccessSection(user({ role, sectionIds: [probes[0], probes[1]] }), sectionId),
        ),
      );
      expect(
        reachable.size,
        `role "${role}" holds audit.view but its student access is section-scoped; the audit gate is whole-school by construction, so it would return diffs for students this role may not open. Section-scope withDiff via canAccessSection before shipping this grant`,
      ).toBe(1);
    }
  });

  test("the assistant-headmaster augmentation cannot change who the sweep covers", () => {
    // PolicyService.can() adds ASSISTANT_HEADMASTER_PERMISSIONS on top of the
    // role table, which would make a table-only sweep blind. It must never add
    // a permission this invariant is about.
    for (const permission of ["audit.view", ...GATED] as Permission[]) {
      expect(
        ASSISTANT_HEADMASTER_PERMISSIONS,
        `the audit gate is decided by ROLE_PERMISSIONS alone; adding "${permission}" to the assignment would need this invariant extended to the augmented set`,
      ).not.toContain(permission);
    }
  });
});
