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
router.get("/admin/users", (req,res) => {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const district = typeof req.query.district === "string" ? req.query.district : "";
  const rows = sqlite.prepare("SELECT id,email,profile,state,district,role FROM accounts WHERE (? = '' OR state = ?) AND (? = '' OR district = ?) ORDER BY state,district,email").all(state,state,district,district) as {profile:string}[];
  res.json(rows.map(row => ({...row,profile:JSON.parse(row.profile)})));
});
router.get("/admin/users/:id/scans", async (req,res,next) => {
  try {
    const target = sqlite.prepare("SELECT supabase_id FROM accounts WHERE id = ?").get(req.params.id) as {supabase_id:string|null}|undefined;
    if (!target) {res.sendStatus(404);return;}
    const stored = await listOwnerScans(String(req.params.id), target.supabase_id);
    res.json(stored.map(scan => ({
      id: scan.id, crop: scan.crop, created_at: scan.createdAt.getTime(),
      hidden_at: scan.hiddenAt?.getTime() ?? null, image_path: scan.imagePath,
    })));
  } catch(error) {next(error);}
});
router.delete("/admin/users/:id", async (req,res) => {
  const target = sqlite.prepare("SELECT id,email,role,supabase_id FROM accounts WHERE id = ?").get(req.params.id) as {id:string;email:string;role:string;supabase_id:string|null}|undefined;
  if (!target) {res.sendStatus(404);return;}
  if (target.role !== "farmer") {res.status(403).json({error:{message:"Administrator accounts cannot be deleted here."}});return;}
  const confirmation = typeof req.body.confirmEmail === "string" ? req.body.confirmEmail.trim().toLowerCase() : "";
  if (confirmation !== target.email.toLowerCase()) {res.status(400).json({error:{message:"Enter the farmer’s email address to confirm deletion."}});return;}
  if (isVisionBusy()) {res.status(409).json({error:{message:"Wait for crop analysis to finish before deleting this account."}});return;}

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
    sqlite.prepare("DELETE FROM accounts WHERE id = ?").run(target.id);
  })();
  res.sendStatus(204);
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
    : res.locals.account.id;
  if (!id || !sqlite.prepare("SELECT 1 FROM accounts WHERE id = ?").get(id)) {res.sendStatus(404);return;}
  res.locals.thread = id; next();
};
router.get("/messages",thread,(_req,res) => {
  res.json(sqlite.prepare("SELECT messages.id, body, created_at, sender_id, accounts.role AS sender_role FROM messages JOIN accounts ON sender_id = accounts.id WHERE account_id = ? ORDER BY messages.created_at,messages.id LIMIT 1000").all(res.locals.thread));
});
router.post("/messages",thread,(req,res) => {
  const body = typeof req.body.body === "string" ? req.body.body.trim() : "";
  if (!body || body.length > 2000) {res.status(400).json({error:{message:"Write 1–2000 characters."}});return;}
  sqlite.prepare("INSERT INTO messages VALUES (?,?,?,?,?)").run(randomUUID(),res.locals.thread,res.locals.account.id,body,Date.now()); res.sendStatus(201);
});
export default router;
