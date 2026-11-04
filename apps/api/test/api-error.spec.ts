// apps/api/test/api-error.spec.ts
import { describe, expect, test } from "vitest";

import {
  ApiException,
  crossSchoolForeignKey,
} from "../src/common/errors/api-error";

/**
 * postgres-js surfaces SQLSTATE and the violated constraint directly on the
 * error (or on its cause when the driver wraps it), which is the shape
 * `errorCode`/`foreignKeyConstraint` in db-error.ts walk.
 */
function pgError(fields: Record<string, unknown>): Error {
  return Object.assign(new Error("database refused the statement"), fields);
}

describe("crossSchoolForeignKey", () => {
  test("a composite school foreign key becomes a 403 naming the constraint", () => {
    const problem = crossSchoolForeignKey(
      pgError({
        code: "23503",
        constraint_name: "students_section_school_fk",
      }),
    );
    expect(problem).toBeInstanceOf(ApiException);
    expect(problem?.getStatus()).toBe(403);
    expect(problem?.getResponse()).toMatchObject({
      code: "FORBIDDEN",
      message: "That record belongs to another school.",
      constraint: "students_section_school_fk",
    });
  });

  test("the constraint may sit on the cause, the way wrapped driver errors look", () => {
    const cause = pgError({
      code: "23503",
      constraint_name: "student_guardians_guardian_school_fk",
    });
    const problem = crossSchoolForeignKey(
      Object.assign(new Error("query failed"), { cause }),
    );
    expect(problem?.getStatus()).toBe(403);
    expect(
      (problem?.getResponse() as Record<string, unknown>).constraint,
    ).toBe("student_guardians_guardian_school_fk");
  });

  test("a foreign key on a plain (non-school) parent is not tenancy", () => {
    // A missing parent — the 0003 single-column FKs that still exist on
    // student_guardians — must keep the caller's existing handling, so the
    // helper only ever fires for constraints ending in `_school_fk`.
    const problem = crossSchoolForeignKey(
      pgError({
        code: "23503",
        constraint_name: "student_guardians_student_id_students_id_fk",
      }),
    );
    expect(problem).toBeNull();
  });

  test("a foreign key without a constraint name is not tenancy", () => {
    expect(crossSchoolForeignKey(pgError({ code: "23503" }))).toBeNull();
  });

  test("a unique violation belongs to the caller's conflict mapping", () => {
    const problem = crossSchoolForeignKey(
      pgError({
        code: "23505",
        constraint_name: "students_school_admission_uq",
      }),
    );
    expect(problem).toBeNull();
  });

  test("any other error is left alone", () => {
    expect(crossSchoolForeignKey(new Error("boom"))).toBeNull();
  });
});
