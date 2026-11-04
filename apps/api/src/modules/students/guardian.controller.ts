import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
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
import type { FastifyRequest } from "fastify";

import {
  CurrentUser,
  RequirePermissions,
} from "../../common/authz/current-user";
import type { CurrentUser as User } from "../../common/authz/permissions";
import { notFound } from "../../common/errors/api-error";
import {
  CrossSchoolProblemDto,
  ProblemDto,
  problemVariants,
} from "../../common/http/api-schemas";
import type { RequestContext } from "../auth/auth.service";
import { GuardianService } from "./guardian.service";
import {
  AttachGuardianDto,
  GuardianDto,
  GuardianListDto,
  attachGuardianSchema,
} from "./guardian.schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags("students")
@ApiBearerAuth("access_token")
@ApiExtraModels(CrossSchoolProblemDto, ProblemDto)
@Controller("students/:studentId/guardians")
@RequirePermissions("students.view")
export class GuardianController {
  constructor(private readonly guardians: GuardianService) {}

  @Get()
  @ApiOperation({ summary: "List the guardians of one student" })
  @ApiOkResponse({ type: GuardianListDto })
  list(@CurrentUser() user: User, @Param("studentId") studentId: string) {
    return this.guardians.listForStudent(user, readUuid(studentId));
  }

  @Post()
  @RequirePermissions("students.edit")
  @ApiOperation({ summary: "Attach a guardian, new or existing" })
  @ApiCreatedResponse({ type: GuardianDto })
  @ApiResponse({
    status: 403,
    schema: problemVariants("CrossSchoolProblemDto"),
    description:
      "Forbidden. The body is an application/problem+json document; a " +
      "cross-school guardian is rejected as FORBIDDEN with the extension " +
      "member `constraint` naming the tenancy key that blamed it.",
  })
  attach(
    @CurrentUser() user: User,
    @Param("studentId") studentId: string,
    @Body(new ZodValidationPipe(attachGuardianSchema)) body: AttachGuardianDto,
    @Req() request: FastifyRequest,
  ) {
    return this.guardians.attach(
      user,
      readUuid(studentId),
      body,
      contextOf(request),
    );
  }

  @Post(":guardianId/primary")
  @RequirePermissions("students.edit")
  @HttpCode(204)
  @ApiOperation({ summary: "Make a linked guardian the primary contact" })
  @ApiNoContentResponse()
  setPrimary(
    @CurrentUser() user: User,
    @Param("studentId") studentId: string,
    @Param("guardianId") guardianId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.guardians.setPrimary(
      user,
      readUuid(studentId),
      readUuid(guardianId),
      contextOf(request),
    );
  }

  @Delete(":guardianId")
  @RequirePermissions("students.edit")
  @HttpCode(204)
  @ApiOperation({ summary: "Unlink a guardian from this student" })
  @ApiNoContentResponse()
  detach(
    @CurrentUser() user: User,
    @Param("studentId") studentId: string,
    @Param("guardianId") guardianId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.guardians.detach(
      user,
      readUuid(studentId),
      readUuid(guardianId),
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
