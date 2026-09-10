import { Router, type RequestHandler } from "express";
import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { sqlite } from "@workspace/db";
import { removeRemoteImages, removeStoredImage } from "../lib/uploads";
import { isVisionBusy } from "../services/vision";
import { supabase, supabaseAdmin, syncSupabaseUser, usesSupabase } from "../services/supabase-auth";
import type { Session } from "@supabase/supabase-js";
import { isSharedAuthProject } from "../services/auth-project-policy";
import { TurnstileConfigurationError, verifyTurnstileToken } from "../services/turnstile";
import { listOwnerScans, usesSupabaseScanStore } from "../services/scan-store";

const derive = promisify(scrypt);
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const cookieOptions = { httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/" };
export type Account = {id: string; email: string; password_hash: string; profile: string; role?: string; state?: string; district?: string; supabase_id?: string};
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
export const requireAccount: RequestHandler = async (req, res, next) => {
  const account = sqlite.prepare("SELECT accounts.* FROM accounts JOIN sessions ON accounts.id = sessions.account_id WHERE token_hash = ? AND expires_at > ?").get(hash(token(req)), Date.now()) as Account | undefined;
  if (!account) { res.status(401).json({error: {message: "Please log in."}}); return; }
  if (usesSupabase()) {
    try {
      const session = sqlite.prepare("SELECT access_token FROM sessions WHERE token_hash = ?").get(hash(token(req))) as {access_token:string|null};
      if (!account.supabase_id || !session.access_token) {res.status(401).json({error:{message:"Please sign in with Supabase."}});return;}
      const {data,error} = await supabase().auth.getUser(session.access_token);
      if(error || data.user?.id !== account.supabase_id) {res.status(401).json({error:{message:"Your session expired. Please log in again."}});return;}
    } catch {res.status(503).json({error:{message:"Authentication is temporarily unavailable."}});return;}
  }
  res.locals.account = account; next();
};
function startSession(res: Parameters<RequestHandler>[1], account: Account, session?: Session, extra: Record<string, unknown> = {}) {
  const value = randomBytes(32).toString("hex");
  sqlite.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
  const lifetime = session ? Math.min(session.expires_in * 1000,3600000) : 7 * 86400000;
  sqlite.prepare("INSERT INTO sessions (token_hash,account_id,expires_at,access_token,refresh_token) VALUES (?, ?, ?, ?, ?)").run(hash(value), account.id, Date.now() + lifetime,session?.access_token ?? null,session?.refresh_token ?? null);
  res.cookie("wellfarm_session", value, {...cookieOptions, maxAge: lifetime});
  res.json({id: account.id, email: account.email, role: account.role ?? "farmer", profile: {...JSON.parse(account.profile), state: account.state ?? "", district: account.district ?? ""}, ...extra});
}
async function verify(password: string, stored: string) {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected || !/^[a-f0-9]{128}$/.test(expected)) return false;
  const actual = await derive(password, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}
router.post("/auth/register", limit, async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = req.body.password;
  if (req.body.confirmPassword !== undefined && req.body.confirmPassword !== password) {res.status(400).json({error:{message:"Passwords must match."}});return;}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof password !== "string" || password.length < 12 || password.length > 128) { res.status(400).json({error: {message: "Enter a valid email and a password of 12–128 characters."}}); return; }
  if (usesSupabase()) {
    try {
      if (req.body.confirmPassword !== password) {res.status(400).json({error:{message:"Passwords must match."}});return;}
      if (!await verifyTurnstileToken(req.body.captchaToken, req.ip)) {res.status(400).json({error:{message:"CAPTCHA verification failed. Please try again."}});return;}
      const {data,error} = await supabase(req,res).auth.signUp({email,password});
      if(error) {res.status(400).json({error:{message:error.message}});return;}
      if(data.session) {res.status(503).json({error:{message:"Email confirmation must be enabled in Supabase before registration can proceed."}});return;}
      // With email confirmation enabled, Supabase deliberately returns a fake
      // user (with no identities) when the address already belongs to an
      // account. Do not send that person to the OTP screen: resend cannot send
      // a signup code for this response, and changing the email with a +alias
      // is not a valid product flow.
      if (!data.user || (Array.isArray(data.user.identities) && data.user.identities.length === 0)) {
        res.status(409).json({error:{code:"ACCOUNT_EXISTS",message:"This email already has an account. Log in with it or continue with Google—do not change your email address."}});return;
      }
      res.json({verificationRequired:true}); return;
    } catch(error) {res.status(503).json({error:{message:error instanceof TurnstileConfigurationError ? "CAPTCHA is not configured correctly." : "Supabase registration is not configured."}});return;}
  }
  const salt = randomBytes(16).toString("hex");
  const derived = await derive(password, salt, 64) as Buffer;
  const account: Account = {id: randomUUID(), email, password_hash: `${salt}:${derived.toString("hex")}`, profile: "{}"};
  try { sqlite.prepare("INSERT INTO accounts (id,email,password_hash,profile) VALUES (?, ?, ?, ?)").run(account.id, email, account.password_hash, account.profile); }
  catch { res.status(409).json({error: {message: "Could not create this account. Try logging in instead."}}); return; }
  startSession(res, account, undefined, {onboardingRequired:true});
});
router.post("/auth/login", limit, async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = req.body.password;
  if (typeof password !== "string" || password.length > 128) { res.status(400).json({error: {message: "Invalid credentials."}}); return; }
  if (usesSupabase()) {
    try {
      if (!await verifyTurnstileToken(req.body.captchaToken, req.ip)) {res.status(400).json({error:{message:"CAPTCHA verification failed. Please try again."}});return;}
      const {data,error} = await supabase(req,res).auth.signInWithPassword({email,password});
      if(error || !data.session) {res.status(401).json({error:{message:"Email or password is incorrect, or verification is incomplete."}});return;}
      startSession(res,syncSupabaseUser(data.user) as Account,data.session);return;
    } catch(error) {res.status(503).json({error:{message:error instanceof TurnstileConfigurationError ? "CAPTCHA is not configured correctly." : "Sign-in unavailable."}});return;}
  }
  const account = sqlite.prepare("SELECT * FROM accounts WHERE email = ?").get(email) as Account | undefined;
  const matches = await verify(password, account?.password_hash ?? `${"0".repeat(32)}:${"0".repeat(128)}`);
  if (!account || !matches) { res.status(401).json({error: {message: "Email or password is incorrect."}}); return; }
  startSession(res, account);
});
router.post("/auth/logout", async (req, res) => {
  if (usesSupabase() && !isSharedAuthProject()) {
    const session = sqlite.prepare("SELECT access_token FROM sessions WHERE token_hash = ?").get(hash(token(req))) as {access_token:string}|undefined;
    // Always clear the application's session, even if remote revocation is unavailable.
    if(session?.access_token && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try { await supabaseAdmin().auth.admin.signOut(session.access_token,"local"); } catch { /* Local invalidation below still succeeds. */ }
    }
  }
  sqlite.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hash(token(req)));
  res.clearCookie("wellfarm_session", cookieOptions).sendStatus(204);
});
router.get("/auth/me", requireAccount, (_req, res) => {
  const account = res.locals.account as Account;
  res.json({id: account.id, email: account.email, role: account.role ?? "farmer", profile: {...JSON.parse(account.profile), state: account.state ?? "", district: account.district ?? ""}});
});
router.put("/account/profile", requireAccount, (req, res) => {
  const input = req.body;
  const profile = {
    firstName: typeof input.firstName === "string" ? input.firstName.trim().slice(0,50) : "",
    lastName: typeof input.lastName === "string" ? input.lastName.trim().slice(0,50) : "",
    name: typeof input.name === "string" ? input.name.trim().slice(0,80) : "",
    city: typeof input.city === "string" ? input.city.trim().slice(0,100) : "",
    farm: typeof input.farm === "string" ? input.farm.trim().slice(0,100) : "",
    crops: Array.isArray(input.crops) ? input.crops.filter((crop: unknown) => typeof crop === "string" && ["Rice","Wheat","Maize","Cotton","Sugarcane","Soybean","Tomato","Potato"].includes(crop)) : [],
    workspace: input.workspace === "insights" ? "insights" : "farmer",
    notifications: input.notifications !== false,
    avatar: typeof input.avatar === "string" && input.avatar.length < 400000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(input.avatar) ? input.avatar : undefined,
  };
  const state = typeof input.state === "string" ? input.state.trim().slice(0,100) : "";
  const district = typeof input.district === "string" ? input.district.trim().slice(0,100) : "";
  sqlite.prepare("UPDATE accounts SET profile = ?, state = ?, district = ? WHERE id = ?").run(JSON.stringify(profile), state, district, res.locals.account.id);
  res.json({...profile, state, district});
});
router.post("/account/feedback", requireAccount, (req, res) => {
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 2000) { res.status(400).json({error: {message: "Write 1–2000 characters of feedback."}}); return; }
  sqlite.prepare("INSERT INTO feedback VALUES (?, ?, ?, ?)").run(randomUUID(), res.locals.account.id, message, Date.now());
  res.sendStatus(201);
});
router.delete("/account", requireAccount, limit, async (req, res) => {
  const account = res.locals.account as Account;
  if (usesSupabase()) {
    if(req.body.confirmEmail !== account.email) {res.status(403).json({error:{message:"Enter your account email to confirm deletion."}});return;}
    if (!isSharedAuthProject() && !process.env.SUPABASE_SERVICE_ROLE_KEY) {res.status(503).json({error:{message:"Supabase account deletion has not been configured."}});return;}
  } else if (typeof req.body.password !== "string" || req.body.password.length > 128 || !await verify(req.body.password, account.password_hash)) { res.status(403).json({error: {message: "Enter your current password to delete your account."}}); return; }
  if (isVisionBusy()) { res.status(409).json({error: {message: "Wait for analysis to finish before deleting your account."}}); return; }
  const ownedScans = await listOwnerScans(account.id, account.supabase_id);
  if (usesSupabase() && account.supabase_id && !isSharedAuthProject()) {
    const session = sqlite.prepare("SELECT access_token FROM sessions WHERE token_hash = ?").get(hash(token(req))) as {access_token:string};
    const revoked = await supabaseAdmin().auth.admin.signOut(session.access_token,"global");
    if (revoked.error) {res.status(503).json({error:{message:"Session revocation failed. Please retry account deletion."}});return;}
    const {error} = await supabaseAdmin().auth.admin.deleteUser(account.supabase_id);
    if(error) {res.status(503).json({error:{message:"Supabase account deletion failed. Please retry."}});return;}
  }
  const imagePaths = ownedScans.flatMap(scan => scan.imagePath ? [scan.imagePath] : []);
  if (usesSupabaseScanStore()) await removeRemoteImages(imagePaths);
  else for (const imagePath of imagePaths) removeStoredImage(imagePath);
  sqlite.transaction(() => {
    if (!usesSupabaseScanStore()) for (const scan of ownedScans) sqlite.prepare("DELETE FROM scans WHERE id = ?").run(scan.id);
    sqlite.prepare("DELETE FROM accounts WHERE id = ?").run(account.id);
  })();
  res.clearCookie("wellfarm_session", cookieOptions).sendStatus(204);
});
router.get("/auth/config", (_req,res) => res.json({provider:usesSupabase()?"supabase":"local",sharedAuthProject:usesSupabase() && isSharedAuthProject(),captchaSiteKey:process.env.TURNSTILE_SITE_KEY ?? null,googleEnabled:usesSupabase() && process.env.GOOGLE_AUTH_ENABLED === "true"}));
router.post("/auth/verify",limit,async(req,res) => {
  if(!usesSupabase()) {res.sendStatus(503);return;}
  if(typeof req.body.email !== "string" || typeof req.body.token !== "string" || !/^\d{6,10}$/.test(req.body.token)) {res.status(400).json({error:{message:"Enter the verification code from your email."}});return;}
  try {const {data,error}=await supabase(req,res).auth.verifyOtp({email:req.body.email,token:req.body.token,type:"signup"}); if(error || !data.session || !data.user) {res.status(400).json({error:{message:"The code is invalid or expired."}});return;} startSession(res,syncSupabaseUser(data.user) as Account,data.session,{onboardingRequired:true});}
  catch {res.status(503).json({error:{message:"Email verification is unavailable."}});}
});
router.post("/auth/resend-verification",limit,async(req,res) => {
  if(!usesSupabase()) {res.sendStatus(503);return;}
  const email=typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {res.status(400).json({error:{message:"Enter the email address used to create your account."}});return;}
  try {const {error}=await supabase(req,res).auth.resend({type:"signup",email});if(error) {res.status(400).json({error:{message:error.message}});return;}res.sendStatus(204);}
  catch {res.status(503).json({error:{message:"A new verification code could not be sent."}});}
});
router.get("/auth/google",limit,async(req,res) => {
  if(!usesSupabase() || process.env.GOOGLE_AUTH_ENABLED !== "true") {res.status(503).json({error:{message:"Google sign-in has not been configured."}});return;}
  try {const {data,error}=await supabase(req,res).auth.signInWithOAuth({provider:"google",options:{redirectTo:`${process.env.APP_ORIGIN ?? "http://localhost:5173"}/api/auth/callback`,skipBrowserRedirect:true}});if(error || !data.url) throw error;res.redirect(data.url);}catch {res.redirect("/login?error=google");}
});
router.get("/auth/callback",limit,async(req,res) => {
  if(!usesSupabase() || typeof req.query.code !== "string") {res.redirect("/login?error=google");return;}
  try {const {data,error}=await supabase(req,res).auth.exchangeCodeForSession(req.query.code);if(error || !data.session || !data.user) throw error;const account=syncSupabaseUser(data.user) as Account;
    // Reuse session creation, but send a redirect instead of JSON for the callback.
    const value=randomBytes(32).toString("hex"); const lifetime=Math.min(data.session.expires_in*1000,3600000);
    sqlite.prepare("INSERT INTO sessions (token_hash,account_id,expires_at,access_token,refresh_token) VALUES (?,?,?,?,?)").run(hash(value),account.id,Date.now()+lifetime,data.session.access_token,data.session.refresh_token);
    const savedProfile=JSON.parse(account.profile) as {name?:string};
    res.cookie("wellfarm_session",value,{...cookieOptions,maxAge:lifetime});res.redirect(savedProfile.name ? "/farmer" : "/onboarding");
  }catch {res.redirect("/login?error=google");}
});
export default router;
