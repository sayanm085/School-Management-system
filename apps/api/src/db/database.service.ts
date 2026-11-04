import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../config/env";
import { requireEnvValue } from "../config/env";
import { createDb, type Database, type DbHandle } from "./client";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly handle: DbHandle;
  readonly db: Database;

  constructor(config: ConfigService<Env, true>) {
    this.handle = createDb(requireEnvValue(config, "DATABASE_URL"));
    this.db = this.handle.db;
  }

  async onModuleDestroy() {
    await this.handle.close();
  }
}
