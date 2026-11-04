import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ZodValidationPipe } from "nestjs-zod";

import {
  AuditEventDto,
  AuditPageDto,
  auditListQuerySchema,
  type AuditListQueryDto,
} from "../../common/audit/audit.schemas";
import {
  AuditService,
  type AuditRow,
} from "../../common/audit/audit.service";
import {
  CurrentUser,
  RequirePermissions,
} from "../../common/authz/current-user";
import type { CurrentUser as User } from "../../common/authz/permissions";
// Value import, not `import type`: Nest resolves injected providers at runtime
// and this project has twice had DI break when an injected dependency was
// elided to a type-only import.
import { PolicyService } from "../../common/authz/policy.service";
import { DatabaseService } from "../../db/database.service";

@ApiTags("audit")
@ApiBearerAuth("access_token")
@Controller("audit")
@RequirePermissions("audit.view")
export class AuditController {
  constructor(
    private readonly audit: AuditService,
    private readonly database: DatabaseService,
    private readonly policy: PolicyService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List audit events, newest first" })
  @ApiOkResponse({ type: AuditPageDto })
  async list(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(auditListQuerySchema))
    query: AuditListQueryDto,
  ) {
    const page = await this.audit.list(this.database.db, user.schoolId, query);
    // Design §3.2/§3.3: Management's audit access is the ledger — who did what,
    // to which entity, when — never the contents. An event's `before`/`after`
    // can carry a full student detail projection (dob, address, guardian
    // phones) snapshotted by whoever made the edit, so the diff payloads are
    // gated on `students.view`, the same permission that guards the student
    // record routes. Both fields are already `nullable()` in the contract;
    // omitting the whole payload is safe by construction, where a per-key
    // redaction denylist would leak again on every module that widens these
    // `z.unknown()` columns.
    const withDiff = this.policy.can(user, "students.view");
    return {
      data: page.data.map((row) => toWire(row, withDiff)),
      nextCursor: page.nextCursor,
    };
  }
}

function toWire(row: AuditRow, withDiff: boolean) {
  return {
    id: row.id,
    actorUserId: row.actorUserId ?? null,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    before: withDiff ? (row.before ?? null) : null,
    after: withDiff ? (row.after ?? null) : null,
    requestId: row.requestId ?? null,
    ip: row.ip ?? null,
    userAgent: row.userAgent ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
