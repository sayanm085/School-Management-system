import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { resolve } from "node:path";

import postgres from "postgres";

export async function runMigrations(
  url: string,
  folder = resolve(process.cwd(), "drizzle"),
) {
  const client = postgres(url, {
    max: 1,
    prepare: false,
    onnotice: () => undefined,
  });
  try {
    await migrate(drizzle(client), { migrationsFolder: folder });
  } finally {
    await client.end({ timeout: 5 });
  }
}
