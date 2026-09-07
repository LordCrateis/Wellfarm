import { FormSelect } from "@/components/FormSelect";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Check, Leaf, Save, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LocalizedContent } from "@/i18n/TranslationProvider";
import { languageNames, type LocaleKey } from "@/i18n/locales";
import { crops } from "@/data/mock";
import { profileInitials, useAccount } from "@/services/profile";

const fieldClass = "mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

export function ProfilePage({ locale, setLocale }: { locale: LocaleKey; setLocale: (locale: LocaleKey) => void }) {
  const { profile, saveProfile } = useAccount();
  const [draft, setDraft] = useState(() => ({ ...profile, crops: [...profile.crops] }));
  const [draftLocale, setDraftLocale] = useState(locale);
  useEffect(() => setDraftLocale(locale), [locale]);
  const [feedback, setFeedback] = useState<"saved" | "error" | null>(null);
  const [photoError, setPhotoError] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    setPhotoError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setPhotoError("Choose a JPG, PNG or WebP photo under 5 MB."); return; }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
      const context = canvas.getContext("2d"); if (!context) throw new Error();
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
      setDraft(current => ({ ...current, avatar: canvas.toDataURL("image/jpeg", 0.85) }));
      setFeedback(null);
    } catch { setPhotoError("This photo could not be opened. Choose another image."); }
    finally { URL.revokeObjectURL(url); }
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile) || draftLocale !== locale;
  return <LocalizedContent><AppShell role={profile.workspace} locale={locale} setLocale={setLocale}>
    <Link href={profile.workspace === "farmer" ? "/farmer" : "/insights"} className="mb-5 inline-flex min-h-11 items-center text-sm font-semibold text-primary" data-testid="link-profile-back">← Back to workspace</Link>
    <div className="mb-8 border-b pb-7"><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Your Wellfarm</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Profile and preferences</h1><p className="mt-3 max-w-2xl text-muted-foreground">Make this workspace feel like yours. Keep your farm details and everyday preferences in one place.</p></div>
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-5">
        <section className="rounded-xl border bg-card p-6">
          <div className="grid h-20 w-20 overflow-hidden place-items-center rounded-full bg-secondary text-2xl font-bold text-primary" translate="no">{draft.avatar ? <img src={draft.avatar} alt="Profile photo preview" className="h-full w-full object-cover" /> : profileInitials(profile.name)}</div>
          <button type="button" onClick={() => photoInput.current?.click()} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground" data-testid="button-change-profile-photo">Change profile photo</button>
          <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose profile photo" onChange={event => { void uploadAvatar(event.target.files?.[0]); event.target.value = ""; }} className="hidden" />
          {draft.avatar && <button type="button" onClick={() => setDraft(current => ({ ...current, avatar: undefined }))} className="mt-2 text-sm text-primary">Remove photo</button>}
          <p className="mt-2 text-xs text-muted-foreground">Choose a photo, then save your profile.</p>
          {photoError && <p role="alert" className="mt-2 text-sm text-destructive">{photoError}</p>}
          <h2 className="mt-5 break-words text-xl font-bold">{profile.name ? <span translate="no">{profile.name}</span> : "Your profile"}</h2>
          {profile.farm && <p className="mt-1 break-words text-sm text-muted-foreground" translate="no">{profile.farm}</p>}
          <span className="mt-4 inline-block rounded-full border px-3 py-1 text-xs text-muted-foreground">Saved in this browser</span>
          <div className="mt-5 flex flex-wrap gap-2">{profile.crops.map(crop => <span key={crop} className="rounded-full bg-secondary/60 px-3 py-1 text-xs text-primary">{crop}</span>)}</div>
          <Link href="/farmer/history" className="mt-6 flex min-h-11 items-center gap-2 border-t pt-4 text-sm font-bold text-primary"><Leaf size={16} />View scan history</Link>
        </section>
        <section className="rounded-xl border bg-secondary/25 p-5 text-sm leading-6"><ShieldCheck size={22} className="mb-3 text-primary" /><h2 className="font-semibold">Your profile stays here</h2><p className="mt-2 text-muted-foreground">These preferences are stored in this browser. They are not a signed-in account and do not sync across devices. Clearing browser data removes them.</p><Link href="/transparency" className="mt-3 inline-flex font-bold text-primary">Privacy and transparency</Link></section>
      </aside>
      <form onSubmit={event => { event.preventDefault(); if (!saveProfile(draft)) { setFeedback("error"); return; } setLocale(draftLocale); setDraft({ ...draft, name: draft.name.trim(), farm: draft.farm.trim() }); setFeedback("saved"); }} onChange={() => setFeedback(null)} className="min-w-0 space-y-6">
        <section className="rounded-xl border bg-card p-5 md:p-7"><h2 className="text-lg font-bold">About you and your farm</h2><p className="mt-1 text-sm text-muted-foreground">Only add the details you want to use in your workspace.</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold">Display name<input data-testid="input-profile-name" autoComplete="name" maxLength={80} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className={fieldClass} /></label>
            <label className="text-sm font-semibold">Farm name or label (optional)<input data-testid="input-profile-farm" maxLength={100} value={draft.farm} onChange={e => setDraft({ ...draft, farm: e.target.value })} className={fieldClass} /></label>
          </div>
          <fieldset className="mt-6"><legend className="text-sm font-semibold">Crops you grow</legend><p className="mt-1 text-xs text-muted-foreground">Choose any of the crops currently supported by Wellfarm.</p><div className="mt-3 flex flex-wrap gap-2">{crops.map(crop => <label key={crop} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${draft.crops.includes(crop) ? "border-primary bg-secondary/50 text-primary" : "border-border"}`}><input type="checkbox" value={crop} checked={draft.crops.includes(crop)} onChange={e => setDraft({ ...draft, crops: e.target.checked ? [...draft.crops, crop] : draft.crops.filter(item => item !== crop) })} className="accent-[hsl(var(--primary))]" />{crop}</label>)}</div></fieldset>
        </section>
        <section className="rounded-xl border bg-card p-5 md:p-7"><h2 className="text-lg font-bold">Workspace preferences</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold">Preferred language<FormSelect data-testid="select-profile-language" value={draftLocale} onChange={e => setDraftLocale(e.target.value as LocaleKey)} className={fieldClass}>{Object.entries(languageNames).map(([key, name]) => <option key={key} value={key} translate="no">{name}</option>)}</FormSelect></label>
          <label className="text-sm font-semibold">Preferred workspace<FormSelect data-testid="select-profile-workspace" value={draft.workspace} onChange={e => setDraft({ ...draft, workspace: e.target.value as "farmer" | "insights" })} className={fieldClass}><option value="farmer">Farmer fieldbook</option><option value="insights">Regional insights</option></FormSelect></label>
        </div></section>
        <section className="rounded-xl border bg-card p-5 md:p-7"><h2 className="text-lg font-bold">Notifications</h2><label className="mt-4 flex cursor-pointer items-start justify-between gap-5"><span><span className="text-sm font-semibold">In-app scan activity</span><span className="mt-1 block text-sm text-muted-foreground">Show saved scans and unread activity in the bell panel.</span></span><input data-testid="checkbox-profile-notifications" type="checkbox" checked={draft.notifications} onChange={e => setDraft({ ...draft, notifications: e.target.checked })} className="mt-1 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]" /></label><p className="mt-4 text-xs text-muted-foreground">This controls in-app activity only. No email, SMS, or device push notifications are sent.</p></section>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5">
          <div className="text-sm" role={feedback === "error" ? "alert" : "status"}>{feedback === "saved" ? <span className="inline-flex items-center gap-2 text-primary"><Check size={16} />Profile saved</span> : feedback === "error" ? <span className="text-destructive">Your browser could not save this change.</span> : dirty ? "You have unsaved changes." : "Your preferences are up to date."}</div>
          <div className="flex gap-2"><button type="button" disabled={!dirty} onClick={() => { setDraft({ ...profile, crops: [...profile.crops] }); setDraftLocale(locale); setFeedback(null); }} className="min-h-11 rounded-lg border px-4 text-sm font-semibold disabled:opacity-40">Cancel</button><button data-testid="button-save-profile" disabled={!dirty} type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-40"><Save size={16} />Save profile</button></div>
        </div>
      </form>
    </div>
  </AppShell></LocalizedContent>;
}
