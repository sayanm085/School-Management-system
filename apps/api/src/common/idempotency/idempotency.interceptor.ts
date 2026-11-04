import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { HTTP_CODE_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { Observable, catchError, of, switchMap } from "rxjs";

import type { AuthenticatedRequest } from "../authz/current-user";
import { ApiException } from "../errors/api-error";
import { IdempotencyService } from "./idempotency.service";

const MIN_KEY_LENGTH = 8;
const MAX_KEY_LENGTH = 128;
const KEY_PATTERN = /^[\w.-]+$/;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly service: IdempotencyService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    if (context.getType() !== "http") return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    if (request.method.toUpperCase() !== "POST") return next.handle();

    const key = (request as FastifyRequest).headers["idempotency-key"];
    const user = request.user;
    if (typeof key !== "string" || key.length === 0 || !user) {
      return next.handle();
    }
    if (
      key.length < MIN_KEY_LENGTH ||
      key.length > MAX_KEY_LENGTH ||
      !KEY_PATTERN.test(key)
    ) {
      throw new ApiException(
        400,
        "INVALID_IDEMPOTENCY_KEY",
        `The Idempotency-Key must be ${MIN_KEY_LENGTH} to ${MAX_KEY_LENGTH} letters, digits, dots, underscores or hyphens.`,
      );
    }

    const route = `${request.method} ${request.routeOptions?.url ?? request.url}`;
    const reservation = await this.service.reserve({
      schoolId: user.schoolId,
      userId: user.userId,
      key,
      route,
      body: request.body,
    });

    if (reservation.kind === "conflict") {
      throw new ApiException(
        409,
        "IDEMPOTENCY_CONFLICT",
        "This Idempotency-Key was already used with a different request body.",
      );
    }
    if (reservation.kind === "in_progress") {
      throw new ApiException(
        409,
        "IDEMPOTENCY_IN_PROGRESS",
        "A request with this Idempotency-Key is still being processed.",
      );
    }
    if (reservation.kind === "replay") {
      return of(reservation.body);
    }

    const status = this.successStatus(context);
    return next.handle().pipe(
      switchMap(async (value: unknown) => {
        if (status === 204) {
          await this.service.release(reservation.id);
          return value;
        }
        await this.service.commit(reservation.id, status, value);
        return value;
      }),
      catchError(async (error: unknown) => {
        await this.service.release(reservation.id);
        throw error;
      }),
    );
  }

  private successStatus(context: ExecutionContext): number {
    const declared = this.reflector.getAllAndOverride<number>(
      HTTP_CODE_METADATA,
      [context.getHandler(), context.getClass()],
    );
    return declared ?? 201;
  }
}
