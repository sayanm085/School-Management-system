import { HttpException } from "@nestjs/common";

import {
  foreignKeyConstraint,
  isForeignKeyViolation,
} from "./db-error";

export class ApiException extends HttpException {
  constructor(
    status: number,
    code: string,
    message: string,
    extras?: Record<string, unknown>,
  ) {
    super({ code, message, ...extras }, status);
  }
}

/** Constraint-name suffix shared by the composite `(school_id, …)` tenancy keys. */
const SCHOOL_FK_SUFFIX = "_school_fk";

/**
 * The composite `(school_id, …)` foreign keys are the tenancy backstop: when
 * the database rejects a body-supplied parent row because it belongs to
 * another school, that is a permission problem, not a server fault. Any other
 * foreign-key violation (a genuinely missing parent) returns null and keeps
 * the caller's existing handling; the constraint name travels as an extension
 * member so the problem document stays diagnosable.
 */
export function crossSchoolForeignKey(error: unknown): ApiException | null {
  if (!isForeignKeyViolation(error)) return null;
  const constraint = foreignKeyConstraint(error);
  if (!constraint || !constraint.endsWith(SCHOOL_FK_SUFFIX)) return null;
  return new ApiException(
    403,
    "FORBIDDEN",
    "That record belongs to another school.",
    { constraint },
  );
}

export function authRequired() {
  return new ApiException(
    401,
    "AUTH_REQUIRED",
    "Authentication is required.",
  );
}

export function invalidCredentials() {
  return new ApiException(
    401,
    "AUTH_INVALID_CREDENTIALS",
    "The school code, employee ID, or password is incorrect.",
  );
}

export function mfaRequired() {
  return new ApiException(
    401,
    "AUTH_MFA_REQUIRED",
    "A valid MFA verification is required.",
  );
}

export function forbidden(required?: string[]) {
  return new ApiException(
    403,
    "FORBIDDEN",
    "You do not have permission to perform this action.",
    required ? { required } : undefined,
  );
}

export function notFound(resource = "Resource") {
  return new ApiException(
    404,
    "NOT_FOUND",
    `${resource} was not found.`,
  );
}
