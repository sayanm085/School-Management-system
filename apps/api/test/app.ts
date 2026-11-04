import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { FastifyInstance, InjectOptions } from "fastify";

import { createApp, getFastify } from "../src/app.setup";
import type { Database } from "../src/db/client";
import { DatabaseService } from "../src/db/database.service";
import { migrateTestDb, truncateAll } from "./db";

export type TestResponse = Awaited<ReturnType<FastifyInstance["inject"]>>;

export type TestApp = {
  app: NestFastifyApplication;
  fastify: FastifyInstance;
  db: Database;
  request: (options: InjectOptions) => Promise<TestResponse>;
  reset: () => Promise<void>;
  close: () => Promise<void>;
};

export async function createTestApp(): Promise<TestApp> {
  await migrateTestDb();
  const app = await createApp();
  const fastify = getFastify(app);
  const database = app.get(DatabaseService);
  await truncateAll(database.handle.sql);
  return {
    app,
    fastify,
    db: database.db,
    request: (options) => fastify.inject(options),
    reset: () => truncateAll(database.handle.sql),
    close: () => app.close(),
  };
}
