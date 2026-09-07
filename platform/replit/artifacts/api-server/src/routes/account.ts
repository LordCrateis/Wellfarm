import { Router, type RequestHandler } from "express";
import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { sqlite } from "@workspace/db";
import { removeStoredImage } from "../lib/uploads";
import { isVisionBusy } from "../services/vision";

const derive = promisify(scrypt);
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const cookieOptions = { httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/" };
type Account = {id: string; email: string; password_hash: string; profile: string};
const router = Router();
const attempts = new Map<string, {count: number; until: number}>();
const limit: RequestHandler = (req, res, next) => {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
  const key = req.ip ?? "local";
  const value = attempts.get(key) ?? { count: 0, until: now + 15 * 60_000 };
  value.count++; attempts.set(key, value);
  if (value.count > 20) { res.status(429).json({error: {message: "Too many attempts. Try again in 15 minutes."}}); return; }
  next();
};
function token(req: Parameters<RequestHandler>[0]) {
  return req.headers.cookie?.split(";").map(item => item.trim()).find(item => item.startsWith("wellfarm_session="))?.slice(17) ?? "";
}
export const requireAccount: RequestHandler = (req, res, next) => {
  const account = sqlite.prepare("SELECT accounts.* FROM accounts JOIN sessions ON accounts.id = sessions.account_id WHERE token_hash = ? AND expires_at > ?").get(hash(token(req)), Date.now()) as Account | undefined;
  if (!account) { res.status(401).json({error: {message: "Please log in."}}); return; }
  res.locals.account = account; next();
};
function startSession(res: Parameters<RequestHandler>[1], account: Account) {
  const value = randomBytes(32).toString("hex");
  sqlite.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
  sqlite.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(hash(value), account.id, Date.now() + 7 * 86400000);
  res.cookie("wellfarm_session", value, {...cookieOptions, maxAge: 7 * 86400000});
  res.json({id: account.id, email: account.email, profile: JSON.parse(account.profile)});
}
async function verify(password: string, stored: string) {
  const [salt, expected] = stored.split(":");
  const actual = await derive(password, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}
router.post("/auth/register", limit, async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = req.body.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof password !== "string" || password.length < 12 || password.length > 128) { res.status(400).json({error: {message: "Enter a valid email and a password of 12–128 characters."}}); return; }
  const salt = randomBytes(16).toString("hex");
  const derived = await derive(password, salt, 64) as Buffer;
  const account: Account = {id: randomUUID(), email, password_hash: `${salt}:${derived.toString("hex")}`, profile: "{}"};
  try { sqlite.prepare("INSERT INTO accounts VALUES (?, ?, ?, ?)").run(account.id, email, account.password_hash, account.profile); }
  catch { res.status(409).json({error: {message: "Could not create this account. Try logging in instead."}}); return; }
  startSession(res, account);
});
router.post("/auth/login", limit, async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = req.body.password;
  if (typeof password !== "string" || password.length > 128) { res.status(400).json({error: {message: "Invalid credentials."}}); return; }
  const account = sqlite.prepare("SELECT * FROM accounts WHERE email = ?").get(email) as Account | undefined;
  const matches = await verify(password, account?.password_hash ?? `${"0".repeat(32)}:${"0".repeat(128)}`);
  if (!account || !matches) { res.status(401).json({error: {message: "Email or password is incorrect."}}); return; }
  startSession(res, account);
});
router.post("/auth/logout", (req, res) => {
  sqlite.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hash(token(req)));
  res.clearCookie("wellfarm_session", cookieOptions).sendStatus(204);
});
router.get("/auth/me", requireAccount, (_req, res) => {
  const account = res.locals.account as Account;
  res.json({id: account.id, email: account.email, profile: JSON.parse(account.profile)});
});
router.put("/account/profile", requireAccount, (req, res) => {
  const input = req.body;
  const profile = {
    name: typeof input.name === "string" ? input.name.trim().slice(0,80) : "",
    farm: typeof input.farm === "string" ? input.farm.trim().slice(0,100) : "",
    crops: Array.isArray(input.crops) ? input.crops.filter((crop: unknown) => typeof crop === "string" && ["Rice","Wheat","Maize","Cotton","Sugarcane","Soybean","Tomato","Potato"].includes(crop)) : [],
    workspace: input.workspace === "insights" ? "insights" : "farmer",
    notifications: input.notifications !== false,
    avatar: typeof input.avatar === "string" && input.avatar.length < 400000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(input.avatar) ? input.avatar : undefined,
  };
  sqlite.prepare("UPDATE accounts SET profile = ? WHERE id = ?").run(JSON.stringify(profile), res.locals.account.id);
  res.json(profile);
});
router.post("/account/feedback", requireAccount, (req, res) => {
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 2000) { res.status(400).json({error: {message: "Write 1–2000 characters of feedback."}}); return; }
  sqlite.prepare("INSERT INTO feedback VALUES (?, ?, ?, ?)").run(randomUUID(), res.locals.account.id, message, Date.now());
  res.sendStatus(201);
});
router.delete("/account", requireAccount, limit, async (req, res) => {
  const account = res.locals.account as Account;
  if (typeof req.body.password !== "string" || req.body.password.length > 128 || !await verify(req.body.password, account.password_hash)) { res.status(403).json({error: {message: "Enter your current password to delete your account."}}); return; }
  if (isVisionBusy()) { res.status(409).json({error: {message: "Wait for analysis to finish before deleting your account."}}); return; }
  const scans = sqlite.prepare("SELECT scans.id, image_path FROM scans JOIN scan_owners ON scans.id = scan_owners.scan_id WHERE account_id = ?").all(account.id) as {id: string; image_path: string | null}[];
  for (const scan of scans) if (scan.image_path) removeStoredImage(scan.image_path);
  sqlite.transaction(() => {
    for (const scan of scans) sqlite.prepare("DELETE FROM scans WHERE id = ?").run(scan.id);
    sqlite.prepare("DELETE FROM accounts WHERE id = ?").run(account.id);
  })();
  res.clearCookie("wellfarm_session", cookieOptions).sendStatus(204);
});
export default router;
