import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import {
  IS_PUBLIC_KEY,
  type AuthenticatedRequest,
} from "./current-user";
import { authRequired } from "../errors/api-error";
import { TokenService } from "../../modules/auth/token.service";
import { SessionService } from "../../modules/auth/session.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.tokens.bearer(request.headers.authorization);
    if (!token) throw authRequired();

    let claims;
    try {
      claims = await this.tokens.verifyAccessToken(token);
    } catch {
      throw authRequired();
    }

    const user = await this.sessions.loadCurrentUser(claims);
    if (!user) throw authRequired();

    request.user = user;
    return true;
  }
}
