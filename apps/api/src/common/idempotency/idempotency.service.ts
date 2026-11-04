import { createHash } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { and, eq, lt } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import { DatabaseService } from "../../db/database.service";
import { idempotencyKeys } from "../../db/schema";
import { isUniqueViolation } from "../errors/db-error";
import { canonicalize } from "../http/stable-json";

const TTL_MILLISECONDS = 24 * 60 * 60 * 1000;

export type Reservation =
  | { kind: "run"; id: string }
  | { kind: "replay"; status: number; body: unknown }
  | { kind: "conflict" }
  | { kind: "in_progress" };

export type ReserveInput = {
  schoolId: string;
  userId: string;
  key: string;
  route: string;
  body: unknown;
};

@Injectable()
export class IdempotencyService {
  constructor(private readonly database: DatabaseService) {}

  requestHash(route: string, body: unknown): string {
    return createHash("sha256")
      .update(`${route}|${JSON.stringify(canonicalize(body ?? null))}`)
      .digest("hex");
  }

  async reserve(input: ReserveInput, attempt = 0): Promise<Reservation> {
    const db = this.database.db;
    const now = new Date();
    const requestHash = this.requestHash(input.route, input.body);
    const id = uuidv7();

    try {
      await db.insert(idempotencyKeys).values({
        id,
        schoolId: input.schoolId,
        userId: input.userId,
        key: input.key,
        route: input.route,
        requestHash,
        responseStatus: 0,
        responseBody: null,
        expiresAt: new Date(now.getTime() + TTL_MILLISECONDS),
      });
      return { kind: "run", id };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }

    const [row] = await db
      .select()
      .from(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.userId, input.userId),
          eq(idempotencyKeys.key, input.key),
        ),
      )
      .limit(1);

    if (!row) return { kind: "in_progress" };

    if (row.expiresAt.getTime() <= now.getTime() && attempt < 1) {
      await db
        .delete(idempotencyKeys)
        .where(eq(idempotencyKeys.id, row.id));
      return this.reserve(input, attempt + 1);
    }

    if (row.requestHash !== requestHash) return { kind: "conflict" };
    if (row.responseStatus === 0) return { kind: "in_progress" };
    return { kind: "replay", status: row.responseStatus, body: row.responseBody };
  }

  async commit(id: string, status: number, body: unknown): Promise<void> {
    await this.database.db
      .update(idempotencyKeys)
      .set({ responseStatus: status, responseBody: body ?? null })
      .where(eq(idempotencyKeys.id, id));
  }

  async release(id: string): Promise<void> {
    await this.database.db
      .delete(idempotencyKeys)
      .where(eq(idempotencyKeys.id, id));
  }

  async purgeExpired(now = new Date()): Promise<number> {
    const deleted = await this.database.db
      .delete(idempotencyKeys)
      .where(lt(idempotencyKeys.expiresAt, now))
      .returning({ id: idempotencyKeys.id });
    return deleted.length;
  }
}
