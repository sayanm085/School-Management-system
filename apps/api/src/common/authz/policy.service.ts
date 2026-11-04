import { Injectable } from "@nestjs/common";

import type { CurrentUser, Permission, Role } from "./permissions";
import {
  ASSISTANT_HEADMASTER_PERMISSIONS,
  ROLE_PERMISSIONS,
} from "./permissions";

@Injectable()
export class PolicyService {
  can(user: CurrentUser, permission: Permission): boolean {
    const base = ROLE_PERMISSIONS[user.role];
    if (base.includes(permission)) return true;
    if (
      user.isAssistantHeadmaster &&
      ASSISTANT_HEADMASTER_PERMISSIONS.includes(permission)
    ) {
      return true;
    }
    return false;
  }

  canAccessSection(user: CurrentUser, sectionId: string): boolean {
    if (user.role === "headmaster" || user.role === "clerk") return true;
    if (user.role !== "teacher") return false;
    return user.sectionIds.includes(sectionId);
  }

  permissionsFor(user: CurrentUser): Permission[] {
    const base = ROLE_PERMISSIONS[user.role];
    if (!user.isAssistantHeadmaster) return [...base];
    return Array.from(
      new Set<Permission>([
        ...base,
        ...ASSISTANT_HEADMASTER_PERMISSIONS,
      ]),
    );
  }

  roleHas(role: Role, permission: Permission) {
    return ROLE_PERMISSIONS[role].includes(permission);
  }
}
