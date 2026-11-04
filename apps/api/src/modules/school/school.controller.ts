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
  ApiNoContentResponse,
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
import { ApiException } from "../../common/errors/api-error";
import { VersionConflictProblemDto } from "../../common/http/api-schemas";
import { entityTag, requireIfMatch } from "../../common/http/version";
import { DatabaseService } from "../../db/database.service";
import type { RequestContext } from "../auth/auth.service";
import { SchoolService } from "./school.service";
import {
  AcademicYearDto,
  AcademicYearPageDto,
  CreateAcademicYearDto,
  CreateSectionDto,
  CreateSubjectDto,
  SchoolProfileDto,
  SectionDto,
  SectionPageDto,
  SubjectDto,
  SubjectPageDto,
  UpdateSchoolDto,
  createAcademicYearSchema,
  createSectionSchema,
  createSubjectSchema,
  listQuerySchema,
  updateSchoolSchema,
  type ListQuery,
} from "./school.schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags("school")
@ApiBearerAuth("access_token")
@ApiExtraModels(VersionConflictProblemDto)
@Controller()
export class SchoolController {
  constructor(
    private readonly school: SchoolService,
    private readonly database: DatabaseService,
  ) {}

  @Get("school")
  @RequirePermissions("dashboard.view")
  @ApiOperation({ summary: "Read the school profile with its active year" })
  @ApiOkResponse({ type: SchoolProfileDto })
  async getSchool(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const profile = await this.school.profile(this.database.db, user.schoolId);
    reply.header("etag", entityTag(profile.version));
    return profile;
  }

  @Patch("school")
  @RequirePermissions("settings.manage")
  @ApiOperation({ summary: "Amend the school profile" })
  @ApiOkResponse({ type: SchoolProfileDto })
  @ApiResponse({ status: 428, description: "If-Match is required." })
  @ApiResponse({
    status: 409,
    type: VersionConflictProblemDto,
    description:
      "VERSION_CONFLICT. The body is an application/problem+json document " +
      "carrying the extension members `expected` (the If-Match tag sent) and " +
      "`current` (the tag the row holds now).",
  })
  async updateSchool(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(updateSchoolSchema)) body: UpdateSchoolDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const profile = await this.school.updateProfile(
      user,
      body,
      requireIfMatch(request.headers["if-match"]),
      contextOf(request),
    );
    reply.header("etag", entityTag(profile.version));
    return profile;
  }

  @Get("academic-years")
  @RequirePermissions("dashboard.view")
  @ApiOperation({ summary: "List academic years" })
  @ApiOkResponse({ type: AcademicYearPageDto })
  academicYears(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    return this.school.listYears(user.schoolId, query);
  }

  @Post("academic-years")
  @RequirePermissions("sections.manage")
  @ApiOperation({ summary: "Add an academic year" })
  @ApiCreatedResponse({ type: AcademicYearDto })
  createAcademicYear(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createAcademicYearSchema))
    body: CreateAcademicYearDto,
    @Req() request: FastifyRequest,
  ) {
    return this.school.createYear(user, body, contextOf(request));
  }

  @Post("academic-years/:id/activate")
  @RequirePermissions("sections.manage")
  @HttpCode(204)
  @ApiOperation({ summary: "Make one year the active year" })
  @ApiNoContentResponse()
  activateAcademicYear(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Req() request: FastifyRequest,
  ) {
    return this.school.activateYear(
      user,
      readUuid(id, "Academic year"),
      contextOf(request),
    );
  }

  @Get("sections")
  @RequirePermissions("dashboard.view")
  @ApiOperation({ summary: "List class sections" })
  @ApiOkResponse({ type: SectionPageDto })
  listSections(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    return this.school.listSections(user.schoolId, query);
  }

  @Post("sections")
  @RequirePermissions("sections.manage")
  @ApiOperation({ summary: "Add a class section" })
  @ApiCreatedResponse({ type: SectionDto })
  createSection(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createSectionSchema)) body: CreateSectionDto,
    @Req() request: FastifyRequest,
  ) {
    return this.school.createSection(user, body, contextOf(request));
  }

  @Get("subjects")
  @RequirePermissions("dashboard.view")
  @ApiOperation({ summary: "List subjects" })
  @ApiOkResponse({ type: SubjectPageDto })
  listSubjects(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    return this.school.listSubjects(user.schoolId, query);
  }

  @Post("subjects")
  @RequirePermissions("sections.manage")
  @ApiOperation({ summary: "Add a subject" })
  @ApiCreatedResponse({ type: SubjectDto })
  createSubject(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createSubjectSchema)) body: CreateSubjectDto,
    @Req() request: FastifyRequest,
  ) {
    return this.school.createSubject(user, body, contextOf(request));
  }
}

function readUuid(value: string, label: string): string {
  if (!UUID.test(value)) {
    throw new ApiException(404, "NOT_FOUND", `${label} was not found.`);
  }
  return value;
}

function contextOf(request: FastifyRequest): RequestContext {
  return {
    requestId: request.id,
    ip: request.ip ?? null,
    userAgent: request.headers["user-agent"] ?? null,
  };
}
