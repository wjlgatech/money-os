import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../config";
import * as schema from "./schema";

function createDb() {
  if (!config.hasDatabaseUrl) {
    return null;
  }
  const client = postgres(config.databaseUrl);
  return drizzle(client, { schema });
}

export const db = createDb();
export type Database = NonNullable<typeof db>;
