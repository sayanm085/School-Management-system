import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { and, eq, isNull, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import { AuditService } from "../../common/audit/audit.service";
import { PolicyService } from "../../common/authz/policy.service";
import type { CurrentUser, Permission } from "../../common/authz/permissions";
import {
  ApiException,
  authRequired,
  invalidCredentials,
} from "../../common/errors/api-error";
import type { Env } from "../../config/env";
import { requireEnvValue } from "../../config/env";
import type { DbOrTx } from "../../db/client";
import { DatabaseService } from "../../db/database.service";
import { devices, mfaRecoveryCodes, schools, users } from "../../db/schema";
import { MfaService } from "./mfa.service";
import { PasswordService } from "./password.service";
import type { UserRecord } from "./session.service";
import { SessionService } from "./session.service";
import { TokenService } from "./token.service";
import type { DeviceInput, LoginInput } from "./auth.schemas";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const MFA_CHALLENGE_TTL_SECONDS = 120;

export type RequestContext = {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
};

export type PublicUser = {
  userId: string;
  staffId: string;
  employeeId: string;
  nameEn: string;
  nameBn: string;
  designation: string;
  role: CurrentUser["role"];
  isAssistantHeadmaster: boolean;
  mfaEnabled: boolean;
  permissions: Permission[];
  sectionIds: string[];
};

export type IssuedSession = {
  mfaRequired: false;
  accessToken: string;
  accessExpiresInSeconds: number;
  refreshToken: string;
  deviceId: string;
  user: PublicUser;
};

export type MfaChallenge = {
  mfaRequired: true;
  challenge: string;
  expiresInSeconds: number;
};

export type LoginResult = IssuedSession | MfaChallenge;

@Injectable()
export class AuthService {
  constructor(
    private readonly sessions: SessionService,
    private readonly tokens: TokenService,
    private readonly passwords: PasswordService,
    private readonly mfa: MfaService,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
    private readonly database: DatabaseService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async login(input: LoginInput, context: RequestContext): Promise<LoginResult> {
    const school = await this.resolveSchool(input.schoolCode);
    if (!school) {
      await this.passwords.verify(null, input.password);
      throw invalidCredentials();
    }

    const record = await this.sessions.findByEmployee(
      school.id,
      input.employeeId,
    );
    if (!record) {
      await this.passwords.verify(null, input.password);
      await this.auditFailure(context, school.id, input.employeeId, "unknown_user");
      throw invalidCredentials();
    }

    if (record.status === "disabled") {
      await this.passwords.verify(null, input.password);
      await this.auditFailure(context, school.id, record.employeeId, "disabled");
      throw invalidCredentials();
    }

    if (record.lockedUntil && record.lockedUntil.getTime() > Date.now()) {
      await this.auditFailure(context, school.id, record.employeeId, "locked");
      throw new ApiException(
        429,
        "AUTH_LOCKED",
        "Too many failed attempts. Try again later.",
        {
          retryAfterSeconds: Math.max(
            0,
            Math.ceil(
              (record.lockedUntil.getTime() - Date.now()) / 1000,
            ),
          ),
        },
      );
    }

    const ok = await this.passwords.verify(record.passwordHash, input.password);
    if (!ok) {
      await this.registerFailedLogin(record, context);
      await this.auditFailure(context, school.id, record.employeeId, "bad_password");
      throw invalidCredentials();
    }

    if (this.passwords.needsRehash(record.passwordHash)) {
      await this.database.db
        .update(users)
        .set({
          passwordHash: await this.passwords.hash(input.password),
          updatedAt: new Date(),
        })
        .where(eq(users.id, record.userId));
    }

    if (record.mfaEnabled) {
      const challenge = await this.tokens.signMfaChallenge(
        record.userId,
        record.schoolId,
      );
      await this.database.db.transaction(async (tx) => {
        await this.resetLoginCounters(tx, record.userId);
        await this.audit.append(tx, {
          schoolId: record.schoolId,
          actorUserId: record.userId,
          action: "auth.mfa_challenge",
          entityType: "user",
          entityId: record.userId,
          after: { result: "challenge_issued" },
          ...context,
        });
      });
      return {
        mfaRequired: true,
        challenge,
        expiresInSeconds: MFA_CHALLENGE_TTL_SECONDS,
      };
    }

    return this.issue(record, input.device, context);
  }

  async completeMfa(
    challenge: string,
    code: string,
    recoveryCode: string | undefined,
    device: DeviceInput | undefined,
    context: RequestContext,
  ): Promise<IssuedSession> {
    const verified = await this.tokens.verifyMfaChallenge(challenge);
    const record = await this.sessions.findById(verified.userId);
    if (!record || record.status !== "active") throw authRequired();

    const passed = recoveryCode
      ? await this.mfa.consumeRecoveryCode(record, recoveryCode)
      : this.mfa.verifyCode(record, code);

    if (!passed) {
      await this.auditFailure(
        context,
        record.schoolId,
        record.employeeId,
        recoveryCode ? "bad_recovery_code" : "bad_mfa_code",
        record.userId,
      );
      throw new ApiException(
        401,
        "AUTH_MFA_INVALID",
        "The verification code is not valid for this session.",
      );
    }

    const session = await this.issue(record, device, context);
    await this.database.db.transaction(async (tx) => {
      await this.audit.append(tx, {
        schoolId: record.schoolId,
        actorUserId: record.userId,
        action: recoveryCode ? "auth.mfa_recovery_used" : "auth.mfa_verified",
        entityType: "user",
        entityId: record.userId,
        after: { result: "success" },
        ...context,
      });
    });
    return session;
  }

  async refresh(
    rawToken: string,
    context: RequestContext,
  ): Promise<IssuedSession> {
    type Outcome =
      | { kind: "issued"; session: IssuedSession }
      | {
          kind: "reuse";
          familyId: string;
          schoolId: string;
          userId: string;
          tokenId: string;
        }
      | { kind: "rejected" };

    const outcome = await this.database.db.transaction(
      async (tx): Promise<Outcome> => {
        const row = await this.tokens.lockRefreshRow(tx, rawToken);
        if (!row) return { kind: "rejected" };
        if (row.revokedAt || row.rotatedAt) {
          return {
            kind: "reuse",
            familyId: row.familyId,
            schoolId: row.schoolId,
            userId: row.userId,
            tokenId: row.id,
          };
        }
        if (row.expiresAt.getTime() <= Date.now()) return { kind: "rejected" };

        const record = await this.sessions.findById(row.userId);
        if (!record || record.status !== "active") {
          return { kind: "rejected" };
        }

        await this.tokens.markRotated(tx, row.id);
        const refreshToken = this.tokens.newRefreshToken();
        await this.tokens.createRefreshRow(tx, {
          schoolId: row.schoolId,
          userId: row.userId,
          deviceId: row.deviceId,
          familyId: row.familyId,
          rawToken: refreshToken,
          ip: context.ip,
          userAgent: context.userAgent,
        });
        await tx
          .update(devices)
          .set({ lastSeenAt: new Date() })
          .where(eq(devices.id, row.deviceId));

        await this.audit.append(tx, {
          schoolId: row.schoolId,
          actorUserId: row.userId,
          action: "auth.refresh",
          entityType: "refresh_token",
          entityId: row.id,
          after: { result: "rotated" },
          ...context,
        });

        return {
          kind: "issued",
          session: {
            mfaRequired: false,
            accessToken: await this.tokens.signAccess(this.summaryOf(record)),
            accessExpiresInSeconds: this.accessTtlSeconds(),
            refreshToken,
            deviceId: row.deviceId,
            user: this.publicUser(record),
          },
        };
      },
    );

    if (outcome.kind === "issued") return outcome.session;

    if (outcome.kind === "reuse") {
      await this.database.db.transaction(async (tx) => {
        await this.tokens.revokeFamily(tx, outcome.familyId);
        await this.audit.append(tx, {
          schoolId: outcome.schoolId,
          actorUserId: outcome.userId,
          action: "auth.token_reuse",
          entityType: "refresh_token",
          entityId: outcome.tokenId,
          after: { result: "family_revoked" },
          ...context,
        });
      });
    }
    throw authRequired();
  }

  async logout(
    rawToken: string | null,
    user: CurrentUser,
    context: RequestContext,
  ): Promise<void> {
    await this.database.db.transaction(async (tx) => {
      if (rawToken) {
        const row = await this.tokens.lockRefreshRow(tx, rawToken);
        if (row) await this.tokens.revokeFamily(tx, row.familyId);
      } else {
        await this.tokens.revokeUser(tx, user.userId);
      }
      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "auth.logout",
        entityType: "user",
        entityId: user.userId,
        after: { result: "revoked" },
        ...context,
      });
    });
  }

  async me(user: CurrentUser): Promise<PublicUser> {
    const record = await this.sessions.findById(user.userId);
    if (!record || record.status !== "active") throw authRequired();
    return this.publicUser(record);
  }

  async deviceIdForToken(rawToken: string): Promise<string | null> {
    const row = await this.tokens.findRefresh(this.database.db, rawToken);
    return row?.deviceId ?? null;
  }

  async listDevices(user: CurrentUser, activeDeviceId: string | null) {
    const rows = await this.database.db
      .select()
      .from(devices)
      .where(and(eq(devices.userId, user.userId), isNull(devices.revokedAt)))
      .orderBy(sql`${devices.lastSeenAt} desc`);
    return rows.map((row) => ({
      id: row.id,
      platform: row.platform,
      name: row.name,
      appVersion: row.appVersion,
      lastSeenAt: row.lastSeenAt.toISOString(),
      current: row.id === activeDeviceId,
    }));
  }

  async revokeDevice(user: CurrentUser, deviceId: string, context: RequestContext) {
    const [device] = await this.database.db
      .select()
      .from(devices)
      .where(
        and(eq(devices.id, deviceId), eq(devices.userId, user.userId)),
      )
      .limit(1);
    if (!device) throw new ApiException(404, "DEVICE_NOT_FOUND", "Device was not found.");

    await this.database.db.transaction(async (tx) => {
      await tx
        .update(devices)
        .set({ revokedAt: new Date() })
        .where(eq(devices.id, deviceId));
      await this.tokens.revokeDevice(tx, deviceId);
      await this.audit.append(tx, {
        schoolId: user.schoolId,
        actorUserId: user.userId,
        action: "auth.device_revoked",
        entityType: "device",
        entityId: deviceId,
        before: { revokedAt: null },
        after: { revokedAt: new Date().toISOString() },
        ...context,
      });
    });
  }

  async enrollMfa(user: CurrentUser, context: RequestContext) {
    const record = await this.sessions.findById(user.userId);
    if (!record) throw authRequired();

    const secret = this.mfa.generateSecret();
    const recoveryCodes = this.mfa.newRecoveryCodes();
    const school = await this.resolveSchool();
    const encrypted = this.mfa.encrypt(secret);

    await this.database.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ mfaSecretEncrypted: encrypted, updatedAt: new Date() })
        .where(eq(users.id, record.userId));
      await this.mfa.storeRecoveryCodes(
        tx,
        { schoolId: record.schoolId, userId: record.userId },
        recoveryCodes,
      );
      await this.audit.append(tx, {
        schoolId: record.schoolId,
        actorUserId: record.userId,
        action: "auth.mfa_enrolled",
        entityType: "user",
        entityId: record.userId,
        after: { result: "pending", recoveryCodes: recoveryCodes.length },
        ...context,
      });
    });

    return {
      secret,
      otpauthUrl: this.mfa.otpauthUrl({
        secret,
        label: record.employeeId,
        schoolCode: school?.code ?? this.defaultSchoolCode(),
      }),
      recoveryCodes,
    };
  }

  async activateMfa(user: CurrentUser, code: string, context: RequestContext) {
    const record = await this.sessions.findById(user.userId);
    if (!record) throw authRequired();
    if (!record.mfaSecretEncrypted) {
      throw new ApiException(
        409,
        "MFA_NOT_ENROLLED",
        "Enroll an authenticator before activating MFA.",
      );
    }
    if (!this.mfa.verifyCode(record, code)) {
      await this.audit.append(this.database.db, {
        schoolId: record.schoolId,
        actorUserId: record.userId,
        action: "auth.mfa_activate_failed",
        entityType: "user",
        entityId: record.userId,
        after: { result: "invalid_code" },
        ...context,
      });
      throw new ApiException(
        422,
        "AUTH_MFA_INVALID",
        "The verification code is not valid.",
      );
    }

    await this.database.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ mfaEnabled: true, updatedAt: new Date() })
        .where(eq(users.id, record.userId));
      await this.audit.append(tx, {
        schoolId: record.schoolId,
        actorUserId: record.userId,
        action: "auth.mfa_activated",
        entityType: "user",
        entityId: record.userId,
        after: { result: "enabled" },
        ...context,
      });
    });
  }

  async disableMfa(user: CurrentUser, code: string, context: RequestContext) {
    const record = await this.sessions.findById(user.userId);
    if (!record) throw authRequired();
    if (!this.mfa.verifyCode(record, code)) {
      throw new ApiException(
        422,
        "AUTH_MFA_INVALID",
        "The verification code is not valid.",
      );
    }
    await this.database.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          mfaEnabled: false,
          mfaSecretEncrypted: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, record.userId));
      await tx
        .delete(mfaRecoveryCodes)
        .where(eq(mfaRecoveryCodes.userId, record.userId));
      await this.audit.append(tx, {
        schoolId: record.schoolId,
        actorUserId: record.userId,
        action: "auth.mfa_disabled",
        entityType: "user",
        entityId: record.userId,
        after: { result: "disabled" },
        ...context,
      });
    });
  }

  private async issue(
    record: UserRecord,
    device: DeviceInput | undefined,
    context: RequestContext,
  ): Promise<IssuedSession> {
    const refreshToken = this.tokens.newRefreshToken();
    const familyId = uuidv7();
    const input = device ?? { platform: "web" as const, name: "Browser" };

    const deviceId = await this.database.db.transaction(async (tx) => {
      const resolvedDeviceId = await this.ensureDevice(tx, record, input);
      await this.tokens.createRefreshRow(tx, {
        schoolId: record.schoolId,
        userId: record.userId,
        deviceId: resolvedDeviceId,
        familyId,
        rawToken: refreshToken,
        ip: context.ip,
        userAgent: context.userAgent,
      });
      await this.resetLoginCounters(tx, record.userId, new Date());
      await tx
        .update(devices)
        .set({ lastSeenAt: new Date() })
        .where(eq(devices.id, resolvedDeviceId));
      await this.audit.append(tx, {
        schoolId: record.schoolId,
        actorUserId: record.userId,
        action: "auth.login",
        entityType: "user",
        entityId: record.userId,
        after: { result: "success", device: resolvedDeviceId },
        ...context,
      });
      return resolvedDeviceId;
    });

    return {
      mfaRequired: false,
      accessToken: await this.tokens.signAccess(this.summaryOf(record)),
      accessExpiresInSeconds: this.accessTtlSeconds(),
      refreshToken,
      deviceId,
      user: this.publicUser(record),
    };
  }

  private async ensureDevice(
    tx: DbOrTx,
    record: UserRecord,
    input: DeviceInput,
  ): Promise<string> {
    if (input.id) {
      const [existing] = await tx
        .select()
        .from(devices)
        .where(
          and(
            eq(devices.id, input.id),
            eq(devices.userId, record.userId),
            isNull(devices.revokedAt),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new ApiException(
          401,
          "DEVICE_REVOKED",
          "This device was signed out. Sign in again to continue.",
        );
      }
      return existing.id;
    }

    const id = uuidv7();
    await tx.insert(devices).values({
      id,
      schoolId: record.schoolId,
      userId: record.userId,
      platform: input.platform,
      name: input.name,
      appVersion: input.appVersion ?? null,
    });
    return id;
  }

  private async registerFailedLogin(
    record: UserRecord,
    context: RequestContext,
  ): Promise<void> {
    const failures = record.failedLoginCount + 1;
    const lock = failures >= MAX_FAILED_LOGINS;
    await this.database.db
      .update(users)
      .set({
        failedLoginCount: failures,
        lockedUntil: lock
          ? new Date(Date.now() + LOCK_MINUTES * 60_000)
          : record.lockedUntil,
        updatedAt: new Date(),
      })
      .where(eq(users.id, record.userId));

    if (lock) {
      await this.audit.append(this.database.db, {
        schoolId: record.schoolId,
        actorUserId: record.userId,
        action: "auth.lockout",
        entityType: "user",
        entityId: record.userId,
        after: { failedLogins: failures, lockedMinutes: LOCK_MINUTES },
        ...context,
      });
    }
  }

  private async resetLoginCounters(
    tx: DbOrTx,
    userId: string,
    lastLoginAt?: Date,
  ): Promise<void> {
    await tx
      .update(users)
      .set({
        failedLoginCount: 0,
        lockedUntil: null,
        ...(lastLoginAt ? { lastLoginAt } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  private async auditFailure(
    context: RequestContext,
    schoolId: string,
    employeeId: string,
    reason: string,
    actorUserId?: string,
  ): Promise<void> {
    await this.audit.append(this.database.db, {
      schoolId,
      actorUserId: actorUserId ?? null,
      action: "auth.login_failed",
      entityType: "auth",
      entityId: employeeId,
      after: { result: "failure", reason },
      ...context,
    });
  }

  private async resolveSchool(code?: string) {
    const resolved = code ?? this.defaultSchoolCode();
    const [school] = await this.database.db
      .select()
      .from(schools)
      .where(eq(schools.code, resolved))
      .limit(1);
    return school ?? null;
  }

  private accessTtlSeconds(): number {
    return requireEnvValue(this.config, "ACCESS_TOKEN_TTL_SECONDS");
  }

  private defaultSchoolCode(): string {
    return requireEnvValue(this.config, "DEFAULT_SCHOOL_CODE");
  }

  private summaryOf(record: UserRecord) {
    return {
      userId: record.userId,
      schoolId: record.schoolId,
      employeeId: record.employeeId,
      role: record.role,
      tokenVersion: record.tokenVersion,
    };
  }

  private publicUser(record: UserRecord): PublicUser {
    const session = this.sessionUser(record);
    return {
      userId: record.userId,
      staffId: record.staffId,
      employeeId: record.employeeId,
      nameEn: record.nameEn,
      nameBn: record.nameBn,
      designation: record.designation,
      role: record.role,
      isAssistantHeadmaster: record.isAssistantHeadmaster,
      mfaEnabled: record.mfaEnabled,
      permissions: this.policy.permissionsFor(session),
      sectionIds: session.sectionIds,
    };
  }

  private sessionUser(record: UserRecord): CurrentUser {
    return {
      userId: record.userId,
      schoolId: record.schoolId,
      employeeId: record.employeeId,
      staffId: record.staffId,
      role: record.role,
      nameEn: record.nameEn,
      nameBn: record.nameBn,
      designation: record.designation,
      tokenVersion: record.tokenVersion,
      isAssistantHeadmaster: record.isAssistantHeadmaster,
      assignments: record.assignments,
      sectionIds: Array.from(
        new Set(
          record.assignments
            .map((assignment) => assignment.sectionId)
            .filter((id): id is string => typeof id === "string"),
        ),
      ),
    };
  }
}
