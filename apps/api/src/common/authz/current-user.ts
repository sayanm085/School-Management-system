import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import type {
  CurrentUser as SessionUser,
  Permission,
} from "./permissions";

export const IS_PUBLIC_KEY = "baranda:isPublic";
export const PERMISSIONS_KEY = "baranda:permissions";

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export type AuthenticatedRequest = FastifyRequest & {
  user?: SessionUser;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser | undefined =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
