import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

export const scans = sqliteTable(
  "scans",
  {
    id: text("id").primaryKey(),
    crop: text("crop").notNull(),
    symptoms: text("symptoms"),
    affectedPart: text("affected_part"),
    growthStage: text("growth_stage"),
    affectedAreaPercentage: integer("affected_area_percentage"),
    nearbyPlantsAffected: integer("nearby_plants_affected", { mode: "boolean" }),
    notes: text("notes"),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    locationState: text("location_state").notNull().default(""),
    locationDistrict: text("location_district").notNull().default(""),
    imagePath: text("image_path"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("scans_created_at_idx").on(table.createdAt),
    index("scans_location_idx").on(table.latitude, table.longitude),
    index("scans_regional_location_idx").on(
      table.locationState,
      table.locationDistrict,
      table.crop,
    ),
  ],
);

export const diagnoses = sqliteTable(
  "diagnoses",
  {
    id: text("id").primaryKey(),
    scanId: text("scan_id")
      .notNull()
      .references(() => scans.id, { onDelete: "cascade" }),
    conditionCode: text("condition_code").notNull(),
    conditionName: text("condition_name").notNull(),
    confidence: real("confidence").notNull(),
    severity: text("severity").notNull(),
    modelVersion: text("model_version").notNull(),
    isSimulated: integer("is_simulated", { mode: "boolean" })
      .notNull()
      .default(true),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [index("diagnoses_scan_id_idx").on(table.scanId)],
);

export const weatherSnapshots = sqliteTable(
  "weather_snapshots",
  {
    id: text("id").primaryKey(),
    scanId: text("scan_id")
      .notNull()
      .references(() => scans.id, { onDelete: "cascade" }),
    temperatureCelsius: real("temperature_celsius"),
    relativeHumidityPercentage: real("relative_humidity_percentage"),
    precipitationMm: real("precipitation_mm"),
    windSpeedKph: real("wind_speed_kph"),
    source: text("source").notNull().default("open-meteo"),
    observedAt: timestamp("observed_at").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [index("weather_snapshots_scan_id_idx").on(table.scanId)],
);

export const advisories = sqliteTable(
  "advisories",
  {
    id: text("id").primaryKey(),
    diagnosisId: text("diagnosis_id")
      .notNull()
      .references(() => diagnoses.id, { onDelete: "cascade" }),
    locale: text("locale").notNull().default("en-IN"),
    summary: text("summary").notNull(),
    immediateActions: text("immediate_actions").notNull(),
    provider: text("provider").notNull(),
    model: text("model"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [index("advisories_diagnosis_id_idx").on(table.diagnosisId)],
);

export type Scan = typeof scans.$inferSelect;
export type NewScan = typeof scans.$inferInsert;
