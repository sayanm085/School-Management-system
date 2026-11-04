import { Module } from "@nestjs/common";

import { GuardianController } from "./guardian.controller";
import { GuardianService } from "./guardian.service";
import { StudentController } from "./student.controller";
import { StudentService } from "./student.service";

@Module({
  controllers: [StudentController, GuardianController],
  providers: [StudentService, GuardianService],
  exports: [StudentService, GuardianService],
})
export class StudentsModule {}
