import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

export const staffRoles = [
  "headmaster",
  "teacher",
  "clerk",
  "management",
  "support",
] as const;

export type StaffRole = (typeof staffRoles)[number];

export const loginRoles = [
  "headmaster",
  "teacher",
  "clerk",
  "management",
] as const;

export type LoginRole = (typeof loginRoles)[number];

export function isLoginRole(role: StaffRole): role is LoginRole {
  return (loginRoles as readonly string[]).includes(role);
}

const assignmentSchema = z.object({
  type: z.enum([
    "class_teacher",
    "subject_teacher",
    "accountant",
    "assistant_headmaster",
    "exam_coordinator",
  ]),
  sectionId: z.string().optional(),
  subjectId: z.string().optional(),
  examId: z.string().optional(),
});

const staffSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  nameEn: z.string(),
  nameBn: z.string(),
  role: z.enum(staffRoles),
  designation: z.string(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  joinedAt: z.string().nullable().optional(),
  payLevel: z.string().nullable().optional(),
  status: z.string().default("active"),
  assignments: z.array(assignmentSchema).default([]),
});

// The demo `guardianName` is mixed-script, which is why the seeder writes it to
// both guardian name columns.
const studentSchema = z.object({
  id: z.string(),
  admissionNo: z.string(),
  rollNo: z.string(),
  sectionId: z.string(),
  nameEn: z.string(),
  nameBn: z.string(),
  gender: z.enum(["male", "female", "other"]),
  dob: z.iso.date(),
  guardianName: z.string(),
  guardianPhone: z.string(),
  address: z.string(),
  category: z.enum(["general", "obc", "sc", "st"]),
  status: z.enum(["active", "transferred", "alumni"]).default("active"),
  avatar: z.string().nullable().optional(),
  admissionDate: z.iso.date(),
});

export const demoSeedSchema = z.object({
  school: z.object({
    id: z.string(),
    nameEn: z.string(),
    nameBn: z.string(),
    code: z.string(),
    udise: z.string().nullable().optional(),
    type: z.string(),
    address: z.string(),
    district: z.string(),
    established: z.number().int().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
  }),
  academicYear: z.object({
    id: z.string(),
    label: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    isActive: z.boolean(),
  }),
  subjects: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      nameEn: z.string(),
      nameBn: z.string(),
    }),
  ),
  sections: z.array(
    z.object({
      id: z.string(),
      classLevel: z.string(),
      section: z.string(),
      room: z.string(),
      capacity: z.number().int(),
      classTeacherId: z.string().nullable().optional(),
    }),
  ),
  staff: z.array(staffSchema),
  students: z.array(studentSchema),
});

export type DemoSeed = z.infer<typeof demoSeedSchema>;
export type DemoAssignment = DemoSeed["staff"][number]["assignments"][number];
export type DemoStudent = z.infer<typeof studentSchema>;

const DEFAULT_SEED_FILE = resolve(
  process.cwd(),
  "../../apps/web/src/data/seed.json",
);

export function demoSeedPath(): string {
  return process.env.DEMO_SEED_FILE ?? DEFAULT_SEED_FILE;
}

export function readDemoSeed(path = demoSeedPath()): DemoSeed {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    throw new Error(
      `Demo seed file not found at ${path}. Set DEMO_SEED_FILE to the seeded JSON export.`,
    );
  }
  return demoSeedSchema.parse(JSON.parse(text));
}
