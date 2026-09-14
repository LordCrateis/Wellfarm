import { useEffect, useState, type ReactNode } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { Brand } from "@/components/Brand";
import { Captcha } from "@/components/Captcha";
import { useAccount } from "@/services/profile";
import { Eye, EyeOff } from "lucide-react";
import { apiUrl } from "@/services/runtime";

export function AccountGate({children}: {children: ReactNode}) {
  const [path] = useLocation();
  const {account, loading} = useAccount();
  if (["/", "/login", "/transparency"].includes(path)) return children;
  if (loading) return <p className="p-10" role="status">Loading your account…</p>;
  if (!account) return <Redirect to="/login" />;
  return children;
}
type Config = {provider: string; captchaSiteKey: string | null; googleEnabled: boolean};
function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 18 18" className="h-5 w-5 shrink-0"><path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.875 2.684-6.615Z"/><path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.18l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.963 10.707A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.168.281-1.707V4.961H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.039l3.007-2.332Z"/><path fill="#EA4335" d="M9 3.579c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.961l3.007 2.332C4.672 5.164 6.656 3.579 9 3.579Z"/></svg>;
}
function PasswordField({label,value,onChange,autoComplete,minLength,compact=false}:{label:string;value:string;onChange:(value:string)=>void;autoComplete:string;minLength?:number;compact?:boolean}) {
  const [visible,setVisible]=useState(false);
  return <label className="block text-sm">{label}<span className={`relative block ${compact ? "mt-1.5" : "mt-2"}`}><input required type={visible?"text":"password"} autoComplete={autoComplete} minLength={minLength} maxLength={128} value={value} onChange={event=>onChange(event.target.value)} className={`w-full rounded-lg border bg-background pr-12 ${compact ? "px-3 py-2.5" : "p-3"}`}/><button type="button" onClick={()=>setVisible(show=>!show)} aria-label={visible?`Hide ${label.toLowerCase()}`:`Show ${label.toLowerCase()}`} aria-pressed={visible} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset">{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>;
}
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
  const [resendStatus, setResendStatus] = useState("");
  useEffect(() => { fetch("/api/auth/config").then(async response => {if (!response.ok) throw new Error(); setConfig(await response.json());}).catch(() => setError("Sign-in settings could not load. Refresh to retry.")); }, []);
  if (account) return <Redirect to="/farmer" />;
  const compact = register && !verification;
  const inputClass = `${compact ? "mt-1.5 px-3 py-2.5" : "mt-2 p-3"} w-full rounded-lg border bg-background`;
  return <main className="min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-background px-5 py-4 lg:h-[100dvh] lg:py-5"><div className="relative mx-auto flex min-h-[calc(100dvh-2rem)] max-w-6xl flex-col lg:h-full lg:min-h-0"><div className="shrink-0 lg:absolute lg:left-0 lg:top-0 lg:z-10"><Brand /></div>
    <div className="grid min-h-0 flex-1 items-center gap-12 lg:grid-cols-2 lg:gap-24">
      <section className="hidden max-w-lg lg:block"><p className="text-sm font-semibold uppercase tracking-widest text-primary">Your fieldbook, connected</p><h1 className="mt-5 text-5xl leading-tight lg:text-6xl">A clearer picture of your crop health.</h1><p className="mt-6 leading-relaxed text-muted-foreground">Keep crop photos, image-based reports and field observations together. Return to your records and talk with the Wellfarm administrator when you need help.</p><div className="mt-8 border-l-2 border-primary pl-5 text-sm leading-relaxed text-muted-foreground">Records removed from history remain visible to administrators; deleting your account permanently removes them.</div><Link href="/" className="mt-8 inline-block text-sm font-semibold text-primary">← Back to Wellfarm</Link></section>
      <section className={`mx-auto w-full max-w-xl rounded-2xl border bg-card shadow-sm ${compact ? "p-5 lg:p-6" : "p-[clamp(1.25rem,3vh,2.25rem)]"}`}>{(register || verification) && <ol aria-label="Account setup progress" className={`${compact ? "mb-3" : "mb-5"} grid grid-cols-3 gap-2 text-xs font-semibold`}><li className="text-primary"><span className="mr-1 inline-grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">1</span>Account</li><li className={verification ? "text-primary" : "text-muted-foreground"}><span className={`mr-1 inline-grid h-6 w-6 place-items-center rounded-full ${verification ? "bg-primary text-primary-foreground" : "border"}`}>2</span>Verify</li><li className="text-muted-foreground"><span className="mr-1 inline-grid h-6 w-6 place-items-center rounded-full border">3</span>Profile</li></ol>}<h2 className="text-3xl">{verification ? "Check your inbox" : register ? "Create your account" : "Welcome back"}</h2><p className={`${compact ? "mt-1" : "mt-2"} text-sm text-muted-foreground`}>{verification ? `Enter the verification code sent to ${email}.` : register ? "First create your secure account. We’ll ask about you and your farm after email verification." : "Sign in to pick up where you left off."}</p>
      {!verification && <><button type="button" disabled={!config?.googleEnabled || busy} onClick={() => window.location.assign(apiUrl("/api/auth/google"))} className={`${compact ? "mt-4" : "mt-5"} flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border bg-background p-3 font-semibold transition-colors hover:border-primary/50 hover:bg-secondary disabled:opacity-50`}><GoogleMark/>Continue with Google</button>{!config?.googleEnabled && <p className="mt-2 text-xs text-muted-foreground">Google sign-in setup pending.</p>}<div className={`${compact ? "my-3" : "my-4"} flex items-center gap-3 text-xs text-muted-foreground`}><span className="h-px flex-1 bg-border" />or use email<span className="h-px flex-1 bg-border" /></div></>}
      <form className={`${compact ? "mt-3 space-y-3" : "mt-4 space-y-4"}`} onSubmit={async event => {
        event.preventDefault(); setError("");
        if (!verification && register && password !== confirmation) {setError("Passwords must match.");return;}
        setBusy(true);
        try {
          const response = await fetch(`/api/auth/${verification ? "verify" : register ? "register" : "login"}`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(verification ? {email,token:code} : {email,password,confirmPassword:confirmation,captchaToken})});
          const result = await response.json();
          if (!response.ok) {
            if (register && result.error?.code === "ACCOUNT_EXISTS") {
              setRegister(false);
              setVerification(false);
              setConfirmation("");
            }
            throw new Error(result.error?.message ?? "Sign-in failed. Please retry.");
          }
          if (result.verificationRequired) {setVerification(true);setPassword("");setConfirmation("");setResendStatus("");return;}
          window.location.assign(result.onboardingRequired ? "/onboarding" : "/farmer");
        } catch (failure) {setError(failure instanceof Error ? failure.message : "Connection failed.");}
        finally {setBusy(false);setCaptchaToken("");setAttempt(value => value+1);}
      }}>
      {verification ? <><label className="block text-sm">Email verification code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} value={code} onChange={event => setCode(event.target.value.replace(/\D/g,""))} className={inputClass} /></label>{resendStatus && <p role="status" className="text-sm text-muted-foreground">{resendStatus}</p>}</> : <>
        <label className="block text-sm">Email address<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className={inputClass} /></label>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete={register?"new-password":"current-password"} minLength={register?12:undefined} compact={compact}/>
        {register && <><PasswordField label="Confirm password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" minLength={12} compact/><p className="text-xs text-muted-foreground">Use at least 12 characters and a password you don’t use elsewhere.</p></>}
        {config?.provider === "supabase" && (config.captchaSiteKey ? <Captcha siteKey={config.captchaSiteKey} attempt={attempt} onToken={setCaptchaToken} /> : <p role="alert" className="text-sm text-destructive">CAPTCHA has not been configured. Sign-in is unavailable.</p>)}
      </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button disabled={busy || loading || !config || (!verification && config.provider === "supabase" && !captchaToken)} className="min-h-12 w-full rounded-lg bg-primary p-3 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Please wait…" : verification ? "Verify email" : register ? "Create account" : "Log in"}</button>
      </form>{verification && <button type="button" disabled={busy} className="mt-4 text-sm font-semibold text-primary disabled:opacity-50" onClick={async()=>{setBusy(true);setError("");setResendStatus("");try{const response=await fetch("/api/auth/resend-verification",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});if(!response.ok){const result=await response.json();throw new Error(result.error?.message??"Could not resend the code.");}setResendStatus("A new code was sent. Check your inbox and spam folder.");}catch(failure){setError(failure instanceof Error?failure.message:"Could not resend the code.");}finally{setBusy(false);}}}>Send a new code</button>}<button disabled={busy} className={`${verification ? "ml-5" : compact ? "mt-3" : "mt-5"} text-sm font-semibold text-primary`} onClick={() => {setRegister(verification ? false : !register);setVerification(false);setError("");setResendStatus("");setPassword("");setConfirmation("");setCode("");setCaptchaToken("");setAttempt(value=>value+1);}}>{verification ? "Back to log in" : register ? "Already have an account? Log in" : "New here? Create an account"}</button>
      {config?.provider === "local" && <p className="mt-5 border-t pt-4 text-xs leading-relaxed text-muted-foreground">Local accounts are active. Email verification and CAPTCHA will activate after Supabase setup.</p>}
      </section>
    </div></div></main>;
}
