import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import cookie from "@fastify/cookie";
import type { FastifyInstance } from "fastify";
import { ZodValidationPipe } from "nestjs-zod";

import { ProblemDetailsFilter } from "./common/errors/problem-details.filter";
import { registerRequestId } from "./common/http/request-id";
import { requireEnvValue, type Env } from "./config/env";
import { AppModule } from "./app.module";
import { buildOpenApiDocument } from "./modules/openapi/openapi.factory";
import { OpenApiDocumentHolder } from "./modules/openapi/openapi-document.holder";

export async function createApp(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, bodyLimit: 1024 * 1024 }),
  );

  app.setGlobalPrefix("v1", {
    exclude: [
      "health",
      "health/live",
      "health/ready",
      "openapi.json",
    ],
  });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalPipes(new ZodValidationPipe());

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const webOrigin = requireEnvValue(config, "WEB_ORIGIN");
  app.enableCors({
    origin: [webOrigin],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  });

  await app.register(cookie);
  registerRequestId(getFastify(app));

  await app.init();
  await getFastify(app).ready();

  if (requireEnvValue(config, "NODE_ENV") !== "production") {
    app.get(OpenApiDocumentHolder).set(buildOpenApiDocument(app));
  }

  return app;
}

export function getFastify(app: NestFastifyApplication): FastifyInstance {
  return app.getHttpAdapter().getInstance() as FastifyInstance;
}
