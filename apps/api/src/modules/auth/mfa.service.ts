import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eq } from "drizzle-orm";
import { authenticator } from "otplib";
import { v7 as uuidv7 } from "uuid";

import { ApiException } from "../../common/errors/api-error";
import { requireEnvValue, type Env } from "../../config/env";
import type { DbOrTx } from "../../db/client";
import { DatabaseService } from "../../db/database.service";
import { mfaRecoveryCodes, users } from "../../db/schema";
import { PasswordService } from "./password.service";
import type { UserRecord } from "./session.service";

const RECOVERY_CODE_COUNT = 10;
const ISSUER = "Baranda School";
const TOTP_WINDOW = 1;

export function normalizeRecoveryCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

@Injectable()
export class MfaService {
  private readonly key: Buffer;

  constructor(
    config: ConfigService<Env, true>,
    private readonly database: DatabaseService,
    private readonly passwords: PasswordService,
  ) {
    this.key = Buffer.from(
      requireEnvValue(config, "MFA_ENCRYPTION_KEY"),
      "base64",
    );
    authenticator.options = { window: TOTP_WINDOW, step: 30 };
  }

  generateSecret(): string {
    return authenticator.generateSecret(20);
  }

  encrypt(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(secret, "utf8"),
      cipher.final(),
    ]);
    return [
      "v1",
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(":");
  }

  decrypt(stored: string): string {
    const parts = stored.split(":");
    if (parts.length !== 4 || parts[0] !== "v1") {
      throw new ApiException(
        500,
        "MFA_SECRET_UNREADABLE",
        "The stored MFA secret cannot be read.",
      );
    }
    const [, ivPart, tagPart, dataPart] = parts as [
      string,
      string,
      string,
      string,
    ];
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(ivPart, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }

  otpauthUrl(input: {
    secret: string;
    label: string;
    schoolCode: string;
  }): string {
    return authenticator.keyuri(
      `${input.label}@${input.schoolCode}`,
      ISSUER,
      input.secret,
    );
  }

  newRecoveryCodes(): string[] {
    return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
      const raw = randomBytes(5).toString("hex").toUpperCase();
      return `${raw.slice(0, 5)}-${raw.slice(5)}`;
    });
  }

  verifyCode(record: UserRecord, code: string): boolean {
    if (!record.mfaSecretEncrypted) return false;
    const normalized = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(normalized)) return false;
    try {
      return authenticator.verify({
        token: normalized,
        secret: this.decrypt(record.mfaSecretEncrypted),
      });
    } catch {
      return false;
    }
  }

  async storeRecoveryCodes(
    tx: DbOrTx,
    input: { schoolId: string; userId: string },
    codes: string[],
  ): Promise<void> {
    await tx
      .delete(mfaRecoveryCodes)
      .where(eq(mfaRecoveryCodes.userId, input.userId));
    for (const code of codes) {
      await tx.insert(mfaRecoveryCodes).values({
        id: uuidv7(),
        schoolId: input.schoolId,
        userId: input.userId,
        codeHash: await this.passwords.hash(normalizeRecoveryCode(code)),
      });
    }
  }

  async saveSecret(userId: string, secretEncrypted: string): Promise<void> {
    await this.database.db
      .update(users)
      .set({
        mfaSecretEncrypted: secretEncrypted,
        mfaEnabled: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async setEnabled(userId: string, enabled: boolean): Promise<void> {
    await this.database.db
      .update(users)
      .set({ mfaEnabled: enabled, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async consumeRecoveryCode(
    record: UserRecord,
    submitted: string,
  ): Promise<boolean> {
    const normalized = normalizeRecoveryCode(submitted);
    if (normalized.length < 8) return false;
    const candidates = await this.database.db
      .select()
      .from(mfaRecoveryCodes)
      .where(eq(mfaRecoveryCodes.userId, record.userId));

    for (const row of candidates) {
      if (row.usedAt !== null) continue;
      if (await this.passwords.verify(row.codeHash, normalized)) {
        await this.database.db
          .update(mfaRecoveryCodes)
          .set({ usedAt: new Date() })
          .where(eq(mfaRecoveryCodes.id, row.id));
        return true;
      }
    }
    return false;
  }
}
