import { z } from "zod";

import { ApiException } from "../errors/api-error";

export const pageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().min(1).max(1024).optional(),
});

export type PageQuery = z.infer<typeof pageQuerySchema>;

export type CursorPage<T> = {
  data: T[];
  nextCursor: string | null;
};

export function encodeCursor(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new ApiException(
      400,
      "INVALID_CURSOR",
      "The cursor parameter is not a valid page cursor.",
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ApiException(
      400,
      "INVALID_CURSOR",
      "The cursor parameter is not a valid page cursor.",
    );
  }
  return parsed as Record<string, unknown>;
}
