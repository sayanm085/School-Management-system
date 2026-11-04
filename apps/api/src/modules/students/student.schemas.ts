import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { pageOf } from "../../common/http/api-schemas";
import { guardianRelationships, guardianSchema } from "./guardian.schemas";

export const classLevels = ["V", "VI", "VII", "VIII", "IX", "X"] as const;
export const genders = ["male", "female", "other"] as const;
export const categories = ["general", "obc", "sc", "st"] as const;
export const studentStatuses = ["active", "transferred", "alumni"] as const;

export const studentSummarySchema = z.object({
  id: z.uuid(),
  admissionNo: z.string(),
  rollNo: z.string(),
  sectionId: z.uuid(),
  classLabel: z.string(),
  nameEn: z.string(),
  nameBn: z.string(),
  gender: z.enum(genders),
  category: z.enum(categories),
  status: z.enum(studentStatuses),
  // The list rows are the client's entry point for If-Match on a PATCH, so the
  // current version travels with every summary.
  version: z.number().int().positive(),
});

export const studentDetailSchema = studentSummarySchema.extend({
  dob: z.iso.date(),
  address: z.string().nullable(),
  avatarKey: z.string().nullable(),
  admissionDate: z.iso.date(),
  version: z.number().int().positive(),
  guardians: z.array(guardianSchema),
});

export const studentListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().min(1).max(1024).optional(),
  sectionId: z.uuid().optional(),
  search: z.string().min(1).max(64).optional(),
  status: z.enum(studentStatuses).default("active"),
});

export const createStudentSchema = z.object({
  admissionNo: z.string().min(3).max(32),
  rollNo: z
    .string()
    .regex(/^\d{1,4}$/)
    .optional(),
  sectionId: z.uuid(),
  nameEn: z.string().min(2).max(120),
  nameBn: z.string().min(2).max(120),
  gender: z.enum(genders),
  dob: z.iso.date(),
  category: z.enum(categories),
  address: z.string().min(3).max(240).optional(),
  avatarKey: z.string().max(160).optional(),
  admissionDate: z.iso.date().optional(),
  guardian: z
    .object({
      nameEn: z.string().min(2).max(120),
      nameBn: z.string().min(2).max(120),
      phone: z.string().regex(/^\d{10}$/, "Enter a 10-digit mobile number"),
      address: z.string().min(3).max(240).optional(),
      relationship: z.enum(guardianRelationships).default("guardian"),
    })
    .optional(),
});

export const updateStudentSchema = z
  .object({
    nameEn: z.string().min(2).max(120).optional(),
    nameBn: z.string().min(2).max(120).optional(),
    gender: z.enum(genders).optional(),
    dob: z.iso.date().optional(),
    category: z.enum(categories).optional(),
    address: z.string().min(3).max(240).nullable().optional(),
    avatarKey: z.string().max(160).nullable().optional(),
    sectionId: z.uuid().optional(),
    rollNo: z
      .string()
      .regex(/^\d{1,4}$/)
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to change.",
  });

export const retireStudentSchema = z.object({
  status: z.enum(["transferred", "alumni"]),
  reason: z.string().min(3).max(240).optional(),
});

export class StudentSummaryDto extends createZodDto(studentSummarySchema) {}
export class StudentDetailDto extends createZodDto(studentDetailSchema) {}
export class StudentPageDto extends createZodDto(pageOf(studentSummarySchema)) {}
export class CreateStudentDto extends createZodDto(createStudentSchema) {}
export class UpdateStudentDto extends createZodDto(updateStudentSchema) {}
export class RetireStudentDto extends createZodDto(retireStudentSchema) {}

export type StudentSummary = z.infer<typeof studentSummarySchema>;
export type StudentDetail = z.infer<typeof studentDetailSchema>;
export type StudentListQuery = z.infer<typeof studentListQuerySchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
