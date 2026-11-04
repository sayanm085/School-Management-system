import { ApiException } from "../errors/api-error";

const TAG_PATTERN = /^W\/?"([^"]+)"$/;

export function parseIfMatch(header: string | undefined): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (trimmed === "*") return null;
  const matched = TAG_PATTERN.exec(trimmed);
  const raw = matched ? matched[1] : trimmed.replace(/^"|"$/g, "");
  const version = Number(raw);
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new ApiException(
      400,
      "INVALID_ENTITY_TAG",
      "If-Match must carry a positive integer entity tag.",
    );
  }
  return version;
}

export function entityTag(version: number): string {
  return `"${version}"`;
}

export function versionConflict(expected: number, current: number): ApiException {
  return new ApiException(
    409,
    "VERSION_CONFLICT",
    "The record changed since it was read. Reload it before saving.",
    { expected, current },
  );
}

export function assertVersion(expected: number | null, current: number): void {
  if (expected === null || expected === current) return;
  throw versionConflict(expected, current);
}

export function bumpVersion(current: number): number {
  return current + 1;
}

export function requireIfMatch(header: string | undefined): number {
  const version = parseIfMatch(header);
  if (version === null) {
    throw new ApiException(
      428,
      "PRECONDITION_REQUIRED",
      "Send If-Match with the version you read before updating.",
    );
  }
  return version;
}
