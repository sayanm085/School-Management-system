import { z } from "zod";
import { createZodDto } from "nestjs-zod";

/**
 * The members every problem document carries: the RFC 9457 core plus the two
 * Baranda additions (`code`, `requestId`). `ProblemDetailsFilter` builds them;
 * the schemas below add the extension members individual error variants carry.
 */
const problemCore = {
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  code: z.string(),
  detail: z.string(),
  requestId: z.string(),
  instance: z.string(),
};

export const problemSchema = z.object({
  ...problemCore,
  errors: z
    .array(
      z.object({
        path: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
});

export type ProblemBody = z.infer<typeof problemSchema>;

export function pageOf<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    nextCursor: z.string().nullable(),
  });
}

export class ProblemDto extends createZodDto(problemSchema) {}

/**
 * `409 VERSION_CONFLICT` — `versionConflict()` in `common/http/version.ts`
 * sends the tag the client offered and the tag the row actually holds, so a
 * client can reload and rebase instead of guessing. Both are required: the
 * variant never appears without them.
 */
export const versionConflictProblemSchema = z.object({
  ...problemCore,
  expected: z.number().int().positive(),
  current: z.number().int().positive(),
});

export class VersionConflictProblemDto extends createZodDto(
  versionConflictProblemSchema,
) {}

/**
 * `403` raised by `crossSchoolForeignKey()` in `common/errors/db-error.ts`: a
 * body-supplied parent row belongs to another school, and the composite
 * `(school_id, …)` constraint that blamed it travels as `constraint` so the
 * rejection stays diagnosable.
 */
export const crossSchoolProblemSchema = z.object({
  ...problemCore,
  constraint: z.string(),
});

export class CrossSchoolProblemDto extends createZodDto(
  crossSchoolProblemSchema,
) {}

/**
 * Response declaration for an error status whose payload has more than one
 * variant: the documented extension-member variant plus the plain problem
 * document the same status can still carry. `anyOf` keeps both honest without
 * over-constraining the variants that send no extras.
 */
export function problemVariants(...named: string[]) {
  return {
    anyOf: [
      ...named.map((name) => ({
        $ref: `#/components/schemas/${name}`,
      })),
      { $ref: "#/components/schemas/ProblemDto" },
    ],
  };
}
