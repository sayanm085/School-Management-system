import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { pageOf } from "../../common/http/api-schemas";

export const staffListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().min(1).max(1024).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  search: z.string().min(1).max(64).optional(),
});

export type StaffListQuery = z.infer<typeof staffListQuerySchema>;

export const staffSummarySchema = z.object({
  id: z.uuid(),
  employeeId: z.string(),
  nameEn: z.string(),
  nameBn: z.string(),
  designation: z.string(),
  status: z.enum(["active", "inactive"]),
});

export const staffAssignmentSchema = z.object({
  id: z.uuid(),
  type: z.enum([
    "class_teacher",
    "subject_teacher",
    "exam_coordinator",
    "accountant",
    "assistant_headmaster",
  ]),
  sectionId: z.uuid().nullable(),
  subjectId: z.uuid().nullable(),
});

export const staffRecordSchema = staffSummarySchema.extend({
  phone: z.string().nullable(),
  email: z.string().nullable(),
  payLevel: z.string().nullable(),
  joinedAt: z.iso.date().nullable(),
  avatarKey: z.string().nullable(),
  version: z.number().int().positive(),
  assignments: z.array(staffAssignmentSchema),
});

export const staffPageSchema = pageOf(staffSummarySchema);

export const createStaffSchema = z.object({
  employeeId: z.string().min(2).max(32),
  nameEn: z.string().min(2).max(120),
  nameBn: z.string().min(2).max(120),
  designation: z.string().min(2).max(120),
  phone: z
    .string()
    .regex(/^\d{10,11}$/)
    .optional(),
  email: z.string().email().optional(),
  payLevel: z.string().max(40).optional(),
  joinedAt: z.iso.date().optional(),
});

export const updateStaffSchema = z
  .object({
    nameEn: z.string().min(2).max(120).optional(),
    nameBn: z.string().min(2).max(120).optional(),
    designation: z.string().min(2).max(120).optional(),
    phone: z
      .string()
      .regex(/^\d{10,11}$/)
      .nullable()
      .optional(),
    email: z.string().email().nullable().optional(),
    payLevel: z.string().max(40).nullable().optional(),
    joinedAt: z.iso.date().nullable().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to change.",
  });

export const createAssignmentSchema = z
  .object({
    type: staffAssignmentSchema.shape.type,
    sectionId: z.uuid().optional(),
    subjectId: z.uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "subject_teacher" && (!value.sectionId || !value.subjectId)) {
      ctx.addIssue({
        code: "custom",
        path: ["sectionId"],
        message: "A subject assignment needs both a section and a subject.",
      });
    }
    if (value.type === "class_teacher" && !value.sectionId) {
      ctx.addIssue({
        code: "custom",
        path: ["sectionId"],
        message: "A class teacher assignment needs a section.",
      });
    }
    if (
      (value.type === "accountant" || value.type === "assistant_headmaster") &&
      (value.sectionId || value.subjectId)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["type"],
        message: "That assignment type takes no section or subject.",
      });
    }
  });

export class StaffSummaryDto extends createZodDto(staffSummarySchema) {}
export class StaffRecordDto extends createZodDto(staffRecordSchema) {}
export class StaffAssignmentDto extends createZodDto(staffAssignmentSchema) {}
export class StaffPageDto extends createZodDto(staffPageSchema) {}
export class CreateStaffDto extends createZodDto(createStaffSchema) {}
export class UpdateStaffDto extends createZodDto(updateStaffSchema) {}
export class CreateAssignmentDto extends createZodDto(createAssignmentSchema) {}

export type StaffSummaryWire = z.infer<typeof staffSummarySchema>;
export type StaffRecord = z.infer<typeof staffRecordSchema>;
export type StaffAssignmentRow = z.infer<typeof staffAssignmentSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
