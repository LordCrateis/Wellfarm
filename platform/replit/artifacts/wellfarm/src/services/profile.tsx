import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { crops } from "@/data/mock";

export interface Profile {
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
function readProfile() {
  try { return normalizeProfile(JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null")); } catch { return { ...emptyProfile }; }
}
function readActivity(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(READ_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter(id => typeof id === "string").slice(-1000) : [];
  } catch { return []; }
}
interface AccountState {
  profile: Profile;
  readIds: string[];
  saveProfile: (value: Profile) => boolean;
  markRead: (ids: string[]) => boolean;
}
const AccountContext = createContext<AccountState | null>(null);
export function AccountProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState(readProfile);
  const [readIds, setReadIds] = useState(readActivity);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === PROFILE_KEY || event.key === null) setProfile(readProfile());
      if (event.key === READ_KEY || event.key === null) setReadIds(readActivity());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const saveProfile = useCallback((value: Profile) => {
    const next = normalizeProfile(value);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); setProfile(next); return true; } catch { return false; }
  }, []);
  const markRead = useCallback((ids: string[]) => {
    // Re-read storage to merge changes made in another tab.
    const next = [...new Set([...readActivity(), ...ids])].slice(-1000);
    try { localStorage.setItem(READ_KEY, JSON.stringify(next)); setReadIds(next); return true; } catch { return false; }
  }, []);
  return <AccountContext.Provider value={{ profile, readIds, saveProfile, markRead }}>{children}</AccountContext.Provider>;
}
export function useAccount() {
  const account = useContext(AccountContext);
  if (!account) throw new Error("AccountProvider is required");
  return account;
}
