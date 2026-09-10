import { randomUUID } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { db, sqlite, scans, type Scan } from "@workspace/db";
import type { Account } from "../routes/account";
import { supabaseAdmin, usesSupabase } from "./supabase-auth";
import { isSharedAuthProject } from "./auth-project-policy";

const table = "wellfarm_scans";
export const scanImageBucket = "wellfarm-scan-images";

type ScanRow = {
  id: string;
  owner_id: string;
  crop: string;
  symptoms: string[] | null;
  affected_part: string | null;
  growth_stage: string | null;
  affected_area_percentage: number | null;
  nearby_plants_affected: boolean | null;
  notes: string | null;
  latitude: number;
  longitude: number;
  location_state: string;
  location_district: string;
  image_object_path: string | null;
  image_content_type: string | null;
  status: string;
  analysis: unknown | null;
  hidden_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StoredScan = Omit<Scan, "symptoms"> & {
  symptoms: string | null;
  ownerId?: string;
  imageContentType?: string | null;
  analysis?: unknown | null;
  hiddenAt?: Date | null;
};

export const usesSupabaseScanStore = () =>
  usesSupabase() && !isSharedAuthProject();

export function persistentOwnerId(account: Account): string {
  if (usesSupabaseScanStore()) {
    if (!account.supabase_id) throw new Error("The signed-in account is not linked to Supabase.");
    return account.supabase_id;
  }
  return account.id;
}

function fromRow(row: ScanRow): StoredScan {
  return {
    id: row.id,
    ownerId: row.owner_id,
    crop: row.crop,
    symptoms: row.symptoms ? JSON.stringify(row.symptoms) : null,
    affectedPart: row.affected_part,
    growthStage: row.growth_stage,
    affectedAreaPercentage: row.affected_area_percentage,
    nearbyPlantsAffected: row.nearby_plants_affected,
    notes: row.notes,
    latitude: row.latitude,
    longitude: row.longitude,
    locationState: row.location_state,
    locationDistrict: row.location_district,
    imagePath: row.image_object_path,
    imageContentType: row.image_content_type,
    status: row.status,
    analysis: row.analysis,
    hiddenAt: row.hidden_at ? new Date(row.hidden_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function check<T>(result: { data: T; error: { message: string } | null }, action: string): T {
  if (result.error) throw new Error(`${action}: ${result.error.message}`);
  return result.data;
}

export async function createStoredScan(
  account: Account,
  input: {
    crop: string;
    symptoms?: string[];
    affectedPart?: string;
    growthStage?: string;
    affectedAreaPercentage?: number;
    nearbyPlantsAffected?: boolean;
    notes?: string;
    latitude: number;
    longitude: number;
    locationState: string;
    locationDistrict: string;
  },
): Promise<StoredScan> {
  const now = new Date();
  if (!usesSupabaseScanStore()) {
    const scan = db.insert(scans).values({
      id: randomUUID(), crop: input.crop, symptoms: input.symptoms ? JSON.stringify(input.symptoms) : null,
      affectedPart: input.affectedPart ?? null, growthStage: input.growthStage ?? null,
      affectedAreaPercentage: input.affectedAreaPercentage ?? null,
      nearbyPlantsAffected: input.nearbyPlantsAffected ?? null, notes: input.notes ?? null,
      latitude: input.latitude, longitude: input.longitude, locationState: input.locationState,
      locationDistrict: input.locationDistrict, imagePath: null, status: "pending", createdAt: now, updatedAt: now,
    }).returning().get();
    sqlite.prepare("INSERT INTO scan_owners (scan_id, account_id) VALUES (?, ?)").run(scan.id, account.id);
    return scan;
  }

  const row = check(await supabaseAdmin().from(table).insert({
    id: randomUUID(), owner_id: persistentOwnerId(account), crop: input.crop,
    symptoms: input.symptoms ?? null, affected_part: input.affectedPart ?? null,
    growth_stage: input.growthStage ?? null, affected_area_percentage: input.affectedAreaPercentage ?? null,
    nearby_plants_affected: input.nearbyPlantsAffected ?? null, notes: input.notes ?? null,
    latitude: input.latitude, longitude: input.longitude, location_state: input.locationState,
    location_district: input.locationDistrict,
  }).select().single(), "Could not save the scan") as ScanRow;
  return fromRow(row);
}

export async function findStoredScan(scanId: string, account: Account): Promise<StoredScan | undefined> {
  if (!usesSupabaseScanStore()) {
    if (!sqlite.prepare("SELECT 1 FROM scan_owners WHERE scan_id = ? AND account_id = ? AND hidden_at IS NULL").get(scanId, account.id)) return undefined;
    return db.select().from(scans).where(eq(scans.id, scanId)).get();
  }
  const result = await supabaseAdmin().from(table).select("*").eq("id", scanId)
    .eq("owner_id", persistentOwnerId(account)).is("hidden_at", null).maybeSingle();
  const row = check(result, "Could not load the scan") as ScanRow | null;
  return row ? fromRow(row) : undefined;
}

export async function listStoredScans(account: Account): Promise<StoredScan[]> {
  if (!usesSupabaseScanStore()) {
    return db.select().from(scans).where(sql`${scans.id} IN (SELECT scan_id FROM scan_owners WHERE account_id = ${account.id} AND hidden_at IS NULL)`).orderBy(desc(scans.createdAt)).limit(100).all();
  }
  const rows = check(await supabaseAdmin().from(table).select("*").eq("owner_id", persistentOwnerId(account))
    .is("hidden_at", null).order("created_at", { ascending: false }).limit(100), "Could not load scan history") as ScanRow[];
  return rows.map(fromRow);
}

export async function listRegionalScans(): Promise<StoredScan[]> {
  if (!usesSupabaseScanStore()) {
    return db.select().from(scans).where(sql`${scans.id} IN (SELECT scan_id FROM scan_owners WHERE hidden_at IS NULL)`).orderBy(desc(scans.createdAt)).limit(500).all();
  }
  const rows = check(await supabaseAdmin().from(table).select("*").is("hidden_at", null)
    .order("created_at", { ascending: false }).limit(500), "Could not load regional scans") as ScanRow[];
  return rows.map(fromRow);
}

export async function listOwnerScans(accountId: string, ownerId?: string | null): Promise<StoredScan[]> {
  if (!usesSupabaseScanStore()) {
    const rows = sqlite.prepare("SELECT scans.*, scan_owners.hidden_at FROM scans JOIN scan_owners ON scans.id = scan_owners.scan_id WHERE account_id = ? ORDER BY created_at DESC").all(accountId) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id), crop: String(row.crop), symptoms: row.symptoms as string | null,
      affectedPart: row.affected_part as string | null, growthStage: row.growth_stage as string | null,
      affectedAreaPercentage: row.affected_area_percentage as number | null,
      nearbyPlantsAffected: row.nearby_plants_affected === null ? null : Boolean(row.nearby_plants_affected),
      notes: row.notes as string | null, latitude: Number(row.latitude), longitude: Number(row.longitude),
      locationState: String(row.location_state ?? ""), locationDistrict: String(row.location_district ?? ""),
      imagePath: row.image_path as string | null, status: String(row.status),
      hiddenAt: row.hidden_at ? new Date(Number(row.hidden_at)) : null,
      createdAt: new Date(Number(row.created_at)), updatedAt: new Date(Number(row.updated_at)),
    }));
  }
  if (!ownerId) return [];
  const rows = check(await supabaseAdmin().from(table).select("*").eq("owner_id", ownerId)
    .order("created_at", { ascending: false }), "Could not load the farmer's scans") as ScanRow[];
  return rows.map(fromRow);
}

