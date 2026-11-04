import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import type { Role } from "../../common/authz/permissions";
import { requireEnvValue, type Env } from "../../config/env";
import type { DbOrTx } from "../../db/client";
import { refreshTokens } from "../../db/schema";

export type AccessClaims = {
  sub: string;
  sid: string;
  emp: string;
  role: Role;
  tv: number;
};

export type MfaChallengeClaims = {
  sub: string;
  sid: string;
  typ: "mfa_challenge";
};

export type SessionSummary = {
  userId: string;
  schoolId: string;
  employeeId: string;
  role: Role;
  tokenVersion: number;
};

export type RefreshRow = typeof refreshTokens.$inferSelect;

const REFRESH_BYTES = 48;
const MFA_CHALLENGE_TTL_SECONDS = 120;
const MAX_REFRESH_TTL_DAYS = 400;
const MILLISECONDS_PER_DAY = 86_400_000;

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshPepper: string;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlDays: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService<Env, true>,
  ) {
    this.accessSecret = requireEnvValue(config, "JWT_ACCESS_SECRET");
    this.refreshPepper = requireEnvValue(config, "JWT_REFRESH_PEPPER");
    this.accessTtlSeconds = requireEnvValue(config, "ACCESS_TOKEN_TTL_SECONDS");
    this.refreshTtlDays = Math.min(
      requireEnvValue(config, "REFRESH_TOKEN_TTL_DAYS"),
      MAX_REFRESH_TTL_DAYS,
    );
  }

  signAccess(session: SessionSummary): Promise<string> {
    const claims: AccessClaims = {
      sub: session.userId,
      sid: session.schoolId,
      emp: session.employeeId,
      role: session.role,
      tv: session.tokenVersion,
    };
    return this.jwt.signAsync(claims, {
      secret: this.accessSecret,
      expiresIn: this.accessTtlSeconds,
    });
  }

  async verifyAccessToken(token: string): Promise<AccessClaims> {
    const claims = await this.jwt.verifyAsync<AccessClaims & {
      typ?: string;
    }>(token, { secret: this.accessSecret });
    if (claims.typ === "mfa_challenge") {
      throw new Error("MFA challenge tokens cannot authorize requests");
    }
    return claims;
  }

  signMfaChallenge(userId: string, schoolId: string): Promise<string> {
    const claims: MfaChallengeClaims = {
      sub: userId,
      sid: schoolId,
      typ: "mfa_challenge",
    };
    return this.jwt.signAsync(claims, {
      secret: this.accessSecret,
      expiresIn: MFA_CHALLENGE_TTL_SECONDS,
    });
  }

  async verifyMfaChallenge(
    token: string,
  ): Promise<{ userId: string; schoolId: string }> {
    const claims = await this.jwt.verifyAsync<MfaChallengeClaims>(token, {
      secret: this.accessSecret,
    });
    if (claims.typ !== "mfa_challenge") {
      throw new Error("Not an MFA challenge token");
    }
    return { userId: claims.sub, schoolId: claims.sid };
  }

  newRefreshToken(): string {
    return randomBytes(REFRESH_BYTES).toString("base64url");
  }

  hashRefreshToken(raw: string): string {
    return createHmac("sha256", this.refreshPepper)
      .update(raw)
      .digest("hex");
  }

  matches(raw: string, storedHash: string): boolean {
    const candidate = Buffer.from(this.hashRefreshToken(raw), "hex");
    const stored = Buffer.from(storedHash, "hex");
    return (
      candidate.length === stored.length && timingSafeEqual(candidate, stored)
    );
  }

  refreshTokenExpiry(now = new Date()): Date {
    return new Date(now.getTime() + this.refreshTtlDays * MILLISECONDS_PER_DAY);
  }

  refreshTokenMaxAgeSeconds(): number {
    return this.refreshTtlDays * MILLISECONDS_PER_DAY;
  }

  async createRefreshRow(
    tx: DbOrTx,
    input: {
      schoolId: string;
      userId: string;
      deviceId: string;
      familyId: string;
      rawToken: string;
      ip?: string | null;
      userAgent?: string | null;
      expiresAt?: Date;
    },
  ): Promise<string> {
    const id = uuidv7();
    await tx.insert(refreshTokens).values({
      id,
      schoolId: input.schoolId,
      userId: input.userId,
      deviceId: input.deviceId,
      familyId: input.familyId,
      tokenHash: this.hashRefreshToken(input.rawToken),
      expiresAt: input.expiresAt ?? this.refreshTokenExpiry(),
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    });
    return id;
  }

  async findRefresh(
    tx: DbOrTx,
    rawToken: string,
  ): Promise<RefreshRow | null> {
    const rows = await tx
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, this.hashRefreshToken(rawToken)))
      .limit(1);
    return rows[0] ?? null;
  }

  async lockRefreshRow(
    tx: DbOrTx,
    rawToken: string,
  ): Promise<RefreshRow | null> {
    const rows = await tx
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, this.hashRefreshToken(rawToken)))
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  async markRotated(tx: DbOrTx, id: string, at = new Date()): Promise<void> {
    await tx
      .update(refreshTokens)
      .set({ rotatedAt: at })
      .where(eq(refreshTokens.id, id));
  }

  async revokeFamily(tx: DbOrTx, familyId: string, at = new Date()): Promise<void> {
    await tx
      .update(refreshTokens)
      .set({ revokedAt: at })
      .where(eq(refreshTokens.familyId, familyId));
  }

  async revokeUser(tx: DbOrTx, userId: string, at = new Date()): Promise<void> {
    await tx
      .update(refreshTokens)
      .set({ revokedAt: at })
      .where(eq(refreshTokens.userId, userId));
  }

  async revokeDevice(tx: DbOrTx, deviceId: string, at = new Date()): Promise<void> {
    await tx
      .update(refreshTokens)
      .set({ revokedAt: at })
      .where(eq(refreshTokens.deviceId, deviceId));
  }

  bearer(header: string | undefined): string | null {
    if (!header) return null;
    const parts = header.split(" ");
    if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer") {
      return null;
    }
    return parts[1] ?? null;
  }
}
