const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

export function errorCode(error: unknown): string | null {
  let current: unknown = error;
  while (current instanceof Error) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return null;
}

export function isUniqueViolation(error: unknown): boolean {
  return errorCode(error) === UNIQUE_VIOLATION;
}

export function isForeignKeyViolation(error: unknown): boolean {
  return errorCode(error) === FOREIGN_KEY_VIOLATION;
}

/**
 * The name of the constraint the server blamed, walking the cause chain the
 * way `errorCode` does; postgres-js reports it in `constraint_name` (for
 * 23503 foreign-key errors the same way it does for 23505 unique ones).
 */
export function foreignKeyConstraint(error: unknown): string | null {
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
