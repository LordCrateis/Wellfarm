import { useState, type ReactNode } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { Brand } from "@/components/Brand";
import { useAccount } from "@/services/profile";

export function AccountGate({children}: {children: ReactNode}) {
  const [path] = useLocation();
  const {account, loading} = useAccount();
  if (["/", "/login", "/transparency"].includes(path)) return children;
  if (loading) return <p className="p-10" role="status">Loading your account…</p>;
  if (!account) return <Redirect to="/login" />;
  return children;
}
export function Login() {
  const {account, loading} = useAccount();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (account) return <Redirect to="/farmer" />;
  return <main className="min-h-screen bg-background px-5 py-10"><div className="mx-auto max-w-md"><Brand /><section className="mt-12 rounded-2xl border bg-card p-7 shadow-sm"><h1 className="text-4xl">{register ? "Start your fieldbook" : "Welcome back"}</h1><p className="mt-3 text-sm text-muted-foreground">Sign in to save crop scans, reports and your profile.</p><form className="mt-7 space-y-5" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/auth/${register ? "register" : "login"}`, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email,password})});
      if (!response.ok) throw new Error((await response.json()).error?.message ?? "Sign-in failed.");
      window.location.assign("/farmer");
    } catch (error) { setError(error instanceof Error ? error.message : "Connection failed."); } finally { setBusy(false); }
  }}><label className="block text-sm">Email<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3" /></label><label className="block text-sm">Password<input required type="password" autoComplete={register ? "new-password" : "current-password"} minLength={register ? 12 : undefined} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3" /></label>{register && <p className="text-xs text-muted-foreground">Use at least 12 characters. Email verification and password recovery are not configured yet.</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<button disabled={busy || loading} className="min-h-11 w-full rounded-lg bg-primary p-3 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Please wait…" : register ? "Create account" : "Log in"}</button></form><button className="mt-5 text-sm font-semibold text-primary" onClick={() => {setRegister(!register); setError(""); setPassword("");}}>{register ? "Already have an account? Log in" : "New here? Create an account"}</button></section><Link href="/" className="mt-6 inline-block text-sm text-primary">Back to Wellfarm</Link></div></main>;
}
