// Shared projects have one Auth user pool. Never delete identities or revoke
// all sessions from an application that only owns one part of a user's data.
export function isSharedAuthProject(env: Record<string, string | undefined> = process.env): boolean {
  if (env.SUPABASE_PROJECT_MODE !== "dedicated") return true;
  try {
    return new URL(env.SUPABASE_URL ?? "").hostname === "wgnbgezilvygnmubwyny.supabase.co";
  } catch {
    return true;
  }
}
