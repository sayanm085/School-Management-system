import "dotenv/config";

import { loadEnv } from "../config/env";
import { runMigrations } from "./migrate";
import { seedDatabase } from "./seed";

async function main() {
  const env = loadEnv();
  await runMigrations(env.DATABASE_URL);
  const result = await seedDatabase(env.DATABASE_URL, {
    demo: process.env.SEED_DEMO !== "false",
  });
  console.log(
    `Seeded school ${result.schoolId} · ${result.staff} staff · ${result.sections} sections · ${result.subjects} subjects · ${result.assignments} assignments · ${result.students} students · ${result.guardians} guardians · ${result.logins} logins`,
  );
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
