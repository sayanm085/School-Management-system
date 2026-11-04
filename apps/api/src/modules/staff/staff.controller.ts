import {
  Body,
  Controller,
  Get,
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
import { VersionConflictProblemDto } from "../../common/http/api-schemas";
import { entityTag, requireIfMatch } from "../../common/http/version";
import type { RequestContext } from "../auth/auth.service";
import { StaffService } from "./staff.service";
import {
  CreateAssignmentDto,
  CreateStaffDto,
  StaffAssignmentDto,
  StaffPageDto,
  StaffRecordDto,
  UpdateStaffDto,
  createAssignmentSchema,
  createStaffSchema,
  staffListQuerySchema,
  updateStaffSchema,
  type StaffListQuery,
} from "./staff.schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags("staff")
@ApiBearerAuth("access_token")
@ApiExtraModels(VersionConflictProblemDto)
@Controller("staff")
@RequirePermissions("staff.view")
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  @ApiOperation({ summary: "List staff in the signed-in school" })
  @ApiOkResponse({ type: StaffPageDto })
  list(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(staffListQuerySchema)) query: StaffListQuery,
  ) {
    return this.staff.list(user.schoolId, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Read one staff record with its assignments" })
  @ApiOkResponse({ type: StaffRecordDto })
  async detail(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const member = await this.staff.record(user, readUuid(id));
    reply.header("etag", entityTag(member.version));
    return member;
  }

  @Post()
  @RequirePermissions("staff.create")
  @ApiOperation({ summary: "Register a staff member" })
  @ApiCreatedResponse({ type: StaffRecordDto })
  create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createStaffSchema)) body: CreateStaffDto,
    @Req() request: FastifyRequest,
  ) {
    return this.staff.create(user, body, contextOf(request));
  }

  @Patch(":id")
  @RequirePermissions("staff.edit")
  @ApiOperation({ summary: "Amend a staff record" })
  @ApiOkResponse({ type: StaffRecordDto })
  @ApiResponse({ status: 428, description: "If-Match is required." })
  @ApiResponse({
    status: 409,
    type: VersionConflictProblemDto,
    description:
      "VERSION_CONFLICT. The body is an application/problem+json document " +
      "carrying the extension members `expected` (the If-Match tag sent) and " +
      "`current` (the tag the row holds now).",
  })
  async update(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateStaffSchema)) body: UpdateStaffDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const member = await this.staff.update(
      user,
      readUuid(id),
      body,
      requireIfMatch(request.headers["if-match"]),
      contextOf(request),
    );
    reply.header("etag", entityTag(member.version));
    return member;
  }

  @Post(":id/assignments")
  @RequirePermissions("staff.edit")
  @ApiOperation({ summary: "Assign a class, subject or role to a staff member" })
  @ApiCreatedResponse({ type: StaffAssignmentDto })
  addAssignment(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createAssignmentSchema)) body: CreateAssignmentDto,
    @Req() request: FastifyRequest,
  ) {
    return this.staff.addAssignment(user, readUuid(id), body, contextOf(request));
  }
}

function readUuid(value: string): string {
  if (!UUID.test(value)) throw notFound("Staff");
  return value;
}

function contextOf(request: FastifyRequest): RequestContext {
  return {
    requestId: request.id,
    ip: request.ip ?? null,
    userAgent: request.headers["user-agent"] ?? null,
  };
}
