// A dedicated project lets Wellfarm revoke sessions and delete Auth users.
// Shared mode remains the conservative fallback for an unspecified deployment.
export function isSharedAuthProject(env: Record<string, string | undefined> = process.env): boolean {
  return env.SUPABASE_PROJECT_MODE !== "dedicated";
}
