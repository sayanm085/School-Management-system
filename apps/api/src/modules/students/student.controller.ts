import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ZodValidationPipe } from "nestjs-zod";
import type { FastifyReply, FastifyRequest } from "fastify";

import {
  CurrentUser,
  RequirePermissions,
} from "../../common/authz/current-user";
import type { CurrentUser as User } from "../../common/authz/permissions";
import { notFound } from "../../common/errors/api-error";
import {
  CrossSchoolProblemDto,
  ProblemDto,
  VersionConflictProblemDto,
  problemVariants,
} from "../../common/http/api-schemas";
import { entityTag, requireIfMatch } from "../../common/http/version";
import type { RequestContext } from "../auth/auth.service";
import { StudentService } from "./student.service";
import {
  CreateStudentDto,
  RetireStudentDto,
  StudentDetailDto,
  StudentPageDto,
  UpdateStudentDto,
  createStudentSchema,
  retireStudentSchema,
  studentListQuerySchema,
  updateStudentSchema,
  type StudentListQuery,
} from "./student.schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags("students")
@ApiBearerAuth("access_token")
@ApiExtraModels(CrossSchoolProblemDto, ProblemDto, VersionConflictProblemDto)
@Controller("students")
@RequirePermissions("students.view")
export class StudentController {
  constructor(private readonly students: StudentService) {}

  @Get()
  @ApiOperation({ summary: "List students inside the caller's scope" })
  @ApiOkResponse({ type: StudentPageDto })
  list(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(studentListQuerySchema)) query: StudentListQuery,
  ) {
    return this.students.list(user, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Read one student, guardians included" })
  @ApiOkResponse({ type: StudentDetailDto })
  async detail(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const student = await this.students.detail(user, readUuid(id));
    reply.header("etag", entityTag(student.version));
    return student;
  }

  @Post()
  @RequirePermissions("students.create")
  @ApiOperation({ summary: "Enrol a student" })
  @ApiCreatedResponse({ type: StudentDetailDto })
  @ApiResponse({
    status: 403,
    schema: problemVariants("CrossSchoolProblemDto"),
    description:
      "Forbidden. The body is an application/problem+json document; a " +
      "cross-school section is rejected as FORBIDDEN with the extension " +
      "member `constraint` naming the tenancy key that blamed it.",
  })
  create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createStudentSchema)) body: CreateStudentDto,
    @Req() request: FastifyRequest,
  ) {
    return this.students.create(user, body, contextOf(request));
  }

  @Patch(":id")
  @RequirePermissions("students.edit")
  @ApiOperation({ summary: "Amend a student record" })
  @ApiOkResponse({ type: StudentDetailDto })
  @ApiResponse({ status: 428, description: "If-Match is required." })
  @ApiResponse({
    status: 403,
    schema: problemVariants("CrossSchoolProblemDto"),
    description:
      "Forbidden. The body is an application/problem+json document; a " +
      "cross-school section is rejected as FORBIDDEN with the extension " +
      "member `constraint` naming the tenancy key that blamed it.",
  })
  @ApiResponse({
    status: 409,
    schema: problemVariants("VersionConflictProblemDto"),
    description:
      "Conflict. The body is an application/problem+json document; " +
      "VERSION_CONFLICT carries the extension members `expected` and " +
      "`current`, while ADMISSION_NO_TAKEN and ROLL_NO_TAKEN carry neither.",
  })
  async update(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateStudentSchema)) body: UpdateStudentDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const student = await this.students.update(
      user,
      readUuid(id),
      body,
      requireIfMatch(request.headers["if-match"]),
      contextOf(request),
    );
    reply.header("etag", entityTag(student.version));
    return student;
  }

  @Post(":id/retire")
  @RequirePermissions("students.edit")
  @HttpCode(200)
  @ApiOperation({ summary: "Mark a student transferred or an alumnus" })
  @ApiOkResponse({ type: StudentDetailDto })
  retire(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(retireStudentSchema)) body: RetireStudentDto,
    @Req() request: FastifyRequest,
  ) {
    return this.students.retire(
      user,
      readUuid(id),
      body.status,
      body.reason,
      contextOf(request),
    );
  }
}

function readUuid(value: string): string {
  if (!UUID.test(value)) throw notFound("Student");
  return value;
}

function contextOf(request: FastifyRequest): RequestContext {
  return {
    requestId: request.id,
    ip: request.ip ?? null,
    userAgent: request.headers["user-agent"] ?? null,
  };
}
