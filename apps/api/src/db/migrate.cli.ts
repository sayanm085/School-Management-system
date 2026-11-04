import "dotenv/config";

import { loadEnv } from "../config/env";
import { runMigrations } from "./migrate";

runMigrations(loadEnv().DATABASE_URL)
  .then(() => {
    console.log("Database migrations applied.");
  })
  .catch((error: unknown) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
