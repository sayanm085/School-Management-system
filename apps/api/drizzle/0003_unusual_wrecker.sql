CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."guardian_relationship" AS ENUM('father', 'mother', 'guardian', 'other');--> statement-breakpoint
CREATE TYPE "public"."student_category" AS ENUM('general', 'obc', 'sc', 'st');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('active', 'transferred', 'alumni');--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"name_en" text NOT NULL,
	"name_bn" text NOT NULL,
	"phone" text NOT NULL,
	"alt_phone" text,
	"address" text,
	"occupation" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "student_guardians" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"relationship" "guardian_relationship" NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"admission_no" text NOT NULL,
	"roll_no" text NOT NULL,
	"name_en" text NOT NULL,
	"name_bn" text NOT NULL,
	"gender" "gender" NOT NULL,
	"dob" date NOT NULL,
	"category" "student_category" NOT NULL,
	"status" "student_status" DEFAULT 'active' NOT NULL,
	"address" text,
	"avatar_key" text,
	"admission_date" date NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "seal_key" text;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guardians_school_phone_idx" ON "guardians" USING btree ("school_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX "student_guardians_pair_uq" ON "student_guardians" USING btree ("student_id","guardian_id");--> statement-breakpoint
CREATE INDEX "student_guardians_student_idx" ON "student_guardians" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_school_admission_uq" ON "students" USING btree ("school_id","admission_no");--> statement-breakpoint
CREATE UNIQUE INDEX "students_section_roll_uq" ON "students" USING btree ("section_id","roll_no");--> statement-breakpoint
CREATE INDEX "students_school_section_idx" ON "students" USING btree ("school_id","section_id","roll_no");--> statement-breakpoint
CREATE INDEX "students_school_name_idx" ON "students" USING btree ("school_id","name_en");