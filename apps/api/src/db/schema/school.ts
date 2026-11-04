import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const schools = pgTable(
  "schools",
  {
    id: uuid("id").primaryKey(),
    nameEn: text("name_en").notNull(),
    nameBn: text("name_bn").notNull(),
    code: text("code").notNull(),
    udise: text("udise"),
    type: text("type").notNull().default("Government-sponsored secondary school"),
    address: text("address").notNull(),
    district: text("district").notNull(),
    established: integer("established"),
    phone: text("phone"),
    email: text("email"),
    sealKey: text("seal_key"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    codeUnique: uniqueIndex("schools_code_uq").on(table.code),
  }),
);

export const academicYears = pgTable(
  "academic_years",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    schoolLabelUnique: uniqueIndex("academic_years_school_label_uq").on(
      table.schoolId,
      table.label,
    ),
  }),
);