export async function findStoredScanForAdmin(scanId: string): Promise<StoredScan | undefined> {
  if (!usesSupabaseScanStore()) return db.select().from(scans).where(eq(scans.id, scanId)).get();
  const row = check(await supabaseAdmin().from(table).select("*").eq("id", scanId).maybeSingle(), "Could not load the scan") as ScanRow | null;
  return row ? fromRow(row) : undefined;
}

export async function updateStoredScan(scanId: string, values: Partial<{
  imagePath: string | null; imageContentType: string | null; status: string; analysis: unknown | null;
  locationState: string; locationDistrict: string;
}>): Promise<StoredScan> {
  if (!usesSupabaseScanStore()) {
    const update: Partial<Scan> = { updatedAt: new Date() };
    if ("imagePath" in values) update.imagePath = values.imagePath ?? null;
    if (values.status) update.status = values.status;
    if (values.locationState !== undefined) update.locationState = values.locationState;
    if (values.locationDistrict !== undefined) update.locationDistrict = values.locationDistrict;
    return db.update(scans).set(update).where(eq(scans.id, scanId)).returning().get();
  }
  const remote: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("imagePath" in values) remote.image_object_path = values.imagePath;
  if ("imageContentType" in values) remote.image_content_type = values.imageContentType;
  if (values.status) remote.status = values.status;
  if ("analysis" in values) remote.analysis = values.analysis;
  if (values.locationState !== undefined) remote.location_state = values.locationState;
  if (values.locationDistrict !== undefined) remote.location_district = values.locationDistrict;
  const row = check(await supabaseAdmin().from(table).update(remote).eq("id", scanId).select().single(), "Could not update the scan") as ScanRow;
  return fromRow(row);
}

export async function hideStoredScan(scanId: string, account: Account): Promise<void> {
  if (!usesSupabaseScanStore()) {
    sqlite.prepare("UPDATE scan_owners SET hidden_at = ? WHERE scan_id = ? AND account_id = ?").run(Date.now(), scanId, account.id);
    return;
  }
  check(await supabaseAdmin().from(table).update({ hidden_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", scanId).eq("owner_id", persistentOwnerId(account)), "Could not remove the scan from history");
}

export async function deleteOwnerScans(accountId: string, ownerId?: string | null): Promise<string[]> {
  const stored = await listOwnerScans(accountId, ownerId);
  if (!usesSupabaseScanStore()) {
    sqlite.transaction(() => { for (const scan of stored) sqlite.prepare("DELETE FROM scans WHERE id = ?").run(scan.id); })();
    return stored.flatMap((scan) => scan.imagePath ? [scan.imagePath] : []);
  }
  if (ownerId) check(await supabaseAdmin().from(table).delete().eq("owner_id", ownerId), "Could not delete the farmer's scans");
  return stored.flatMap((scan) => scan.imagePath ? [scan.imagePath] : []);
}
