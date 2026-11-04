import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;
export type Transaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];
export type DbOrTx = Database | Transaction;

export type DbHandle = {
  db: Database;
  sql: Sql;
  close: () => Promise<void>;
};

export function createDb(url: string, max = 10): DbHandle {
  const sql = postgres(url, {
    max,
    prepare: false,
    onnotice: () => undefined,
  });
  return {
    db: drizzle(sql, { schema }),
    sql,
    close: () => sql.end({ timeout: 5 }),
  };
}
