import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { pageOf } from "../../common/http/api-schemas";

export const classLevels = ["V", "VI", "VII", "VIII", "IX", "X"] as const;

export const academicYearSchema = z.object({
  id: z.uuid(),
  label: z.string(),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  isActive: z.boolean(),
});

/**
 * `sealKey` is deliberately absent. It is the object key of the school seal
 * image, and B2b owns uploads — until then nothing stands behind the value, so
 * publishing it here would hand a storage key to every role holding
 * `dashboard.view`. The `schools.seal_key` column stays; only the contract and
 * the response leave it out.
 */
export const schoolProfileSchema = z.object({
  id: z.uuid(),
  nameEn: z.string(),
  nameBn: z.string(),
  code: z.string(),
  udise: z.string().nullable(),
  type: z.string(),
  address: z.string(),
  district: z.string(),
  established: z.number().int().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  version: z.number().int().positive(),
  academicYear: academicYearSchema.nullable(),
});

export const updateSchoolSchema = z
  .object({
    nameEn: z.string().min(3).max(160).optional(),
    nameBn: z.string().min(3).max(160).optional(),
    udise: z
      .string()
      .regex(/^\d{11}$/, "UDISE code is 11 digits")
      .nullable()
      .optional(),
    type: z.string().min(3).max(120).optional(),
    address: z.string().min(3).max(240).optional(),
    district: z.string().min(2).max(80).optional(),
    established: z.number().int().min(1800).max(2100).nullable().optional(),
    phone: z
      .string()
      .regex(/^[\d +()-]{6,20}$/)
      .nullable()
      .optional(),
    email: z.string().email().nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to change.",
  });

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().min(1).max(1024).optional(),
});

export const createAcademicYearSchema = z.object({
  label: z.string().min(4).max(24),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
});

export const sectionSchema = z.object({
  id: z.uuid(),
  classLevel: z.enum(classLevels),
  section: z.string(),
  room: z.string(),
  capacity: z.number().int(),
  classTeacherId: z.uuid().nullable(),
  version: z.number().int().positive(),
});

export const createSectionSchema = z.object({
  classLevel: z.enum(classLevels),
  section: z.string().regex(/^[A-Z]$/, "Section is a single capital letter"),
  room: z.string().min(1).max(40),
  capacity: z.coerce.number().int().min(1).max(120).default(50),
  classTeacherId: z.uuid().optional(),
  academicYearId: z.uuid().optional(),
});

export const subjectSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  nameEn: z.string(),
  nameBn: z.string(),
  version: z.number().int().positive(),
});

export const createSubjectSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(8)
    .transform((value) => value.toUpperCase()),
  nameEn: z.string().min(2).max(80),
  nameBn: z.string().min(2).max(80),
});

export class SchoolProfileDto extends createZodDto(schoolProfileSchema) {}
export class UpdateSchoolDto extends createZodDto(updateSchoolSchema) {}
export class AcademicYearDto extends createZodDto(academicYearSchema) {}
export class AcademicYearPageDto extends createZodDto(pageOf(academicYearSchema)) {}
export class CreateAcademicYearDto extends createZodDto(createAcademicYearSchema) {}
export class SectionDto extends createZodDto(sectionSchema) {}
export class SectionPageDto extends createZodDto(pageOf(sectionSchema)) {}
export class CreateSectionDto extends createZodDto(createSectionSchema) {}
export class SubjectDto extends createZodDto(subjectSchema) {}
export class SubjectPageDto extends createZodDto(pageOf(subjectSchema)) {}
export class CreateSubjectDto extends createZodDto(createSubjectSchema) {}

export type SchoolProfile = z.infer<typeof schoolProfileSchema>;
export type AcademicYearRow = z.infer<typeof academicYearSchema>;
export type SectionRow = z.infer<typeof sectionSchema>;
export type SubjectRow = z.infer<typeof subjectSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;
export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
