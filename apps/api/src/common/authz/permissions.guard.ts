import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { AuditService } from "../audit/audit.service";
import { DatabaseService } from "../../db/database.service";
import { authRequired, forbidden } from "../errors/api-error";
import {
  PERMISSIONS_KEY,
  type AuthenticatedRequest,
} from "./current-user";
import { PolicyService } from "./policy.service";
import type { Permission } from "./permissions";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
    private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndMerge<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) throw authRequired();

    const missing = required.filter(
      (permission) => !this.policy.can(user, permission),
    );
    if (missing.length === 0) return true;

    await this.audit.append(this.database.db, {
      schoolId: user.schoolId,
      actorUserId: user.userId,
      action: "policy.denied",
      entityType: "request",
      entityId: request.id,
      after: {
        method: request.method,
        path: request.url,
        missing,
      },
      requestId: request.id,
      ip: request.ip ?? null,
      userAgent: request.headers["user-agent"] ?? null,
    });
    throw forbidden(missing);
  }
}
