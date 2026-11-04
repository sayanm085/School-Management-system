import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodValidationException } from "nestjs-zod";

import { extensionMembers, problemBody } from "./problem";

const fallbackCode: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "VALIDATION_FAILED",
  428: "PRECONDITION_REQUIRED",
  429: "RATE_LIMITED",
  500: "INTERNAL_ERROR",
};

const fallbackTitle: Record<number, string> = {
  400: "Bad request",
  401: "Authentication required",
  403: "Forbidden",
  404: "Not found",
  409: "Conflict",
  422: "Validation failed",
  428: "Precondition required",
  429: "Too many requests",
  500: "Internal server error",
};

type ZodIssueLike = { path?: unknown; message?: unknown };

function zodIssues(value: unknown) {
  const container = value as { issues?: unknown } | null;
  const issues = Array.isArray(container?.issues) ? container.issues : [];
  return issues.map((entry) => {
    const issue = (entry ?? {}) as ZodIssueLike;
    const path = Array.isArray(issue.path)
      ? issue.path.map(String).join(".")
      : String(issue.path ?? "");
    return {
      path,
      message:
        typeof issue.message === "string"
          ? issue.message
          : "Invalid value.",
    };
  });
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    const requestId = request.id;

    let status = 500;
    let code = "INTERNAL_ERROR";
    let title = fallbackTitle[500];
    let detail = "An unexpected error occurred.";
    let errors: unknown[] | undefined;
    let extensions: Record<string, unknown> | undefined;

    if (exception instanceof ZodValidationException) {
      status = 422;
      code = "VALIDATION_FAILED";
      title = "Validation failed";
      detail = "The request body, query, or parameters are invalid.";
      errors = zodIssues(exception.getZodError());
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = fallbackCode[status] ?? `HTTP_${status}`;
      title = fallbackTitle[status] ?? "Request failed";
      const raw = exception.getResponse();
      if (typeof raw === "string") {
        detail = raw;
      } else if (raw && typeof raw === "object") {
        const body = raw as Record<string, unknown>;
        if (typeof body.code === "string") code = body.code;
        if (typeof body.detail === "string") detail = body.detail;
        else if (typeof body.message === "string") detail = body.message;
        else if (Array.isArray(body.message)) {
          detail = body.message.join(", ");
        }
        if (Array.isArray(body.errors)) errors = body.errors;
        const extra = extensionMembers(body);
        if (Object.keys(extra).length > 0) extensions = extra;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled error on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
    }

    if (status === 404 && /^Cannot\s/.test(detail)) {
      detail = "The requested endpoint was not found.";
    }

    const problem = problemBody({
      status,
      code,
      title,
      detail,
      requestId,
      instance: request.url,
      errors,
      extensions,
    });

    reply
      .status(status)
      .type("application/problem+json")
      .send(problem);
  }
}
