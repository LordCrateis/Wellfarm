import { Router, type RequestHandler } from "express";
import { sqlite } from "@workspace/db";
import { randomUUID } from "node:crypto";
import { requireAccount } from "./account";
import { downloadStoredImage, openStoredImage, removeRemoteImages, removeStoredImage } from "../lib/uploads";
import { analyzeScan, isVisionBusy } from "../services/vision";
import { extname } from "node:path";
import { isSharedAuthProject } from "../services/auth-project-policy";
import { supabaseAdmin, usesSupabase } from "../services/supabase-auth";
import { findStoredScanForAdmin, listOwnerScans, type StoredScan, usesSupabaseScanStore } from "../services/scan-store";

const router = Router();
const admin: RequestHandler = (_req,res,next) => {
  if (res.locals.account.role !== "admin") {res.status(403).json({error:{message:"Admin access required."}}); return;} next();
};
router.use("/admin", requireAccount, admin);
router.get("/admin/users", async (req,res,next) => {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const district = typeof req.query.district === "string" ? req.query.district : "";
  try {
    if (usesSupabaseScanStore()) {
      const client = supabaseAdmin();
      const users = [];
      for (let page = 1; ; page += 1) {
        const result = await client.auth.admin.listUsers({page, perPage: 1000});
        if (result.error) throw result.error;
        users.push(...result.data.users);
        if (result.data.users.length < 1000) break;
      }
      const profilesResult = await client.from("wellfarm_profiles").select("*");
      if (profilesResult.error) throw profilesResult.error;
      const profiles = new Map((profilesResult.data ?? []).map(row => [row.user_id, row]));
      const summariesResult = await client.from("wellfarm_conversation_summaries").select("account_id,message_count,latest_message_at,farmer_message_count,latest_farmer_message_at");
      if (summariesResult.error) throw summariesResult.error;
      const summaries = new Map((summariesResult.data ?? []).map(row => [row.account_id, row]));
      const adminEmail = process.env.WELLFARM_ADMIN_EMAIL?.trim().toLowerCase();
      const rows = users.map(user => {
        const stored = profiles.get(user.id);
        const summary = summaries.get(user.id);
        const metadata = user.user_metadata ?? {};
        const fallbackName = typeof metadata.full_name === "string" ? metadata.full_name : typeof metadata.name === "string" ? metadata.name : "";
        return {
          id: user.id, email: user.email ?? "", role: user.email?.toLowerCase() === adminEmail ? "admin" : "farmer",
          state: stored?.state ?? "", district: stored?.district ?? "",
          messageCount: Number(summary?.message_count ?? 0), latestMessageAt: summary?.latest_message_at ?? null,
          farmerMessageCount: Number(summary?.farmer_message_count ?? 0), latestFarmerMessageAt: summary?.latest_farmer_message_at ?? null,
          profile: stored ? {
            firstName: stored.first_name, lastName: stored.last_name, name: stored.display_name,
            city: stored.city, farm: stored.farm, crops: stored.crops ?? [], workspace: stored.workspace,
            notifications: stored.notifications, ...(stored.avatar ? {avatar: stored.avatar} : {}),
          } : {name: fallbackName, farm: "", crops: [], workspace: "farmer", notifications: true},
        };
      }).filter(row => (!state || row.state === state) && (!district || row.district === district))
        .sort((a,b) => (Date.parse(b.latestFarmerMessageAt ?? "") || 0) - (Date.parse(a.latestFarmerMessageAt ?? "") || 0)
          || (Date.parse(b.latestMessageAt ?? "") || 0) - (Date.parse(a.latestMessageAt ?? "") || 0)
          || a.state.localeCompare(b.state) || a.district.localeCompare(b.district) || a.email.localeCompare(b.email));
      res.setHeader("Cache-Control", "private, no-store").json(rows); return;
    }
    const rows = sqlite.prepare("SELECT id,email,profile,state,district,role FROM accounts WHERE (? = '' OR state = ?) AND (? = '' OR district = ?) ORDER BY state,district,email").all(state,state,district,district) as {profile:string}[];
    res.json(rows.map(row => ({...row,profile:JSON.parse(row.profile)})));
  } catch(error) {next(error);}
});
router.get("/admin/users/:id/scans", async (req,res,next) => {
  try {
    if (usesSupabaseScanStore()) {
      const user = await supabaseAdmin().auth.admin.getUserById(String(req.params.id));
      if (user.error || !user.data.user) {res.sendStatus(404);return;}
      const stored = await listOwnerScans(String(req.params.id), String(req.params.id));
      res.json(stored.map(scan => ({
        id: scan.id, crop: scan.crop, created_at: scan.createdAt.getTime(),
        hidden_at: scan.hiddenAt?.getTime() ?? null, image_path: scan.imagePath,
      })));
      return;
    }
    const target = sqlite.prepare("SELECT supabase_id FROM accounts WHERE id = ?").get(req.params.id) as {supabase_id:string|null}|undefined;
    if (!target) {res.sendStatus(404);return;}
    const stored = await listOwnerScans(String(req.params.id), target.supabase_id);
    res.json(stored.map(scan => ({
      id: scan.id, crop: scan.crop, created_at: scan.createdAt.getTime(),
      hidden_at: scan.hiddenAt?.getTime() ?? null, image_path: scan.imagePath,
    })));
  } catch(error) {next(error);}
});
router.delete("/admin/users/:id", async (req,res,next) => {
  let target = sqlite.prepare("SELECT id,email,role,supabase_id FROM accounts WHERE id = ?").get(req.params.id) as {id:string;email:string;role:string;supabase_id:string|null}|undefined;
  if (usesSupabaseScanStore()) {
    const remote = await supabaseAdmin().auth.admin.getUserById(String(req.params.id));
    if (remote.error || !remote.data.user?.email) {res.sendStatus(404);return;}
    const email = remote.data.user.email.toLowerCase();
    target = {
      id: String(req.params.id), email,
      role: email === process.env.WELLFARM_ADMIN_EMAIL?.trim().toLowerCase() ? "admin" : "farmer",
      supabase_id: String(req.params.id),
    };
  }
  if (!target) {res.sendStatus(404);return;}
  if (target.role !== "farmer") {res.status(403).json({error:{message:"Administrator accounts cannot be deleted here."}});return;}
  const confirmation = typeof req.body.confirmEmail === "string" ? req.body.confirmEmail.trim().toLowerCase() : "";
  if (confirmation !== target.email.toLowerCase()) {res.status(400).json({error:{message:"Enter the farmer’s email address to confirm deletion."}});return;}
  if (isVisionBusy()) {res.status(409).json({error:{message:"Wait for crop analysis to finish before deleting this account."}});return;}

  try {
    const ownedScans = await listOwnerScans(target.id, target.supabase_id);
    if (usesSupabase() && !isSharedAuthProject()) {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {res.status(503).json({error:{message:"Supabase administrator deletion is not configured."}});return;}
      if (target.supabase_id) {
        const {error} = await supabaseAdmin().auth.admin.deleteUser(target.supabase_id);
        if (error) {res.status(503).json({error:{message:"Supabase account deletion failed. Please retry."}});return;}
      }
    }

    const imagePaths = ownedScans.flatMap(scan => scan.imagePath ? [scan.imagePath] : []);
    if (usesSupabaseScanStore()) await removeRemoteImages(imagePaths);
    else for (const imagePath of imagePaths) removeStoredImage(imagePath);
    sqlite.transaction(() => {
      if (!usesSupabaseScanStore()) for (const scan of ownedScans) sqlite.prepare("DELETE FROM scans WHERE id = ?").run(scan.id);
      sqlite.prepare("DELETE FROM accounts WHERE id = ? OR supabase_id = ?").run(target.id, target.supabase_id);
    })();
    res.sendStatus(204);
  } catch(error) {next(error);}
});
router.get("/admin/scans/:id/image", async (req,res,next) => {
  try {
    const scan = await findStoredScanForAdmin(String(req.params.id));
    if (!scan?.imagePath) {res.sendStatus(404); return;}
    res.setHeader("Cache-Control","private, no-store");
    if (usesSupabaseScanStore()) {
      const image = await downloadStoredImage(scan.imagePath);
      if (!image) {res.sendStatus(404);return;}
      res.type(scan.imageContentType ?? extname(scan.imagePath)).send(image); return;
    }
    const stream = openStoredImage(scan.imagePath);
    if (!stream) {res.sendStatus(404);return;}
    res.type(extname(scan.imagePath)); stream.on("error",next); stream.pipe(res);
  } catch(error) {next(error);}
});
router.get("/admin/scans/:id/analysis", async (req,res,next) => {
  try {
    const scan = await findStoredScanForAdmin(String(req.params.id));
    if (!scan?.imagePath) {res.sendStatus(404); return;}
    const report = await analyzeScan(scan as StoredScan,true);
    if (!report) {res.sendStatus(404);return;}
    res.json(report);
  } catch(error) {next(error);}
});
router.use("/messages",requireAccount);
const thread: RequestHandler = (req,res,next) => {
  const requestedUserId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
  const id = res.locals.account.role === "admin" && requestedUserId
    ? requestedUserId
    : (usesSupabaseScanStore() ? res.locals.account.supabase_id : res.locals.account.id);
  if (!id || (!usesSupabaseScanStore() && !sqlite.prepare("SELECT 1 FROM accounts WHERE id = ?").get(id))) {res.sendStatus(404);return;}
  res.locals.thread = id; next();
};
router.get("/messages",thread,async(_req,res,next) => {
  try {
    if (usesSupabaseScanStore()) {
      const result = await supabaseAdmin().from("wellfarm_messages").select("id,body,created_at,sender_id")
        .eq("account_id", res.locals.thread).order("created_at", {ascending:true}).order("id", {ascending:true}).limit(1000);
      if (result.error) throw result.error;
      res.setHeader("Cache-Control", "private, no-store").json((result.data ?? []).map(row => ({
        ...row, created_at: new Date(row.created_at).getTime(),
        sender_role: row.sender_id === res.locals.thread ? "farmer" : "admin",
      }))); return;
    }
    res.setHeader("Cache-Control", "private, no-store").json(sqlite.prepare("SELECT messages.id, body, created_at, sender_id, accounts.role AS sender_role FROM messages JOIN accounts ON sender_id = accounts.id WHERE account_id = ? ORDER BY messages.created_at,messages.id LIMIT 1000").all(res.locals.thread));
  } catch(error) {next(error);}
});
router.post("/messages",thread,async(req,res,next) => {
  const body = typeof req.body.body === "string" ? req.body.body.trim() : "";
  if (!body || body.length > 2000) {res.status(400).json({error:{message:"Write 1–2000 characters."}});return;}
  try {
    if (usesSupabaseScanStore()) {
      const senderId = res.locals.account.supabase_id;
      if (!senderId) {res.status(409).json({error:{message:"This account is not linked to Supabase."}});return;}
      const result = await supabaseAdmin().from("wellfarm_messages").insert({
        id: randomUUID(), account_id: res.locals.thread, sender_id: senderId, body,
      });
      if (result.error) throw result.error;
      res.sendStatus(201); return;
    }
    sqlite.prepare("INSERT INTO messages VALUES (?,?,?,?,?)").run(randomUUID(),res.locals.thread,res.locals.account.id,body,Date.now()); res.sendStatus(201);
  } catch(error) {next(error);}
});
export default router;
