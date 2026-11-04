import { z } from "zod";
import { createZodDto } from "nestjs-zod";

import { pageOf } from "../http/api-schemas";

export const auditListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().min(1).max(512).optional(),
  from: z.iso
    .date()
    .transform((value) => new Date(`${value}T00:00:00+05:30`))
    .optional(),
  to: z.iso
    .date()
    .transform((value) => new Date(`${value}T00:00:00+05:30`))
    .optional(),
  actorUserId: z.uuid().optional(),
  action: z.string().min(2).max(64).optional(),
});

export type AuditListQueryDto = z.infer<typeof auditListQuerySchema>;

export const auditEventSchema = z.object({
  id: z.uuid(),
  actorUserId: z.uuid().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  requestId: z.string().nullable(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const auditPageSchema = pageOf(auditEventSchema);

export class AuditEventDto extends createZodDto(auditEventSchema) {}
export class AuditPageDto extends createZodDto(auditPageSchema) {}
