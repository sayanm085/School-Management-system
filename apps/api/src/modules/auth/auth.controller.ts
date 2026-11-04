import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodValidationPipe } from "nestjs-zod";

import {
  CurrentUser,
  Public,
  type AuthenticatedRequest,
} from "../../common/authz/current-user";
import type { CurrentUser as User } from "../../common/authz/permissions";
import { ApiException, authRequired } from "../../common/errors/api-error";
import {
  DeviceListDto,
  MfaChallengeDto,
  MfaEnrollmentDto,
  PublicUserDto,
  SessionDto,
  deviceIdSchema,
  mfaDisableSchema,
  MfaActivateDto,
  MfaRecoveryDto,
  MfaVerifyDto,
  RefreshDto,
  LoginDto,
} from "./auth.schemas";
import { AuthService, type RequestContext } from "./auth.service";
import { TokenService } from "./token.service";

export const REFRESH_COOKIE = "baranda_refresh";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
  ) {}

  @Public()
  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Sign in with an employee ID and password" })
  @ApiOkResponse({ type: SessionDto })
  @ApiResponse({ status: 202, type: MfaChallengeDto })
  async login(
    @Body() body: LoginDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.auth.login(body, contextOf(request));
    if (result.mfaRequired) {
      reply.status(202);
      return result;
    }
    this.setRefreshCookie(reply, request, result.refreshToken);
    return result;
  }

  @Public()
  @Post("mfa/verify")
  @HttpCode(200)
  @ApiOperation({ summary: "Exchange an MFA challenge for a session" })
  @ApiOkResponse({ type: SessionDto })
  async verifyMfa(
    @Body() body: MfaVerifyDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const session = await this.auth.completeMfa(
      body.challenge,
      body.code,
      undefined,
      body.device,
      contextOf(request),
    );
    this.setRefreshCookie(reply, request, session.refreshToken);
    return session;
  }

  @Public()
  @Post("mfa/recovery")
  @HttpCode(200)
  @ApiOperation({ summary: "Sign in with a one-time recovery code" })
  @ApiOkResponse({ type: SessionDto })
  async verifyRecovery(
    @Body() body: MfaRecoveryDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const session = await this.auth.completeMfa(
      body.challenge,
      "",
      body.recoveryCode,
      body.device,
      contextOf(request),
    );
    this.setRefreshCookie(reply, request, session.refreshToken);
    return session;
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  @ApiOperation({ summary: "Rotate the refresh token" })
  @ApiOkResponse({ type: SessionDto })
  async refresh(
    @Body() body: RefreshDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const raw = body.refreshToken ?? readRefreshCookie(request);
    if (!raw) throw authRequired();
    const session = await this.auth.refresh(raw, contextOf(request));
    this.setRefreshCookie(reply, request, session.refreshToken);
    return session;
  }

  @Post("logout")
  @ApiBearerAuth("access_token")
  @HttpCode(204)
  @ApiOperation({ summary: "End the current session" })
  async logout(
    @CurrentUser() user: User,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await this.auth.logout(readRefreshCookie(request), user, contextOf(request));
    clearRefreshCookie(reply, request);
  }

  @Get("me")
  @ApiBearerAuth("access_token")
  @ApiOperation({ summary: "Describe the signed-in staff member" })
  @ApiOkResponse({ type: PublicUserDto })
  me(@CurrentUser() user: User) {
    return this.auth.me(user);
  }

  @Get("devices")
  @ApiBearerAuth("access_token")
  @ApiOperation({ summary: "List active device sessions" })
  @ApiOkResponse({ type: DeviceListDto })
  async devices(
    @CurrentUser() user: User,
    @Req() request: FastifyRequest,
  ) {
    const raw = readRefreshCookie(request);
    const active = raw ? await this.auth.deviceIdForToken(raw) : null;
    return { data: await this.auth.listDevices(user, active) };
  }

  @Delete("devices/:id")
  @ApiBearerAuth("access_token")
  @HttpCode(204)
  @ApiOperation({ summary: "Revoke one of your device sessions" })
  async revokeDevice(
    @Param("id") id: string,
    @CurrentUser() user: User,
    @Req() request: AuthenticatedRequest,
  ) {
    const parsed = deviceIdSchema.safeParse({ deviceId: id });
    if (!parsed.success) {
      throw new ApiException(
        400,
        "INVALID_DEVICE_ID",
        "The device id is not valid.",
      );
    }
    await this.auth.revokeDevice(
      user,
      parsed.data.deviceId,
      contextOf(request),
    );
  }

  @Post("mfa/enroll")
  @ApiBearerAuth("access_token")
  @HttpCode(201)
  @ApiOperation({ summary: "Start authenticator enrollment" })
  @ApiCreatedResponse({ type: MfaEnrollmentDto })
  enrollMfa(@CurrentUser() user: User, @Req() request: AuthenticatedRequest) {
    return this.auth.enrollMfa(user, contextOf(request));
  }

  @Post("mfa/activate")
  @ApiBearerAuth("access_token")
  @HttpCode(204)
  @ApiOperation({ summary: "Confirm enrollment with a TOTP code" })
  async activateMfa(
    @Body() body: MfaActivateDto,
    @CurrentUser() user: User,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.auth.activateMfa(user, body.code, contextOf(request));
  }

  @Delete("mfa")
  @ApiBearerAuth("access_token")
  @HttpCode(204)
  @ApiOperation({ summary: "Turn off authenticator verification" })
  async disableMfa(
    @Query(new ZodValidationPipe(mfaDisableSchema)) query: { code: string },
    @CurrentUser() user: User,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.auth.disableMfa(user, query.code, contextOf(request));
  }

  private setRefreshCookie(
    reply: FastifyReply,
    request: FastifyRequest,
    raw: string,
  ): void {
    reply.setCookie(
      REFRESH_COOKIE,
      raw,
      cookieOptions(request, this.tokens.refreshTokenMaxAgeSeconds()),
    );
  }
}

function contextOf(request: FastifyRequest): RequestContext {
  return {
    requestId: request.id,
    ip: request.ip ?? null,
    userAgent: request.headers["user-agent"] ?? null,
  };
}

function readRefreshCookie(request: FastifyRequest): string | null {
  const value = request.cookies?.[REFRESH_COOKIE];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isSecure(request: FastifyRequest): boolean {
  if (request.protocol === "https") return true;
  const forwarded = request.headers["x-forwarded-proto"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (!first) return false;
  return first
    .split(",")
    .map((part) => part.trim())
    .includes("https");
}

function cookieOptions(request: FastifyRequest, maxAgeSeconds: number) {
  return {
    path: "/v1/auth",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecure(request),
    maxAge: maxAgeSeconds,
  };
}

function clearRefreshCookie(reply: FastifyReply, request: FastifyRequest): void {
  reply.setCookie(REFRESH_COOKIE, "", cookieOptions(request, 0));
}
