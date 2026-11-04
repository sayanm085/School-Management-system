import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { pageOf } from "../../common/http/api-schemas";

export const guardianRelationships = [
  "father",
  "mother",
  "guardian",
  "other",
] as const;

export const guardianSchema = z.object({
  id: z.uuid(),
  nameEn: z.string(),
  nameBn: z.string(),
  phone: z.string(),
  altPhone: z.string().nullable(),
  address: z.string().nullable(),
  relationship: z.enum(guardianRelationships),
  isPrimary: z.boolean(),
});

export const guardianListSchema = pageOf(guardianSchema);

export class GuardianDto extends createZodDto(guardianSchema) {}
export class GuardianListDto extends createZodDto(guardianListSchema) {}

export type GuardianRow = z.infer<typeof guardianSchema>;

export const attachGuardianSchema = z
  .object({
    guardianId: z.uuid().optional(),
    nameEn: z.string().min(2).max(120).optional(),
    nameBn: z.string().min(2).max(120).optional(),
    phone: z
      .string()
      .regex(/^\d{10}$/, "Enter a 10-digit mobile number")
      .optional(),
    altPhone: z
      .string()
      .regex(/^\d{10}$/, "Enter a 10-digit mobile number")
      .nullable()
      .optional(),
    address: z.string().min(3).max(240).nullable().optional(),
    relationship: z.enum(guardianRelationships).default("guardian"),
    isPrimary: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.guardianId) return;
    for (const field of ["nameEn", "nameBn", "phone"] as const) {
      if (!value[field]) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `Provide ${field}, or a guardianId to link an existing guardian.`,
        });
      }
    }
  });

export class AttachGuardianDto extends createZodDto(attachGuardianSchema) {}

export type AttachGuardianInput = z.infer<typeof attachGuardianSchema>;
