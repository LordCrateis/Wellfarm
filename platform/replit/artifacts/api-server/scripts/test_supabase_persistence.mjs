import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

const client = createClient(url, key, { auth: { persistSession: false } });
const users = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
if (users.error) throw users.error;
const owner = users.data.users[0];
if (!owner) throw new Error("Create one verified Wellfarm account before running this check.");

const scanId = randomUUID();
const objectPath = `${owner.id}/${scanId}/persistence-check.png`;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

try {
  const inserted = await client.from("wellfarm_scans").insert({
    id: scanId, owner_id: owner.id, crop: "Rice", symptoms: ["Persistence check"],
    latitude: 20.5937, longitude: 78.9629, location_state: "Test", location_district: "Test",
  }).select("id,owner_id,status").single();
  if (inserted.error) throw inserted.error;

  const uploaded = await client.storage.from("wellfarm-scan-images").upload(objectPath, png, {
    contentType: "image/png", upsert: false,
  });
  if (uploaded.error) throw uploaded.error;

  const updated = await client.from("wellfarm_scans").update({
    image_object_path: objectPath, image_content_type: "image/png", status: "completed",
    analysis: { mode: "model", test: true }, updated_at: new Date().toISOString(),
  }).eq("id", scanId).select("id,image_object_path,analysis").single();
  if (updated.error) throw updated.error;

  const downloaded = await client.storage.from("wellfarm-scan-images").download(objectPath);
  if (downloaded.error || !downloaded.data || downloaded.data.size !== png.length) {
    throw downloaded.error ?? new Error("The downloaded image did not match the upload.");
  }

  console.log(JSON.stringify({ passed: true, table: "wellfarm_scans", bucket: "wellfarm-scan-images" }));
} finally {
  await client.storage.from("wellfarm-scan-images").remove([objectPath]);
  await client.from("wellfarm_scans").delete().eq("id", scanId);
}
