import { useMemo, useState } from "react";
import { Redirect, useLocation } from "wouter";
import { Check, MapPin } from "lucide-react";
import { Brand } from "@/components/Brand";
import { FormSelect } from "@/components/FormSelect";
import { crops } from "@/data/mock";
import { indiaStatesAndTerritories } from "@/data/india";
import { languageNames, type LocaleKey } from "@/i18n/locales";
import { useAccount } from "@/services/profile";

const fieldClass = "mt-2 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

export function Onboarding({locale,setLocale}:{locale:LocaleKey;setLocale:(locale:LocaleKey)=>void}) {
  const {account,loading,profile,saveProfile}=useAccount();
  const [,navigate]=useLocation();
  const inferred=useMemo(()=>profile.name.trim().split(/\s+/u),[profile.name]);
  const [firstName,setFirstName]=useState(profile.firstName??inferred[0]??"");
  const [lastName,setLastName]=useState(profile.lastName??inferred.slice(1).join(" "));
  const [state,setState]=useState(profile.state??"");
  const [district,setDistrict]=useState(profile.district??"");
  const [city,setCity]=useState(profile.city??"");
  const [farm,setFarm]=useState(profile.farm);
  const [selectedCrops,setSelectedCrops]=useState([...profile.crops]);
  const [preferredLocale,setPreferredLocale]=useState(locale);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  if(loading) return <p className="p-10" role="status">Loading your account…</p>;
  if(!account) return <Redirect to="/login"/>;
  return <main className="min-h-[100dvh] bg-background px-5 py-6 md:py-10"><div className="mx-auto max-w-5xl"><Brand/><div className="mt-8 grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
    <section className="lg:pt-10"><p className="text-sm font-semibold uppercase tracking-widest text-primary">One last step</p><h1 className="mt-4 text-4xl leading-tight md:text-5xl">Set up your fieldbook.</h1><p className="mt-5 leading-relaxed text-muted-foreground">These details personalize your workspace and let Wellfarm group public regional patterns by crop, state and district without exposing your private scan report.</p><div className="mt-7 rounded-xl border bg-secondary/30 p-5 text-sm leading-6"><MapPin className="mb-3 text-primary"/><strong>Why location details?</strong><p className="mt-1 text-muted-foreground">State and district power regional filters. Your exact GPS coordinates remain separate from this profile.</p></div></section>
    <form className="rounded-2xl border bg-card p-5 shadow-sm md:p-8" onSubmit={async event=>{event.preventDefault();setError("");if(!firstName.trim()||!lastName.trim()||!state||!district.trim()||!city.trim()){setError("Complete your name, state, district and city or village.");return;}if(!selectedCrops.length){setError("Choose at least one crop you grow.");return;}setBusy(true);const saved=await saveProfile({...profile,firstName:firstName.trim(),lastName:lastName.trim(),name:`${firstName.trim()} ${lastName.trim()}`,state,district:district.trim(),city:city.trim(),farm:farm.trim(),crops:selectedCrops,workspace:"farmer"});setBusy(false);if(!saved){setError("Your profile could not be saved. Please retry.");return;}setLocale(preferredLocale);navigate("/farmer");}}>
      <ol aria-label="Account setup progress" className="mb-7 grid grid-cols-3 gap-2 text-xs font-semibold"><li className="text-primary"><span className="mr-1 inline-grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground"><Check size={14}/></span>Account</li><li className="text-primary"><span className="mr-1 inline-grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground"><Check size={14}/></span>Verify</li><li className="text-primary"><span className="mr-1 inline-grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">3</span>Profile</li></ol>
      <h2 className="text-3xl">Tell us about your farm</h2><p className="mt-2 text-sm text-muted-foreground">You can change these details later from your profile.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold">First name<input required autoComplete="given-name" maxLength={50} value={firstName} onChange={event=>setFirstName(event.target.value)} className={fieldClass}/></label><label className="text-sm font-semibold">Last name<input required autoComplete="family-name" maxLength={50} value={lastName} onChange={event=>setLastName(event.target.value)} className={fieldClass}/></label>
      <label className="text-sm font-semibold">State or union territory<FormSelect aria-label="State or union territory" value={state} onChange={event=>setState(event.target.value)} className={fieldClass}><option value="" disabled>Select your state</option>{indiaStatesAndTerritories.map(item=><option key={item} value={item}>{item}</option>)}</FormSelect></label><label className="text-sm font-semibold">District<input required maxLength={100} value={district} onChange={event=>setDistrict(event.target.value)} className={fieldClass}/></label>
      <label className="text-sm font-semibold">City or village<input required autoComplete="address-level2" maxLength={100} value={city} onChange={event=>setCity(event.target.value)} className={fieldClass}/></label><label className="text-sm font-semibold">Farm name <span className="font-normal text-muted-foreground">(optional)</span><input maxLength={100} value={farm} onChange={event=>setFarm(event.target.value)} className={fieldClass}/></label>
      <label className="text-sm font-semibold sm:col-span-2">Preferred language<FormSelect aria-label="Preferred language" value={preferredLocale} onChange={event=>setPreferredLocale(event.target.value as LocaleKey)} className={fieldClass}>{Object.entries(languageNames).map(([key,name])=><option key={key} value={key}>{name}</option>)}</FormSelect></label></div>
      <fieldset className="mt-6"><legend className="text-sm font-semibold">Crops you grow</legend><p className="mt-1 text-xs text-muted-foreground">Choose one or more. This also tailors your scan flow.</p><div className="mt-3 flex flex-wrap gap-2">{crops.map(crop=><label key={crop} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${selectedCrops.includes(crop)?"border-primary bg-secondary/60 text-primary":"border-border"}`}><input type="checkbox" checked={selectedCrops.includes(crop)} onChange={event=>setSelectedCrops(current=>event.target.checked?[...current,crop]:current.filter(item=>item!==crop))} className="accent-[hsl(var(--primary))]"/>{crop}</label>)}</div></fieldset>
      {error&&<p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}<button disabled={busy} className="mt-6 min-h-12 w-full rounded-lg bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50">{busy?"Saving your fieldbook…":"Finish setup"}</button>
    </form>
  </div></div></main>;
}
