import { Injectable } from "@nestjs/common";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import type { DbOrTx } from "../../db/client";
import { auditEvents } from "../../db/schema";
import { ApiException } from "../errors/api-error";
import {
  decodeCursor,
  encodeCursor,
  type CursorPage,
} from "../http/pagination";

export type AuditEventInput = {
  schoolId: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId?: string | null;
  before?: unknown;
  after?: unknown;
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

export type AuditListQuery = {
  limit: number;
  cursor?: string;
  from?: Date;
  to?: Date;
  actorUserId?: string;
  action?: string;
};

export type AuditRow = typeof auditEvents.$inferSelect;

function cursorOf(row: { seq: number }) {
  return encodeCursor({ s: row.seq });
}

@Injectable()
export class AuditService {
  async append(tx: DbOrTx, event: AuditEventInput): Promise<string> {
    const id = uuidv7();
    await tx.insert(auditEvents).values({
      id,
      schoolId: event.schoolId,
      actorUserId: event.actorUserId ?? null,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      before: event.before ?? null,
      after: event.after ?? null,
      requestId: event.requestId ?? null,
      ip: event.ip ?? null,
      userAgent: event.userAgent ?? null,
    });
    return id;
  }

  async appendMany(tx: DbOrTx, events: AuditEventInput[]): Promise<void> {
    if (events.length === 0) return;
    await tx.insert(auditEvents).values(
      events.map((event) => ({
        id: uuidv7(),
        schoolId: event.schoolId,
        actorUserId: event.actorUserId ?? null,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        before: event.before ?? null,
        after: event.after ?? null,
        requestId: event.requestId ?? null,
        ip: event.ip ?? null,
        userAgent: event.userAgent ?? null,
      })),
    );
  }

  async list(
    db: DbOrTx,
    schoolId: string,
    query: AuditListQuery,
  ): Promise<CursorPage<AuditRow>> {
    const conditions = [eq(auditEvents.schoolId, schoolId)];
    if (query.from) conditions.push(gte(auditEvents.createdAt, query.from));
    if (query.to) conditions.push(lt(auditEvents.createdAt, query.to));
    if (query.actorUserId) {
      conditions.push(eq(auditEvents.actorUserId, query.actorUserId));
    }
    if (query.action) conditions.push(eq(auditEvents.action, query.action));
    if (query.cursor) {
      const keyset = lt(auditEvents.seq, this.readCursor(query.cursor));
      conditions.push(keyset);
    }

    const rows = await db
      .select()
      .from(auditEvents)
      .where(and(...conditions))
      .orderBy(desc(auditEvents.seq))
      .limit(query.limit + 1);

    const data = rows.slice(0, query.limit);
    const hasMore = rows.length > query.limit;
    const last = data.at(-1);
    return {
      data,
      nextCursor: hasMore && last ? cursorOf(last) : null,
    };
  }

  private readCursor(cursor: string): number {
    const raw = decodeCursor(cursor);
    const seq = raw.s;
    if (typeof seq !== "number" || !Number.isSafeInteger(seq)) {
      throw new ApiException(
        400,
        "INVALID_CURSOR",
        "The cursor parameter is not a valid page cursor.",
      );
    }
    return seq;
  }
}
