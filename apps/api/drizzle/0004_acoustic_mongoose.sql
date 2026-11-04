ALTER TABLE "students" DROP CONSTRAINT "students_section_id_sections_id_fk";
--> statement-breakpoint
ALTER TABLE "student_guardians" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "sections_school_id_uq" ON "sections" USING btree ("school_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "guardians_school_id_uq" ON "guardians" USING btree ("school_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_school_id_uq" ON "students" USING btree ("school_id","id");--> statement-breakpoint
CREATE INDEX "student_guardians_guardian_idx" ON "student_guardians" USING btree ("guardian_id");--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_student_school_fk" FOREIGN KEY ("school_id","student_id") REFERENCES "public"."students"("school_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardian_school_fk" FOREIGN KEY ("school_id","guardian_id") REFERENCES "public"."guardians"("school_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_section_school_fk" FOREIGN KEY ("school_id","section_id") REFERENCES "public"."sections"("school_id","id") ON DELETE restrict ON UPDATE no action;
