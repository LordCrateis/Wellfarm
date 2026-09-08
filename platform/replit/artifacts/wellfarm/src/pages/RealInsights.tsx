import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { MapPin, RefreshCw, ShieldCheck, Sprout } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FormSelect } from "@/components/FormSelect";
import { WellfarmMap } from "@/components/WellfarmMap";
import {
  listRegionalScanRecords,
  type RegionalScanSummary,
} from "@/services/adapters";
import type { LocaleKey } from "@/i18n/locales";
import { LocalizedContent } from "@/i18n/TranslationProvider";

type LoadState = "loading" | "ready" | "error";

export function RealInsights({
  locale,
  setLocale,
  patterns = false,
}: {
  locale: LocaleKey;
  setLocale: (locale: LocaleKey) => void;
  patterns?: boolean;
}) {
  const [records, setRecords] = useState<RegionalScanSummary[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedCrop, setSelectedCrop] = useState("all");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      setLoadState("loading");
      try {
        const scans = await listRegionalScanRecords();
        if (active) {
          setRecords(scans);
          setLoadState("ready");
        }
      } catch {
        if (active) setLoadState("error");
      }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("wellfarm:scans-changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("wellfarm:scans-changed", refresh);
    };
  }, [reload]);

  const states = useMemo(
    () => [...new Set(records.map((scan) => scan.state))].sort(),
    [records],
  );
  const districts = useMemo(
    () => [
      ...new Set(
        records
          .filter((scan) => selectedState === "all" || scan.state === selectedState)
          .map((scan) => scan.district),
      ),
    ].sort(),
    [records, selectedState],
  );
  const crops = useMemo(
    () => [
      ...new Set(
        records
          .filter(
            (scan) =>
              (selectedState === "all" || scan.state === selectedState) &&
              (selectedDistrict === "all" || scan.district === selectedDistrict),
          )
          .map((scan) => scan.crop),
      ),
    ].sort(),
    [records, selectedState, selectedDistrict],
  );
  const filtered = records.filter(
    (scan) =>
      (selectedState === "all" || scan.state === selectedState) &&
      (selectedDistrict === "all" || scan.district === selectedDistrict) &&
      (selectedCrop === "all" || scan.crop === selectedCrop),
  );
  const analyzed = filtered.filter((scan) => scan.status === "analyzed");

  const counts = new Map<string, number>();
  analyzed.forEach((scan) => {
    const name = `${scan.crop} · ${scan.indication ?? "Analysis unavailable"}`;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - 6 + index);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    return {
      label: date.toLocaleDateString(locale, { month: "short", day: "numeric" }),
      count: filtered.filter(
        (scan) => new Date(scan.createdAt) >= date && new Date(scan.createdAt) < end,
      ).length,
    };
  });

  return <LocalizedContent><AppShell role="insights" locale={locale} setLocale={setLocale}>
    <header className="mb-7 border-b pb-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Farmer community</p>
      <h1 className="mt-3 text-4xl font-bold">{patterns ? "Regional crop patterns" : "Regional crop-health overview"}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Anonymized overviews from farmer scans on Wellfarm. These are model indications and field observations—not confirmed outbreaks or access to another farmer’s report.</p>
    </header>

    <nav className="mb-6 flex gap-5 border-b pb-4">
      <Link href="/insights" className={!patterns ? "font-bold text-primary" : ""}>Overview</Link>
      <Link href="/insights/intelligence" className={patterns ? "font-bold text-primary" : ""}>Patterns</Link>
    </nav>

    <section className="mb-6 rounded-xl border bg-card p-5" aria-label="Regional scan filters">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div><h2 className="font-bold">Filter community scans</h2><p className="mt-1 text-xs text-muted-foreground">Choose a state, then district, then crop.</p></div>
        <button onClick={() => setReload((value) => value + 1)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold hover:bg-secondary"><RefreshCw size={15} />Refresh</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-semibold">State<FormSelect value={selectedState} onChange={(event) => { setSelectedState(event.target.value); setSelectedDistrict("all"); setSelectedCrop("all"); }} aria-label="Filter regional scans by state" className="mt-2"><option value="all">All states</option>{states.map((state) => <option key={state} value={state}>{state}</option>)}</FormSelect></label>
        <label className="text-sm font-semibold">District<FormSelect value={selectedDistrict} onChange={(event) => { setSelectedDistrict(event.target.value); setSelectedCrop("all"); }} aria-label="Filter regional scans by district" className="mt-2"><option value="all">All districts</option>{districts.map((district) => <option key={district} value={district}>{district}</option>)}</FormSelect></label>
        <label className="text-sm font-semibold">Crop<FormSelect value={selectedCrop} onChange={(event) => setSelectedCrop(event.target.value)} aria-label="Filter regional scans by crop" className="mt-2"><option value="all">All crops</option>{crops.map((crop) => <option key={crop} value={crop}>{crop}</option>)}</FormSelect></label>
      </div>
    </section>

    {loadState === "loading" && <p role="status">Loading community records…</p>}
    {loadState === "error" && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-destructive">Regional records could not be loaded. Refresh to retry.</p>}
    {loadState === "ready" && <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[["Community scans", filtered.length], ["Model summaries", analyzed.length], ["Awaiting analysis", filtered.length - analyzed.length]].map(([label, count]) => <section key={label} className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{count}</p></section>)}
      </div>

      {!filtered.length ? <section className="rounded-xl border bg-card p-8"><h2 className="text-xl">No community scans match these filters</h2><p className="mt-2 text-sm text-muted-foreground">Try a broader district, state, or crop selection.</p></section> : <>
        {!patterns && <WellfarmMap ariaLabel="Approximate regional crop scan areas" maxFitZoom={8} approximateRadiusMeters={10000} showLegend points={filtered.map((scan) => ({ latitude: scan.latitude, longitude: scan.longitude, label: `${scan.district}, ${scan.state}`, detail: `${scan.crop} · ${scan.indication ?? "Awaiting analysis"}`, severity: scan.severity ?? undefined }))} />}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl border bg-card p-6"><h2 className="text-xl font-bold">Scans over the last seven days</h2><div className="mt-6 flex h-48 items-end gap-3">{days.map((day) => <div key={day.label} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"><span className="text-xs">{day.count}</span><div className="mt-1 rounded-t bg-primary" style={{ height: `${day.count / Math.max(1, ...days.map((item) => item.count)) * 130}px` }} /><span className="mt-2 text-[10px]">{day.label}</span></div>)}</div></section>
          <section className="rounded-xl border bg-card p-6"><h2 className="text-xl font-bold">Leading model indications</h2><p className="mt-2 text-xs text-muted-foreground">Anonymized visual matches, not confirmed diagnoses.</p>{counts.size ? [...counts].sort((a, b) => b[1] - a[1]).map(([name, count]) => <div key={name} className="mt-4"><div className="flex justify-between gap-3 text-sm"><span>{name}</span><strong>{count}</strong></div><div className="mt-2 h-2 rounded bg-secondary"><div className="h-full rounded bg-primary" style={{ width: `${count / Math.max(1, analyzed.length) * 100}%` }} /></div></div>) : <p className="mt-5">No completed model summaries match this selection.</p>}</section>
        </div>

        {patterns && <p className="mt-6 rounded-xl border p-5 text-sm text-muted-foreground">The charts summarize real saved scans. Weather correlation and outbreak claims remain unavailable until Wellfarm has a suitable verified longitudinal dataset.</p>}

        <section className="mt-6 rounded-xl border bg-card p-6">
          <div className="flex items-start gap-3 border-b pb-5"><ShieldCheck className="mt-0.5 text-primary" size={20} /><div><h2 className="text-xl font-bold">Anonymized scan overviews</h2><p className="mt-1 text-xs text-muted-foreground">No names, contact details, farm names, photos, notes, symptoms, exact GPS coordinates, or report links are shared.</p></div></div>
          <div className="divide-y">{filtered.slice(0, 100).map((scan, index) => <article key={`${scan.createdAt}-${scan.crop}-${index}`} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"><div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"><Sprout size={18} /></span><div><h3 className="font-bold">{scan.crop}</h3><p className="mt-1 text-sm text-muted-foreground">{scan.indication ?? "Analysis pending"}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={12} />{scan.district}, {scan.state}</p></div></div><time className="text-xs text-muted-foreground" dateTime={scan.createdAt}>{new Date(scan.createdAt).toLocaleDateString(locale)}</time></article>)}</div>
          {filtered.length > 100 && <p className="border-t pt-4 text-xs text-muted-foreground">Showing the 100 newest matching scans.</p>}
        </section>
      </>}
    </>}
  </AppShell></LocalizedContent>;
}
