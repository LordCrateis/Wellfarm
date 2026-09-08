import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { crops } from "@/data/mock";

export interface Profile {
  state?: string;
  district?: string;
  city?: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  name: string;
  farm: string;
  crops: string[];
  workspace: "farmer" | "insights";
  notifications: boolean;
}
const PROFILE_KEY = "wellfarm-profile-v1";
const READ_KEY = "wellfarm-read-activity-v1";
export const emptyProfile: Profile = { name: "", farm: "", crops: [], workspace: "farmer", notifications: true };

export function normalizeProfile(value: unknown): Profile {
  const data = value && typeof value === "object" ? value as Partial<Profile> : {};
  return {
    ...(typeof data.state === "string" ? {state:data.state.trim().slice(0,100)} : {}),
    ...(typeof data.district === "string" ? {district:data.district.trim().slice(0,100)} : {}),
    ...(typeof data.city === "string" ? {city:data.city.trim().slice(0,100)} : {}),
    ...(typeof data.firstName === "string" ? {firstName:data.firstName.trim().slice(0,50)} : {}),
    ...(typeof data.lastName === "string" ? {lastName:data.lastName.trim().slice(0,50)} : {}),
    ...(typeof data.avatar === "string" && data.avatar.length < 400000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data.avatar) ? { avatar: data.avatar } : {}),
    name: typeof data.name === "string" ? data.name.trim().slice(0, 80) : "",
    farm: typeof data.farm === "string" ? data.farm.trim().slice(0, 100) : "",
    crops: Array.isArray(data.crops) ? [...new Set(data.crops.filter(crop => crops.includes(crop as typeof crops[number])))].slice(0, crops.length) : [],
    workspace: data.workspace === "insights" ? "insights" : "farmer",
    notifications: typeof data.notifications === "boolean" ? data.notifications : true,
  };
}
export function profileInitials(name: string) {
  return name.trim().split(/\s+/u).filter(Boolean).slice(0, 2).map(word => Array.from(word)[0]).join("").toLocaleUpperCase() || "WF";
}

interface AccountState {
  profile: Profile;
  readIds: string[];
  account: {id: string; email: string; role: string} | null;
  loading: boolean;
  saveProfile: (value: Profile) => Promise<boolean>;
  markRead: (ids: string[]) => boolean;
  logout: () => Promise<void>;
}
const AccountContext = createContext<AccountState | null>(null);
export function AccountProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [account, setAccount] = useState<AccountState["account"]>(null);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    try { localStorage.removeItem(PROFILE_KEY); localStorage.removeItem(READ_KEY); } catch {}
    fetch("/api/auth/me").then(async response => {
      if (!response.ok) return;
      const data = await response.json();
      if (active) { setAccount({id: data.id, email: data.email,role:data.role ?? "farmer"}); setProfile(normalizeProfile(data.profile)); }
    }).finally(() => { if (active) setLoading(false); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const saveProfile = useCallback(async (value: Profile) => {
    try {
      const response = await fetch("/api/account/profile", {method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify(normalizeProfile(value))});
      if (!response.ok) return false;
      setProfile(normalizeProfile(await response.json())); return true;
    } catch { return false; }
  }, []);
  const markRead = useCallback((ids: string[]) => { setReadIds(current => [...new Set([...current,...ids])]); return true; }, []);
  const logout = useCallback(async () => {
    const response = await fetch("/api/auth/logout", {method: "POST"});
    if (!response.ok) throw new Error("Logout failed. Please retry.");
    window.location.assign("/login");
  }, []);
  return <AccountContext.Provider value={{profile, readIds, account, loading, saveProfile, markRead, logout}}>{children}</AccountContext.Provider>;
}
export function useAccount() {
  const account = useContext(AccountContext);
  if (!account) throw new Error("AccountProvider is required");
  return account;
}
