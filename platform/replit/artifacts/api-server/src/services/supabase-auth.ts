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
type ProfileRecord = {
  first_name: string; last_name: string; display_name: string; city: string;
  farm: string; crops: string[]; workspace: "farmer" | "insights";
  notifications: boolean; avatar: string | null; state: string; district: string;
};

function metadataText(user: User, ...keys: string[]) {
  for (const key of keys) {
    const value = user.user_metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function googleProfile(user: User): ProfileRecord {
  const firstName = metadataText(user, "given_name", "first_name").slice(0, 50);
  const lastName = metadataText(user, "family_name", "last_name").slice(0, 50);
  const displayName = metadataText(user, "full_name", "name")
    || [firstName, lastName].filter(Boolean).join(" ");
  const avatar = metadataText(user, "avatar_url", "picture");
  return {
    first_name: firstName, last_name: lastName, display_name: displayName.slice(0, 80),
    city: "", farm: "", crops: [], workspace: "farmer", notifications: true,
    avatar: /^https:\/\//i.test(avatar) ? avatar.slice(0, 2048) : null,
    state: "", district: "",
  };
}

function localProfile(row: ProfileRecord) {
  return {
    firstName: row.first_name, lastName: row.last_name, name: row.display_name,
    city: row.city, farm: row.farm, crops: row.crops, workspace: row.workspace,
    notifications: row.notifications, ...(row.avatar ? {avatar: row.avatar} : {}),
  };
}

export async function saveSupabaseProfile(userId: string, profile: Record<string, unknown>, state: string, district: string) {
  const row = {
    user_id: userId,
    first_name: String(profile.firstName ?? "").slice(0, 50),
    last_name: String(profile.lastName ?? "").slice(0, 50),
    display_name: String(profile.name ?? "").slice(0, 80),
    city: String(profile.city ?? "").slice(0, 100),
    farm: String(profile.farm ?? "").slice(0, 100),
    crops: Array.isArray(profile.crops) ? profile.crops : [],
    workspace: profile.workspace === "insights" ? "insights" : "farmer",
    notifications: profile.notifications !== false,
    avatar: typeof profile.avatar === "string" ? profile.avatar : null,
    state, district, updated_at: new Date().toISOString(),
  };
  const {error} = await supabaseAdmin().from("wellfarm_profiles").upsert(row, {onConflict: "user_id"});
  if (error) throw new Error(`Could not save the Supabase profile: ${error.message}`);
}

export async function syncSupabaseUser(user: User) {
  if (!user.email || !user.email_confirmed_at) throw new Error("Verify your email before signing in.");
  const email = user.email.toLowerCase();
  const client = supabaseAdmin();
  const profileResult = await client.from("wellfarm_profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (profileResult.error) throw new Error(`Could not load the Supabase profile: ${profileResult.error.message}`);
  let remoteProfile = profileResult.data as ProfileRecord | null;
  if (!remoteProfile) {
    const seed = googleProfile(user);
    const created = await client.from("wellfarm_profiles").insert({user_id: user.id, ...seed}).select().single();
    if (created.error) throw new Error(`Could not create the Supabase profile: ${created.error.message}`);
    remoteProfile = created.data as ProfileRecord;
  }
  const profile = JSON.stringify(localProfile(remoteProfile));
  const existing = sqlite.prepare("SELECT id,supabase_id FROM accounts WHERE email = ?").get(email) as {id:string;supabase_id:string|null}|undefined;
  const role = email === process.env.WELLFARM_ADMIN_EMAIL?.trim().toLowerCase() ? "admin" : "farmer";
  if (existing) {
    if (existing.supabase_id && existing.supabase_id !== user.id) throw new Error("This email is linked to a different identity.");
    sqlite.prepare("UPDATE accounts SET supabase_id = ?, role = ?, profile = ?, state = ?, district = ? WHERE id = ?")
      .run(user.id, role, profile, remoteProfile.state, remoteProfile.district, existing.id);
    return sqlite.prepare("SELECT * FROM accounts WHERE id = ?").get(existing.id);
  }
  sqlite.prepare("INSERT INTO accounts (id,email,password_hash,profile,supabase_id,role,state,district) VALUES (?,?,'supabase',?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,profile=excluded.profile,state=excluded.state,district=excluded.district,role=excluded.role")
    .run(user.id, email, profile, user.id, role, remoteProfile.state, remoteProfile.district);
  return sqlite.prepare("SELECT * FROM accounts WHERE id = ?").get(user.id);
}
export function supabaseAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Account deletion requires the server's Supabase service key.");
  return createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
}
