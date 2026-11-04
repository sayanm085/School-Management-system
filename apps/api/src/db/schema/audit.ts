import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./identity";
import { schools } from "./school";

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey(),
    seq: bigint("seq", { mode: "number" })
      .notNull()
      .generatedAlwaysAsIdentity(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    requestId: text("request_id"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    schoolCreatedIndex: index("audit_events_school_created_idx").on(
      table.schoolId,
      table.createdAt,
    ),
    schoolSeqIndex: index("audit_events_school_seq_idx").on(
      table.schoolId,
      table.seq,
    ),
    actorIndex: index("audit_events_actor_idx").on(table.actorUserId),
  }),
);
