import type Database from "better-sqlite3";

const migrations = [
  {
    id: "0001_wellfarm_core",
    sql: `
      CREATE TABLE scans (
        id TEXT PRIMARY KEY NOT NULL,
        crop TEXT NOT NULL,
        symptoms TEXT,
        affected_part TEXT,
        growth_stage TEXT,
        affected_area_percentage INTEGER,
        nearby_plants_affected INTEGER,
        notes TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        image_path TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );

      CREATE INDEX scans_created_at_idx ON scans(created_at);
      CREATE INDEX scans_location_idx ON scans(latitude, longitude);

      CREATE TABLE diagnoses (
        id TEXT PRIMARY KEY NOT NULL,
        scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
        condition_code TEXT NOT NULL,
        condition_name TEXT NOT NULL,
        confidence REAL NOT NULL,
        severity TEXT NOT NULL,
        model_version TEXT NOT NULL,
        is_simulated INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );

      CREATE INDEX diagnoses_scan_id_idx ON diagnoses(scan_id);

      CREATE TABLE weather_snapshots (
        id TEXT PRIMARY KEY NOT NULL,
        scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
        temperature_celsius REAL,
        relative_humidity_percentage REAL,
        precipitation_mm REAL,
        wind_speed_kph REAL,
        source TEXT NOT NULL DEFAULT 'open-meteo',
        observed_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );

      CREATE INDEX weather_snapshots_scan_id_idx ON weather_snapshots(scan_id);

      CREATE TABLE advisories (
        id TEXT PRIMARY KEY NOT NULL,
        diagnosis_id TEXT NOT NULL REFERENCES diagnoses(id) ON DELETE CASCADE,
        locale TEXT NOT NULL DEFAULT 'en-IN',
        summary TEXT NOT NULL,
        immediate_actions TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );

      CREATE INDEX advisories_diagnosis_id_idx ON advisories(diagnosis_id);
    `,
  },
] as const;

export function runMigrations(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _wellfarm_migrations (
      id TEXT PRIMARY KEY NOT NULL,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
  `);

  const hasMigration = sqlite.prepare(
    "SELECT 1 FROM _wellfarm_migrations WHERE id = ?",
  );
  const recordMigration = sqlite.prepare(
    "INSERT INTO _wellfarm_migrations (id) VALUES (?)",
  );

  const applyMigration = sqlite.transaction((id: string, sql: string) => {
    sqlite.exec(sql);
    recordMigration.run(id);
  });

  for (const migration of migrations) {
    if (!hasMigration.get(migration.id)) {
      applyMigration(migration.id, migration.sql);
    }
  }
}
