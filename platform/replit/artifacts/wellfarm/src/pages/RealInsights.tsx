import { useEffect, useState } from "react";
import { Link } from "wouter";
import type { Scan } from "@workspace/api-client-react";
import { AppShell } from "@/components/AppShell";
import { FormSelect } from "@/components/FormSelect";
import { WellfarmMap } from "@/components/WellfarmMap";
import { listScanRecords } from "@/services/adapters";
import type { ScanAnalysisResult } from "@/services/scan-analysis";
import type { LocaleKey } from "@/i18n/locales";
import { LocalizedContent } from "@/i18n/TranslationProvider";

export function RealInsights({ locale, setLocale, patterns = false }: {locale: LocaleKey; setLocale: (locale: LocaleKey) => void; patterns?: boolean}) {
  const [records, setRecords] = useState<Scan[]>([]);
  const [reports, setReports] = useState<Record<string, ScanAnalysisResult>>({});
  const [state, setState] = useState("loading");
  const [crop, setCrop] = useState("all");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      setState("loading");
      try {
        const scans = await listScanRecords();
        const results = await Promise.all(scans.filter(scan => scan.status === "completed").map(async scan => {
          const response = await fetch(`/api/scans/${encodeURIComponent(scan.id)}/analysis`);
          if (!response.ok) throw new Error("Saved report unavailable");
          return [scan.id, await response.json()] as const;
        }));
        if (active) { setRecords(scans); setReports(Object.fromEntries(results)); setState("ready"); }
      } catch { if (active) setState("error"); }
    };
    void refresh(); window.addEventListener("focus", refresh); window.addEventListener("wellfarm:scans-changed", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); window.removeEventListener("wellfarm:scans-changed", refresh); };
  }, [reload]);
  const filtered = records.filter(scan => crop === "all" || scan.crop === crop);
  const completed = filtered.filter(scan => reports[scan.id]);
  const counts = new Map<string, number>();
  completed.forEach(scan => { const name = `${scan.crop} · ${reports[scan.id].candidates[0].condition}`; counts.set(name, (counts.get(name) ?? 0) + 1); });
  const days = Array.from({length: 7}, (_, index) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - 6 + index);
    const end = new Date(date); end.setDate(end.getDate() + 1);
    return { label: date.toLocaleDateString(locale, {month: "short", day: "numeric"}), count: filtered.filter(scan => new Date(scan.createdAt) >= date && new Date(scan.createdAt) < end).length };
  });
  return <LocalizedContent><AppShell role="insights" locale={locale} setLocale={setLocale}>
    <header className="mb-7 border-b pb-6"><p className="text-xs uppercase tracking-widest text-muted-foreground">Saved scan insights</p><h1 className="mt-3 text-4xl font-bold">{patterns ? "Patterns in your records" : "Crop-health overview"}</h1><p className="mt-3 text-sm text-muted-foreground">Calculated from the latest 100 saved scans on this installation. Counts represent scans, not unique farms or confirmed disease outbreaks.</p></header>
    <nav className="mb-6 flex gap-5 border-b pb-4"><Link href="/insights" className={!patterns ? "font-bold text-primary" : ""}>Overview</Link><Link href="/insights/intelligence" className={patterns ? "font-bold text-primary" : ""}>Patterns</Link></nav>
    <div className="mb-6 flex max-w-lg items-center gap-4"><label className="flex-1 text-sm">Crop<FormSelect value={crop} onChange={event => setCrop(event.target.value)} aria-label="Filter insights by crop"><option value="all">All crops</option>{[...new Set(records.map(scan => scan.crop))].sort().map(crop => <option key={crop} value={crop}>{crop}</option>)}</FormSelect></label><button onClick={() => setReload(value => value + 1)} className="rounded-lg border px-4 py-2">Refresh</button></div>
    {state === "loading" && <p role="status">Loading saved records…</p>}
    {state === "error" && <p role="alert">Records or reports could not be loaded. Refresh to retry.</p>}
    {state === "ready" && <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">{[["Saved scans", filtered.length], ["Model reports", completed.length], ["Awaiting analysis", filtered.length - completed.length]].map(([label, count]) => <section key={label} className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{count}</p></section>)}</div>
      {!filtered.length ? <section className="rounded-xl border bg-card p-8"><h2 className="text-xl">No records for this selection</h2><Link href="/farmer/scan" className="mt-4 inline-block text-primary">Scan a crop</Link></section> : <>
        {!patterns && <WellfarmMap ariaLabel="Approximate saved scan locations" maxFitZoom={10} points={filtered.map(scan => ({latitude: Math.round(scan.latitude * 100) / 100, longitude: Math.round(scan.longitude * 100) / 100, label: scan.crop, detail: reports[scan.id]?.candidates[0].condition ?? "Awaiting analysis", severity: reports[scan.id]?.severity}))} />}
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl border bg-card p-6"><h2 className="text-xl font-bold">Scans over the last seven days</h2><div className="mt-6 flex h-48 items-end gap-3">{days.map(day => <div key={day.label} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"><span className="text-xs">{day.count}</span><div className="mt-1 rounded-t bg-primary" style={{height: `${day.count / Math.max(1, ...days.map(day => day.count)) * 130}px`}} /><span className="mt-2 text-[10px]">{day.label}</span></div>)}</div></section>
          <section className="rounded-xl border bg-card p-6"><h2 className="text-xl font-bold">Leading model indications</h2><p className="mt-2 text-xs text-muted-foreground">Model matches, not confirmed diagnoses.</p>{counts.size ? [...counts].sort((a,b) => b[1]-a[1]).map(([name,count]) => <div key={name} className="mt-4"><div className="flex justify-between gap-3 text-sm"><span>{name}</span><strong>{count}</strong></div><div className="mt-2 h-2 rounded bg-secondary"><div className="h-full rounded bg-primary" style={{width: `${count / completed.length * 100}%`}} /></div></div>) : <p className="mt-5">No completed model reports yet.</p>}</section>
        </div>
        {patterns && <p className="mt-6 rounded-xl border p-5 text-sm text-muted-foreground">Weather correlations and outbreak detection are unavailable: there is no linked historical weather series or verified farm-level dataset to calculate them.</p>}
        <section className="mt-6 rounded-xl border bg-card p-6"><h2 className="text-xl font-bold">Contributing records</h2>{filtered.map(scan => <Link key={scan.id} href={`/farmer/history/${scan.id}`} className="flex justify-between gap-4 border-b py-3 text-sm"><span>{scan.crop} · {reports[scan.id]?.candidates[0].condition ?? "Awaiting analysis"}</span><span>{new Date(scan.createdAt).toLocaleDateString(locale)}</span></Link>)}</section>
      </>}
    </>}
  </AppShell></LocalizedContent>;
}
