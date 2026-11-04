import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { staff } from "./identity";
import { academicYears, schools } from "./school";

export const assignmentTypeEnum = pgEnum("assignment_type", [
  "class_teacher",
  "subject_teacher",
  "exam_coordinator",
  "accountant",
  "assistant_headmaster",
]);

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    nameEn: text("name_en").notNull(),
    nameBn: text("name_bn").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    codeUnique: uniqueIndex("subjects_school_code_uq").on(
      table.schoolId,
      table.code,
    ),
  }),
);

export const sections = pgTable(
  "sections",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    classLevel: text("class_level").notNull(),
    section: text("section").notNull(),
    room: text("room").notNull(),
    capacity: integer("capacity").notNull().default(50),
    classTeacherId: uuid("class_teacher_id").references(() => staff.id, {
      onDelete: "set null",
    }),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sectionUnique: uniqueIndex("sections_year_class_section_uq").on(
      table.schoolId,
      table.academicYearId,
      table.classLevel,
      table.section,
    ),
    teacherIndex: index("sections_class_teacher_idx").on(table.classTeacherId),
    // Target of the students (school_id, section_id) composite foreign key:
    // only a section of the same school can be referenced.
    schoolPairUnique: uniqueIndex("sections_school_id_uq").on(
      table.schoolId,
      table.id,
    ),
  }),
);

export const staffAssignments = pgTable(
  "staff_assignments",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    type: assignmentTypeEnum("type").notNull(),
    sectionId: uuid("section_id").references(() => sections.id, {
      onDelete: "cascade",
    }),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "cascade",
    }),
    examId: uuid("exam_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    staffIndex: index("staff_assignments_staff_idx").on(table.staffId),
    sectionIndex: index("staff_assignments_section_idx").on(table.sectionId),
  }),
);
