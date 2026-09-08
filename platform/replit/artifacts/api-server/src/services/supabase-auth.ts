import { createClient, type User } from "@supabase/supabase-js";
import type { Request, Response } from "express";
import { sqlite } from "@workspace/db";

export const usesSupabase = () => process.env.AUTH_PROVIDER === "supabase";
export function supabase(req?: Request, res?: Response) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase authentication is not configured.");
  return createClient(url,key,{auth:{autoRefreshToken:false, detectSessionInUrl:false, flowType:"pkce", persistSession:true, storage:{
    getItem: key => { if (!key.endsWith("code-verifier")) return null; const raw = req?.headers.cookie?.split(";").map(v=>v.trim()).find(v=>v.startsWith("wf_pkce="))?.slice(8); return raw ? decodeURIComponent(raw) : null; },
    setItem: (key,value) => {if(key.endsWith("code-verifier")) res?.cookie("wf_pkce",value,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV === "production",maxAge:600000,path:"/"});},
    removeItem: key => {if(key.endsWith("code-verifier")) res?.clearCookie("wf_pkce",{path:"/"});},
  }}});
}
export function syncSupabaseUser(user: User) {
  if (!user.email || !user.email_confirmed_at) throw new Error("Verify your email before signing in.");
  const email = user.email.toLowerCase();
  const existing = sqlite.prepare("SELECT id,supabase_id FROM accounts WHERE email = ?").get(email) as {id:string;supabase_id:string|null}|undefined;
  if (existing && existing.supabase_id !== user.id) throw new Error("This email has a legacy local account. Account migration is required before Supabase sign-in.");
  const role = email === process.env.WELLFARM_ADMIN_EMAIL?.trim().toLowerCase() ? "admin" : "farmer";
  sqlite.prepare("INSERT INTO accounts (id,email,password_hash,profile,supabase_id,role) VALUES (?,?,'supabase','{}',?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email").run(user.id,email,user.id,role);
  return sqlite.prepare("SELECT * FROM accounts WHERE id = ?").get(user.id);
}
export function supabaseAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Account deletion requires the server's Supabase service key.");
  return createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
}
