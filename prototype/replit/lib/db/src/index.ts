import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { databasePath } from "./config";
import { runMigrations } from "./migrations";
import * as schema from "./schema";

export const sqlite: Database.Database = new Database(databasePath);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");

runMigrations(sqlite);

export const db = drizzle(sqlite, { schema });

export function checkDatabase(): void {
  sqlite.prepare("SELECT 1").get();
}

export function closeDatabase(): void {
  if (sqlite.open) {
    sqlite.close();
  }
}

export { databasePath } from "./config";
export * from "./schema";
