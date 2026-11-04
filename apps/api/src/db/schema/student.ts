import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { sections } from "./academic";
import { schools } from "./school";

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const studentCategoryEnum = pgEnum("student_category", [
  "general",
  "obc",
  "sc",
  "st",
]);
export const studentStatusEnum = pgEnum("student_status", [
  "active",
  "transferred",
  "alumni",
]);
export const guardianRelationshipEnum = pgEnum("guardian_relationship", [
  "father",
  "mother",
  "guardian",
  "other",
]);

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id").notNull(),
    admissionNo: text("admission_no").notNull(),
    rollNo: text("roll_no").notNull(),
    nameEn: text("name_en").notNull(),
    nameBn: text("name_bn").notNull(),
    gender: genderEnum("gender").notNull(),
    dob: date("dob", { mode: "string" }).notNull(),
    category: studentCategoryEnum("category").notNull(),
    status: studentStatusEnum("status").notNull().default("active"),
    address: text("address"),
    avatarKey: text("avatar_key"),
    admissionDate: date("admission_date", { mode: "string" }).notNull(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    admissionUnique: uniqueIndex("students_school_admission_uq").on(
      table.schoolId,
      table.admissionNo,
    ),
    rollUnique: uniqueIndex("students_section_roll_uq").on(
      table.sectionId,
      table.rollNo,
    ),
    rosterIndex: index("students_school_section_idx").on(
      table.schoolId,
      table.sectionId,
      table.rollNo,
    ),
    nameIndex: index("students_school_name_idx").on(table.schoolId, table.nameEn),
    // Needed so a guardian link can pin (school_id, id) together.
    schoolPairUnique: uniqueIndex("students_school_id_uq").on(
      table.schoolId,
      table.id,
    ),
    // A student may only sit in a section of their own school.
    sectionSchoolFk: foreignKey({
      name: "students_section_school_fk",
      columns: [table.schoolId, table.sectionId],
      foreignColumns: [sections.schoolId, sections.id],
    }).onDelete("restrict"),
  }),
);

export const guardians = pgTable(
  "guardians",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    nameEn: text("name_en").notNull(),
    nameBn: text("name_bn").notNull(),
    phone: text("phone").notNull(),
    altPhone: text("alt_phone"),
    address: text("address"),
    occupation: text("occupation"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    phoneIndex: index("guardians_school_phone_idx").on(table.schoolId, table.phone),
    schoolPairUnique: uniqueIndex("guardians_school_id_uq").on(
      table.schoolId,
      table.id,
    ),
  }),
);

export const studentGuardians = pgTable(
  "student_guardians",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    guardianId: uuid("guardian_id")
      .notNull()
      .references(() => guardians.id, { onDelete: "cascade" }),
    relationship: guardianRelationshipEnum("relationship").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pairUnique: uniqueIndex("student_guardians_pair_uq").on(
      table.studentId,
      table.guardianId,
    ),
    studentIndex: index("student_guardians_student_idx").on(table.studentId),
    guardianIndex: index("student_guardians_guardian_idx").on(
      table.guardianId,
    ),
    // Composite keys pin the link to a student and guardian of the same
    // school; a plain single-column FK cannot express that. They run alongside
    // the 0003 single-column FKs, which the applied-migration ledger forbids
    // dropping; the composite constraints are strictly stronger.
    studentSchoolFk: foreignKey({
      name: "student_guardians_student_school_fk",
      columns: [table.schoolId, table.studentId],
      foreignColumns: [students.schoolId, students.id],
    }).onDelete("cascade"),
    guardianSchoolFk: foreignKey({
      name: "student_guardians_guardian_school_fk",
      columns: [table.schoolId, table.guardianId],
      foreignColumns: [guardians.schoolId, guardians.id],
    }).onDelete("cascade"),
  }),
);

export type StudentGender = typeof genderEnum.enumValues[number];
export type StudentCategory = typeof studentCategoryEnum.enumValues[number];
export type StudentStatus = typeof studentStatusEnum.enumValues[number];
export type GuardianRelationship =
  typeof guardianRelationshipEnum.enumValues[number];
