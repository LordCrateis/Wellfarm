import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function AccountSettings() {
  const [shared, setShared] = useState(false);
  const [provider, setProvider] = useState("local");
  useEffect(() => {fetch("/api/auth/config").then(r => r.json()).then(config => {setProvider(config.provider);setShared(config.sharedAuthProject === true);}).catch(() => {});}, []);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <section className="mt-7 space-y-6">
    <form className="rounded-xl border bg-card p-6" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setFeedback("");
      try { const response = await fetch("/api/account/feedback", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({message})}); if (!response.ok) throw new Error("Feedback could not be saved. Please retry."); setMessage(""); setFeedback("Feedback saved. Thank you."); }
      catch (error) { setFeedback(error instanceof Error ? error.message : "Connection failed."); } finally { setBusy(false); }
    }}><h2 className="text-xl font-bold">Leave feedback</h2><label className="mt-4 block text-sm">What could be better?<textarea required maxLength={2000} value={message} onChange={event => setMessage(event.target.value)} className="mt-2 min-h-28 w-full rounded-lg border bg-background p-3" /></label><button disabled={busy} className="mt-4 rounded-lg bg-primary px-4 py-3 text-primary-foreground disabled:opacity-50">Send feedback</button><p role="status" className="mt-3 text-sm">{feedback}</p><p className="mt-2 text-xs text-muted-foreground">Feedback is stored with your account on this installation and removed if you delete the account.</p></form>
    <section className="rounded-xl border border-destructive/30 p-6"><h2 className="text-xl font-bold">Delete account</h2><p className="mt-2 text-sm text-muted-foreground">Permanently remove your Wellfarm account, profile photo, scans, reports, sessions and feedback.</p>{shared && <p className="mt-2 text-sm text-muted-foreground">This installation uses shared authentication, so only Wellfarm application data will be removed.</p>}<button onClick={() => setOpen(true)} className="mt-4 rounded-lg border border-destructive px-4 py-3 text-destructive">Delete my account</button></section>
    <Dialog open={open} onOpenChange={value => { if (!busy) {setOpen(value); setPassword(""); setError("");} }}><DialogContent><DialogHeader><DialogTitle>Delete your Wellfarm account?</DialogTitle><DialogDescription>This cannot be undone. Enter your account email (Supabase) or current password (local accounts) to permanently delete your account and its saved data. {shared && "The shared authentication identity will be kept."}</DialogDescription></DialogHeader><form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError("");
      try { const response = await fetch("/api/account", {method: "DELETE", headers: {"Content-Type": "application/json"}, body: JSON.stringify(provider === "supabase" ? {confirmEmail:password.trim().toLowerCase()} : {password})}); if (!response.ok) throw new Error((await response.json()).error?.message ?? "Deletion failed."); window.location.assign("/login"); }
      catch (error) {setError(error instanceof Error ? error.message : "Connection failed.");} finally {setBusy(false);}
    }}><label className="text-sm">{provider === "supabase" ? "Account email" : "Current password"}<input required type={provider === "supabase" ? "email" : "password"} autoComplete={provider === "supabase" ? "email" : "current-password"} maxLength={254} value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border p-3" /></label>{error && <p role="alert" className="mt-3 text-destructive">{error}</p>}<div className="mt-5 flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2">Cancel</button><button disabled={busy} className="rounded-lg bg-destructive px-4 py-2 text-destructive-foreground">{busy ? "Deleting…" : "Delete permanently"}</button></div></form></DialogContent></Dialog>
  </section>;
}
