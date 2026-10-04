import { SQL } from "bun";
import { config } from "./config";

export const sql = new SQL(config.DATABASE_URL);

export async function initDb() {
  if (config.DATABASE_SCHEMA && config.DATABASE_SCHEMA !== "public") {
    // Sanitize schema name for SQL identifier
    const safeSchema = config.DATABASE_SCHEMA.replace(/[^a-zA-Z0-9_]/g, "");
    if (safeSchema) {
      await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "${safeSchema}";`);
      await sql.unsafe(`SET search_path TO "${safeSchema}", public;`);
    }
  }
}

export async function runMigrations() {
  await initDb();
  const migrationFile = Bun.file("./migrations/001_initial_schema.sql");
  if (await migrationFile.exists()) {
    const migrationSql = await migrationFile.text();
    await sql.unsafe(migrationSql);
  }
}
