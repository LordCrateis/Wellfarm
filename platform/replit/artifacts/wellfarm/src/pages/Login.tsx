import { useEffect, useState, type ReactNode } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { Brand } from "@/components/Brand";
import { Captcha } from "@/components/Captcha";
import { useAccount } from "@/services/profile";

export function AccountGate({children}: {children: ReactNode}) {
  const [path] = useLocation();
  const {account, loading} = useAccount();
  if (["/", "/login", "/transparency"].includes(path)) return children;
  if (loading) return <p className="p-10" role="status">Loading your account…</p>;
  if (!account) return <Redirect to="/login" />;
  return children;
}
type Config = {provider: string; captchaSiteKey: string | null; googleEnabled: boolean};
export function Login() {
  const {account, loading} = useAccount();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [verification, setVerification] = useState(false);
  const [code, setCode] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState(new URLSearchParams(window.location.search).has("error") ? "Google sign-in could not be completed. Please try again." : "");
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/auth/config").then(async response => {if (!response.ok) throw new Error(); setConfig(await response.json());}).catch(() => setError("Sign-in settings could not load. Refresh to retry.")); }, []);
  if (account) return <Redirect to="/farmer" />;
  const inputClass = "mt-2 w-full rounded-lg border bg-background p-3";
  return <main className="min-h-screen bg-background px-5 py-8 lg:py-14"><div className="mx-auto max-w-6xl"><Brand />
    <div className="mt-10 grid items-center gap-12 lg:grid-cols-2 lg:gap-24">
      <section className="max-w-lg"><p className="text-sm font-semibold uppercase tracking-widest text-primary">Your fieldbook, connected</p><h1 className="mt-5 text-5xl leading-tight lg:text-6xl">A clearer picture of your crop health.</h1><p className="mt-6 leading-relaxed text-muted-foreground">Keep crop photos, image-based reports and field observations together. Return to your records and talk with the Wellfarm administrator when you need help.</p><div className="mt-8 border-l-2 border-primary pl-5 text-sm leading-relaxed text-muted-foreground">Records removed from history remain visible to administrators; deleting your account permanently removes them.</div><Link href="/" className="mt-8 inline-block text-sm font-semibold text-primary">← Back to Wellfarm</Link></section>
      <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-9"><h2 className="text-3xl">{verification ? "Check your inbox" : register ? "Create your account" : "Welcome back"}</h2><p className="mt-3 text-sm text-muted-foreground">{verification ? `Enter the verification code sent to ${email}.` : register ? "A place for your fields, photos and observations." : "Sign in to pick up where you left off."}</p>
      {!verification && <><button type="button" disabled={!config?.googleEnabled || busy} onClick={() => window.location.assign("/api/auth/google")} className="mt-6 min-h-12 w-full rounded-lg border bg-background p-3 font-semibold disabled:opacity-50">Continue with Google</button>{!config?.googleEnabled && <p className="mt-2 text-xs text-muted-foreground">Google sign-in setup pending.</p>}<div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or use email<span className="h-px flex-1 bg-border" /></div></>}
      <form className="mt-6 space-y-5" onSubmit={async event => {
        event.preventDefault(); setError("");
        if (!verification && register && password !== confirmation) {setError("Passwords must match.");return;}
        setBusy(true);
        try {
          const response = await fetch(`/api/auth/${verification ? "verify" : register ? "register" : "login"}`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(verification ? {email,token:code} : {email,password,confirmPassword:confirmation,captchaToken})});
          const result = await response.json();
          if (!response.ok) throw new Error(result.error?.message ?? "Sign-in failed. Please retry.");
          if (result.verificationRequired) {setVerification(true);setPassword("");setConfirmation("");return;}
          window.location.assign("/farmer");
        } catch (failure) {setError(failure instanceof Error ? failure.message : "Connection failed.");}
        finally {setBusy(false);setCaptchaToken("");setAttempt(value => value+1);}
      }}>
      {verification ? <label className="block text-sm">Email verification code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} value={code} onChange={event => setCode(event.target.value)} className={inputClass} /></label> : <>
        <label className="block text-sm">Email address<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className={inputClass} /></label>
        <label className="block text-sm">Password<input required type="password" autoComplete={register ? "new-password" : "current-password"} minLength={register ? 12 : undefined} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} className={inputClass} /></label>
        {register && <><label className="block text-sm">Confirm password<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmation} onChange={event => setConfirmation(event.target.value)} className={inputClass} /></label><p className="text-xs text-muted-foreground">Use at least 12 characters and a password you don’t use elsewhere.</p></>}
        {config?.provider === "supabase" && (config.captchaSiteKey ? <Captcha siteKey={config.captchaSiteKey} attempt={attempt} onToken={setCaptchaToken} /> : <p role="alert" className="text-sm text-destructive">CAPTCHA has not been configured. Sign-in is unavailable.</p>)}
      </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button disabled={busy || loading || !config || (!verification && config.provider === "supabase" && !captchaToken)} className="min-h-12 w-full rounded-lg bg-primary p-3 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Please wait…" : verification ? "Verify email" : register ? "Create account" : "Log in"}</button>
      </form><button disabled={busy} className="mt-6 text-sm font-semibold text-primary" onClick={() => {setRegister(verification ? false : !register);setVerification(false);setError("");setPassword("");setConfirmation("");setCode("");setCaptchaToken("");setAttempt(value=>value+1);}}>{verification ? "Back to log in" : register ? "Already have an account? Log in" : "New here? Create an account"}</button>
      {config?.provider === "local" && <p className="mt-5 border-t pt-4 text-xs leading-relaxed text-muted-foreground">Local accounts are active. Email verification and CAPTCHA will activate after Supabase setup.</p>}
      </section>
    </div></div></main>;
}
