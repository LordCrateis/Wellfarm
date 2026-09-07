import { LocalizedContent } from "@/i18n/TranslationProvider";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Crop, Scan } from "@workspace/api-client-react";
import { Link, useLocation, useParams } from "wouter";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  CloudRain,
  Filter,
  History,
  Info,
  Leaf,
  MapPin,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import {
  allIndiaSummary,
  cacheEntries,
  crops,
  districtSummaries,
  modelEvaluation,
  scans,
  trend,
  weather,
  type Severity,
} from "@/data/mock";
import {
  analyzeCropScan,
  createScanRecord,
  sampleLocation,
  getApproximateLocationLabel,
  getScanRecord,
  listScanRecords,
  requestLocation,
  uploadCropImage,
  weatherService,
  type DisplayWeather,
} from "@/services/adapters";
import { Brand } from "@/components/Brand";
import { AppShell, LanguageSelect, PublicNav } from "@/components/AppShell";
import { WellfarmMap } from "@/components/WellfarmMap";
import { ScanResultCard } from "@/components/ScanResultCard";
import { BackLink } from "@/components/BackLink";
import { useAccount } from "@/services/profile";
import {
  MiniBar,
  Provenance,
  SectionLabel,
  SeverityBadge,
} from "@/components/Status";
import { languageNames, locales, type LocaleKey } from "@/i18n/locales";
import { useMobileCamera } from "@/hooks/use-mobile-camera";
import type { ScanAnalysisResult } from "@/services/scan-analysis";
import {
  requestAdvisoryExplanation,
  type AdvisoryExplanation,
  type AdvisoryContext,
} from "@/services/advisory";

const Button = ({
  children,
  variant = "primary",
  onClick,
  href,
  testId = "button-action",
  disabled = false,
}: {
  children: ReactNode;
  variant?: "primary" | "outline" | "quiet" | "danger";
  onClick?: () => void;
  href?: string;
  testId?: string;
  disabled?: boolean;
}) => {
  const cls = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${variant === "primary" ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90" : variant === "danger" ? "border border-[hsl(4_48%_55%)] bg-[hsl(4_48%_44%)] text-[hsl(var(--card))]" : variant === "outline" ? "border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]" : "text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))]"}`;
  const action =
    onClick ??
    (() =>
      window.alert(
        "This control is not connected yet. Its local adapter is ready for implementation.",
      ));
  return <LocalizedContent>{href ? (
    <Link href={href} className={cls} data-testid={testId}>
      {children}
    </Link>
  ) : (
    <button
      onClick={action}
      className={cls}
      data-testid={testId}
      disabled={disabled}
    >
      {children}
    </button>
  )}</LocalizedContent>;
};
const PageHeader = ({
  eyebrow,
  title,
  children,
  back,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  back?: ReactNode;
}) => <LocalizedContent>{(
  <div className="mb-8 flex flex-col gap-5 border-b border-[hsl(var(--border))] pb-7 md:flex-row md:items-end md:justify-between">
    <div>
      {back ?? <BackLink />}
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
        {eyebrow}
      </div>
      <h1 className="max-w-3xl text-3xl font-extrabold tracking-[-.04em] text-[hsl(var(--foreground))] md:text-4xl">
        {title}
      </h1>
    </div>
    {children}
  </div>
)}</LocalizedContent>;
const Metric = ({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "default" | "amber" | "red";
}) => <LocalizedContent>{(
  <div
    className={`border-l-2 pl-4 ${tone === "amber" ? "border-[hsl(var(--accent))]" : tone === "red" ? "border-[hsl(4_48%_44%)]" : "border-[hsl(var(--primary))]"}`}
  >
    <div className="font-mono text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
      {label}
    </div>
    <div className="mt-1 text-2xl font-extrabold tracking-[-.04em]">
      {value}
    </div>
    {note && (
      <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
        {note}
      </div>
    )}
  </div>
)}</LocalizedContent>;
const Box = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => <LocalizedContent>{(
  <section
    className={`border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm ${className}`}
  >
    {children}
  </section>
)}</LocalizedContent>;

function formatScanDate(value: string, locale: LocaleKey): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function scanSummary(scan: Scan): string {
  if (scan.symptoms?.length) return scan.symptoms.join(", ");
  return (
    [scan.affectedPart, scan.growthStage].filter(Boolean).join(" · ") ||
    "Crop details recorded"
  );
}

function ScanStatusBadge({ status }: { status: Scan["status"] }) {
  const labels: Record<Scan["status"], string> = {
    pending: "Saved",
    analyzing: "Analyzing",
    completed: "Completed",
    failed: "Needs retry",
  };
  const classes: Record<Scan["status"], string> = {
    pending:
      "border-[hsl(39_77%_55%)] bg-[hsl(39_77%_66%/_.18)] text-[hsl(26_44%_31%)]",
    analyzing:
      "border-[hsl(var(--primary))] bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]",
    completed:
      "border-[hsl(112_22%_54%)] bg-[hsl(112_22%_81%)] text-[hsl(153_43%_23%)]",
    failed:
      "border-[hsl(4_48%_55%)] bg-[hsl(4_48%_44%/_.12)] text-[hsl(4_48%_36%)]",
  };

  return <LocalizedContent>{(
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.08em] ${classes[status]}`}
      data-testid={`status-scan-${status}`}
    >
      {labels[status]}
    </span>
  )}</LocalizedContent>;
}

export function PublicHome({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  const t = locales.en;
  const [homeScans, setHomeScans] = useState<Scan[]>([]);
  const [homeReports, setHomeReports] = useState<Record<string, ScanAnalysisResult>>({});
  const [homeState, setHomeState] = useState("loading");
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const scans = await listScanRecords();
        const reports = await Promise.all(scans.filter(scan => scan.status === "completed").map(async scan => {
          const response = await fetch(`/api/scans/${encodeURIComponent(scan.id)}/analysis`);
          return response.ok ? [scan.id, await response.json()] as const : null;
        }));
        if (active) {
          setHomeScans(scans);
          setHomeReports(Object.fromEntries(reports.filter(report => report !== null)));
          setHomeState("ready");
        }
      } catch { if (active) setHomeState("error"); }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("wellfarm:scans-changed", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); window.removeEventListener("wellfarm:scans-changed", refresh); };
  }, []);
  return <LocalizedContent>{(
    <div className="wf-noise min-h-[100dvh]">
      <PublicNav locale={locale} setLocale={setLocale} />
      <section className="mx-auto grid max-w-[1240px] gap-10 px-5 pb-20 pt-14 md:pt-20 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:px-8 lg:pb-28">
        <div className="wf-enter">
          <div className="mb-6 inline-flex items-center gap-2 border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 font-mono text-[10px] uppercase tracking-[.14em] text-[hsl(var(--primary))]">
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />
            Open crop-health portfolio project
          </div>
          <h1 className="max-w-[680px] text-5xl font-extrabold leading-[.98] tracking-[-.065em] text-[hsl(var(--primary))] md:text-7xl">
            Understand what your crop image may be showing.{" "}
            <span className="text-[hsl(var(--foreground))]">
              Keep the evidence in one fieldbook.
            </span>
          </h1>
          <p className="mt-7 max-w-[560px] text-lg leading-8 text-[hsl(var(--muted-foreground))]">
            Wellfarm combines image-based crop indications, live weather,
            private scan history, and privacy-aware regional patterns.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/farmer" testId="button-hero-scan">
              <Leaf size={17} />
              {t.actions.scan}
            </Button>
            <Button
              href="/insights"
              variant="outline"
              testId="button-hero-dashboard"
            >
              Explore regional insights <ArrowUpRight size={16} />
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            <Provenance kind="model" />
            <Provenance kind="sample" />
            <Provenance kind="local" />
          </div>
        </div>
        <div className="wf-enter wf-delay-2 relative border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-3 pb-3">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">
                Your saved fieldbook
              </div>
              <div className="mt-1 text-sm font-bold">Your crop scans</div>
            </div>
            <Provenance kind="local" />
          </div>
          <div className="mt-3">
            <WellfarmMap
              ariaLabel="Approximate locations of your saved crop scans"
              className="h-[310px] sm:h-[340px]"
              maxFitZoom={10}
              points={homeScans.map((scan) => ({
                latitude: Math.round(scan.latitude * 100) / 100,
                longitude: Math.round(scan.longitude * 100) / 100,
                label: `${scan.crop} · ${formatScanDate(scan.createdAt, locale)}`,
                detail: homeReports[scan.id]?.candidates[0]?.condition ?? "Saved scan",
                severity: homeReports[scan.id]?.severity,
              }))}
            />
            <div className="grid gap-2 border-x border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 sm:grid-cols-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Saved scans
                </div>
                <div className="mt-1 text-sm font-extrabold">{homeScans.length}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Completed reports
                </div>
                <div className="mt-1 text-sm font-extrabold">{Object.keys(homeReports).length}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Map data
                </div>
                <div className="mt-1 text-sm font-extrabold">OpenStreetMap</div>
              </div>
            </div>
            <div className="border border-t-0 border-[hsl(var(--border))] p-3" data-testid="home-saved-reports">
              {homeState === "loading" && <p>Loading saved scans…</p>}
              {homeState === "error" && <p>Saved scans could not be loaded. Check that Wellfarm is running.</p>}
              {homeState === "ready" && homeScans.length === 0 && <p>No saved scans yet.</p>}
              {homeScans.slice(0, 3).map(scan => (
                <Link key={scan.id} href={`/farmer/history/${scan.id}`} className="flex items-center gap-3 border-b border-[hsl(var(--border))] py-3 last:border-0">
                  {scan.imagePath && <img src={scan.imagePath} alt={`${scan.crop} scan`} className="h-12 w-12 rounded object-cover" />}
                  <div><div className="text-sm font-bold">{scan.crop} · {homeReports[scan.id]?.candidates[0]?.condition ?? "Saved scan"}</div><div className="text-xs">{formatScanDate(scan.createdAt, locale)}</div></div>
                  <ArrowUpRight size={16} className="ml-auto" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section
        id="how"
        className="border-y border-[hsl(var(--border))] bg-[hsl(var(--card))]"
      >
        <div className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8">
          <SectionLabel eyebrow="The loop">
            From a field notebook to a shared signal
          </SectionLabel>
          <div className="grid gap-0 md:grid-cols-3 lg:grid-cols-6">
            {[
              ["01", "Scan", "A clear crop photo starts the record."],
              ["02", "Diagnose", "A visual indication with uncertainty."],
              ["03", "Context", "Weather is kept separate from model evidence."],
              ["04", "Save", "The result stays in a private fieldbook."],
              ["05", "Compare", "Changes can be reviewed across scans."],
              ["06", "Explore", "Sample aggregates reveal regional patterns."],
            ].map(([n, title, text]) => (
              <div
                key={n}
                className="border-t border-[hsl(var(--border))] p-4 pl-0 md:pr-5 lg:border-l lg:border-t-0 lg:pl-4"
              >
                <div className="font-mono text-xs text-[hsl(var(--accent-foreground))]">
                  {n}
                </div>
                <div className="mt-7 font-bold">{title}</div>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-[1240px] gap-8 px-5 py-16 lg:grid-cols-[.8fr_1.2fr] lg:px-8">
        <div>
          <SectionLabel eyebrow="Two focused workspaces">
            Personal records and regional patterns
          </SectionLabel>
          <p className="max-w-md leading-7 text-[hsl(var(--muted-foreground))]">
            The fieldbook focuses on individual crop observations. Regional
            insights use privacy-reduced sample or local aggregates.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            [
              "Farmers",
              "A calm next step, not a chemical prescription.",
              "/farmer",
            ],
            [
              "Regional insights",
              "Aggregate patterns with reasons behind severity.",
              "/insights",
            ],
          ].map(([title, text, href]) => (
            <Link
              key={title}
              href={href}
              className="group border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm hover:-translate-y-1"
              data-testid={`link-stakeholder-${title.toLowerCase()}`}
            >
              <UserRound size={18} className="text-[hsl(var(--primary))]" />
              <h3 className="mt-8 font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                {text}
              </p>
              <ArrowRight
                size={16}
                className="mt-7 text-[hsl(var(--primary))] transition group-hover:translate-x-1"
              />
            </Link>
          ))}
        </div>
      </section>
      <section className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-14 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--sidebar-primary))]">
              Responsible by design
            </div>
            <h2 className="mt-3 max-w-xl text-3xl font-extrabold tracking-[-.04em]">
              Decision support, not a replacement for experts.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--primary-foreground)/_.72)]">
              Every indication carries confidence, provenance and limitations.
              Wellfarm never sends a scan to another person or organization.
            </p>
          </div>
          <Button
            href="/transparency"
            variant="outline"
            testId="button-responsible-transparency"
          >
            Read the data notes <ArrowRight size={16} />
          </Button>
        </div>
      </section>
      <footer className="mx-auto flex max-w-[1240px] flex-col gap-4 px-5 py-8 text-sm text-[hsl(var(--muted-foreground))] md:flex-row md:items-center md:justify-between lg:px-8">
        <Brand />
        <span>Open portfolio project · privacy-aware crop intelligence</span>
        <Link
          href="/workspaces"
          className="font-bold text-[hsl(var(--primary))]"
          data-testid="link-footer-workspaces"
        >
          Open Wellfarm
        </Link>
      </footer>
    </div>
  )}</LocalizedContent>;
}

export function Roles({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  const t = locales.en;
  const roles = [
    {
      title: t.nav.farmers,
      desc: "Scan a plant, understand the early indication, and choose a safe next step.",
      href: "/farmer",
      code: "01",
      icon: Leaf,
    },
    {
      title: t.nav.insights,
      desc: "Explore sample and local patterns without exposing farm coordinates.",
      href: "/insights",
      code: "02",
      icon: BarChart3,
    },
  ];
  return <LocalizedContent>{(
    <div className="min-h-[100dvh] bg-[hsl(var(--background))]">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-6 lg:px-8">
        <Brand />
        <LanguageSelect locale={locale} setLocale={setLocale} />
      </header>
      <main className="mx-auto max-w-[1080px] px-5 pb-20 pt-12 lg:px-8">
        <BackLink />
        <div className="max-w-xl">
          <div className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
            Wellfarm workspace
          </div>
          <h1 className="mt-3 text-4xl font-extrabold tracking-[-.05em] text-[hsl(var(--primary))] md:text-6xl">
            Choose the view you need.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[hsl(var(--muted-foreground))]">
            Work with your own crop records or explore privacy-reduced regional
            patterns.
          </p>
        </div>
        <div className="mt-12 grid gap-3 md:grid-cols-2">
          {roles.map(({ title, desc, href, code, icon: Icon }) => (
            <Link
              href={href}
              key={title}
              data-testid={`link-role-${code}`}
              className="group flex min-h-[190px] flex-col justify-between border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm transition hover:-translate-y-1 hover:border-[hsl(var(--primary))]"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                  {code}
                </span>
                <Icon size={22} className="text-[hsl(var(--primary))]" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{title}</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  {desc}
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]">
                  Enter workspace{" "}
                  <ArrowRight
                    size={15}
                    className="transition group-hover:translate-x-1"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )}</LocalizedContent>;
}

export function FarmerHome({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  const t = locales.en;
  const { profile } = useAccount();
  const [fieldWeather, setFieldWeather] = useState<DisplayWeather>({
    ...weather,
    freshness: "sample",
  });
  const [savedScans, setSavedScans] = useState<Scan[]>([]);
  const [scansLoading, setScansLoading] = useState(true);
  const [scansError, setScansError] = useState(false);

  useEffect(() => {
    let active = true;
    weatherService
      .getCurrentWeather(sampleLocation.latitude, sampleLocation.longitude)
      .then((nextWeather) => {
        if (active) setFieldWeather(nextWeather);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    listScanRecords()
      .then((records) => {
        if (active) setSavedScans(records);
      })
      .catch(() => {
        if (active) setScansError(true);
      })
      .finally(() => {
        if (active) setScansLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return <LocalizedContent>{(
    <AppShell role="farmer" locale={locale} setLocale={setLocale}>
      <PageHeader eyebrow="Farmer fieldbook / 01" title={profile.name ? `Welcome, ${profile.name}` : "Your fieldbook"}>
        <Button href="/farmer/scan" testId="button-farmer-scan">
          <Leaf size={17} />
          {t.actions.scan}
        </Button>
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <Box className="wf-grid-paper">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold">
                <MapPin size={16} className="text-[hsl(var(--primary))]" />
                {t.farmer.area}
              </div>
              <div className="mt-6 text-3xl font-extrabold tracking-[-.04em]">
                Your field notebook is ready.
              </div>
              <p className="mt-3 max-w-lg leading-7 text-[hsl(var(--muted-foreground))]">
                {t.farmer.contribution}
              </p>
            </div>
            <Provenance kind="sample" />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/farmer/scan" testId="button-start-first-scan">
              Start a crop scan <ArrowRight size={16} />
            </Button>
            <Button
              href="/farmer/history"
              variant="outline"
              testId="button-view-history"
            >
              <History size={16} />
              View history
            </Button>
          </div>
        </Box>
        <Box>
          <div className="flex items-center justify-between">
            <SectionLabel eyebrow="Weather adapter">
              {t.farmer.weather}
            </SectionLabel>
            <Provenance
              kind={
                fieldWeather.freshness === "sample"
                  ? "sample"
                  : fieldWeather.freshness === "cached"
                    ? "cache"
                    : "live"
              }
            />
          </div>
          <div className="mt-1 flex items-end gap-3">
            <CloudRain size={28} className="text-[hsl(var(--primary))]" />
            <span className="text-4xl font-extrabold">
              {fieldWeather.temperature}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[hsl(var(--border))] pt-4 text-sm">
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                Humidity
              </div>
              <b>{fieldWeather.humidity}</b>
            </div>
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                Rain
              </div>
              <b>{fieldWeather.rain}</b>
            </div>
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                Wind
              </div>
              <b>{fieldWeather.wind}</b>
            </div>
          </div>
          <p className="mt-5 text-xs text-[hsl(var(--muted-foreground))]">
            {fieldWeather.location} · {fieldWeather.source} ·{" "}
            {fieldWeather.updated}
          </p>
        </Box>
      </div>
      <div className="mt-9 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
        <div>
          <SectionLabel eyebrow="Your fieldbook">
            {t.farmer.recent}
          </SectionLabel>
          <div className="divide-y divide-[hsl(var(--border))] border-y border-[hsl(var(--border))]">
            {scansLoading && (
              <div className="py-6 text-sm text-[hsl(var(--muted-foreground))]">
                Loading your saved scans…
              </div>
            )}
            {scansError && (
              <div className="py-6 text-sm text-[hsl(4_48%_36%)]">
                Scan history is unavailable. Check that the local API is
                running.
              </div>
            )}
            {!scansLoading && !scansError && savedScans.length === 0 && (
              <div className="py-6">
                <div className="font-bold">No scans saved yet</div>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  Your first completed crop submission will appear here.
                </p>
              </div>
            )}
            {savedScans.slice(0, 5).map((scan) => (
              <Link
                href={`/farmer/history/${scan.id}`}
                key={scan.id}
                className="flex items-center justify-between gap-3 py-4 hover:bg-[hsl(var(--muted)/_.35)]"
                data-testid={`link-recent-scan-${scan.id}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center border border-[hsl(var(--border))] bg-[hsl(112_22%_90%)] text-[hsl(var(--primary))]">
                    <Leaf size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">
                      {`${scan.crop} scan`}
                    </div>
                    <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                      {scanSummary(scan)} · {formatScanDate(scan.createdAt, locale)}
                    </div>
                  </div>
                </div>
                <ScanStatusBadge status={scan.status} />
              </Link>
            ))}
          </div>
        </div>
        <Box className="h-fit">
          <SectionLabel eyebrow="Community alert">
            A pattern worth watching
          </SectionLabel>
          <div className="flex gap-3">
            <ShieldAlert
              className="mt-1 shrink-0 text-[hsl(var(--accent-foreground))]"
              size={20}
            />
            <div>
              <p className="text-sm leading-6">
                Rice leaf symptoms are clustering across 14 farms near Cuttack.
                This is a regional signal, not a diagnosis of your crop.
              </p>
              <Link
                href="/insights"
                className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[hsl(var(--primary))]"
                data-testid="link-community-alert"
              >
                See the district view <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </Box>
      </div>
    </AppShell>
  )}</LocalizedContent>;
}

export function ScanJourney({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  const t = locales.en;
  const hasMobileCamera = useMobileCamera();
  const { profile } = useAccount();
  const [step, setStep] = useState(1);
  const [crop, setCrop] = useState<Crop>(() => profile.crops[0] as Crop || "Rice");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [locationState, setLocationState] = useState<
    "idle" | "loading" | "success" | "denied" | "unavailable"
  >("idle");
  const [location, setLocation] = useState<typeof sampleLocation | null>(null);
  const [affectedPart, setAffectedPart] = useState("Leaf");
  const [growthStage, setGrowthStage] = useState("Vegetative");
  const [affectedArea, setAffectedArea] = useState("One plant");
  const [nearbySymptoms, setNearbySymptoms] = useState("Not sure");
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");
  const [analysis, setAnalysis] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [savedScanId, setSavedScanId] = useState<string | null>(null);
  const [scanWeather, setScanWeather] = useState<DisplayWeather | null>(null);
  const [result, setResult] = useState<ScanAnalysisResult | null>(null);
  const [explanation, setExplanation] = useState<AdvisoryExplanation | null>(
    null,
  );
  const [advisoryContext, setAdvisoryContext] = useState<AdvisoryContext | null>(null);

  useEffect(() => {
    if (!result || !advisoryContext || advisoryContext.locale === locale) return;
    let active = true;
    setExplanation(null);
    const nextContext = { ...advisoryContext, locale };
    requestAdvisoryExplanation(result, nextContext).then(next => {
      if (active) {
        setExplanation(next);
        setAdvisoryContext(nextContext);
      }
    });
    return () => { active = false; };
  }, [locale, result, advisoryContext]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(photo);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photo]);

  const choosePhoto = (file?: File) => {
    if (!file) return;
    if (!(["image/jpeg", "image/png"] as string[]).includes(file.type)) {
      setPhoto(null);
      setPhotoError("Choose a JPG or PNG image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhoto(null);
      setPhotoError("This image is larger than 10 MB. Choose a smaller photo.");
      return;
    }
    setPhoto(file);
    setPhotoError(null);
    setSubmissionError(null);
  };

  const locate = async () => {
    setLocation(null);
    setLocationState("loading");
    try {
      const detected = await requestLocation();
      setLocation(detected);
      setLocationState("success");
    } catch (error) {
      setLocationState(
        error instanceof Error && error.message === "denied"
          ? "denied"
          : "unavailable",
      );
    }
  };

  const runAnalysis = async () => {
    if (!photo || !location) return;
    setAnalysis(true);
    setSubmissionError(null);
    setExplanation(null);

    try {
      const areaPercentages: Record<string, number> = {
        "One plant": 5,
        "A few plants": 20,
        "More than one row": 50,
      };
      const nearbyPlantsAffected =
        nearbySymptoms === "Not sure"
          ? undefined
          : nearbySymptoms === "Yes, nearby plants too";
      const symptomList = symptoms
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const scan = await createScanRecord({
        crop,
        symptoms: symptomList,
        affectedPart,
        growthStage,
        affectedAreaPercentage: areaPercentages[affectedArea],
        nearbyPlantsAffected,
        notes: notes.trim() || undefined,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      await uploadCropImage(scan.id, photo);
      window.dispatchEvent(new Event("wellfarm:scans-changed"));
      const weatherContext = await weatherService.getCurrentWeather(
        location.latitude,
        location.longitude,
      );
      const diagnosis = await analyzeCropScan(scan.id);
      const context: AdvisoryContext = {
        symptoms: symptomList,
        affectedPart,
        affectedAreaPercentage: areaPercentages[affectedArea],
        nearbyPlantsAffected,
        weather: weatherContext,
        locale,
      };
      const advisory = await requestAdvisoryExplanation(diagnosis, context);

      setSavedScanId(scan.id);
      setScanWeather(weatherContext);
      setResult(diagnosis);
      setExplanation(advisory);
      setAdvisoryContext(context);
      setStep(4);
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Wellfarm could not complete this scan. Check that the local API is running, then try again.",
      );
    } finally {
      setAnalysis(false);
    }
  };

  const retryWithAnotherPhoto = () => {
    setPhoto(null);
    setResult(null);
    setExplanation(null);
    setAdvisoryContext(null);
    setSavedScanId(null);
    setScanWeather(null);
    setSubmissionError(null);
    setStep(1);
  };
  return <LocalizedContent>{(
    <AppShell role="farmer" locale={locale} setLocale={setLocale}>
      <PageHeader
        eyebrow={`Farmer scan / 0${step}`}
        back={step > 1 ? (
          <button type="button" data-testid="button-scan-back" disabled={analysis} onClick={() => setStep(step - 1)} className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))] disabled:opacity-50">
            <ArrowLeft size={16} aria-hidden="true" />Back
          </button>
        ) : undefined}
        title={result ? t.farmer.result : t.farmer.scanTitle}
      >
        <Link
          href="/farmer"
          className="text-sm font-bold text-[hsl(var(--primary))]"
          data-testid="link-exit-scan"
        >
          Exit scan
        </Link>
      </PageHeader>
      <div className="mx-auto max-w-3xl">
        <div className="mb-9 flex items-center gap-2">
          {["Photo", "Location", "Crop details", "Result"].map((s, i) => (
            <div key={s} className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${step > i + 1 ? "bg-[hsl(var(--primary))] text-[hsl(var(--card))]" : step === i + 1 ? "bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]" : "border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"}`}
              >
                {step > i + 1 ? <Check size={14} /> : i + 1}
              </div>
              <span className="hidden truncate text-xs font-semibold sm:block">
                {s}
              </span>
              {i < 3 && <div className="h-px flex-1 bg-[hsl(var(--border))]" />}
            </div>
          ))}
        </div>
        {step === 1 && (
          <Box>
            <div className="flex min-h-[270px] flex-col items-center justify-center border-2 border-dashed border-[hsl(var(--border))] bg-[hsl(40_24%_92%)] p-6 text-center">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Selected affected crop preview"
                  className="h-48 w-full max-w-md rounded-lg border border-[hsl(var(--border))] object-contain bg-[hsl(var(--card))]"
                  data-testid="image-crop-preview"
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
                  <Upload size={23} />
                </div>
              )}
              <h2 className="mt-5 text-xl font-bold">
                Upload one clear leaf or plant photo
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Keep the affected part in focus. JPG or PNG, up to 10 MB. Avoid
                backlit or heavily blurred images.
              </p>
              {hasMobileCamera && (
                <label
                  className="mt-6 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 text-sm font-bold text-[hsl(var(--card))]"
                  data-testid="label-take-photo"
                >
                  <Camera size={16} />
                  {photo ? "Retake photo" : "Take a photo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    capture="environment"
                    className="sr-only"
                    data-testid="input-camera-photo"
                    onClick={(event) => {
                      event.currentTarget.value = "";
                    }}
                    onChange={(event) => choosePhoto(event.target.files?.[0])}
                  />
                </label>
              )}
              <label
                className={`${
                  hasMobileCamera
                    ? "mt-3 border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]"
                    : "mt-6 bg-[hsl(var(--primary))] text-[hsl(var(--card))]"
                } inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-bold`}
                data-testid="label-upload-photo"
              >
                <Upload size={16} />
                {hasMobileCamera
                  ? photo
                    ? "Choose another from gallery"
                    : "Choose from gallery"
                  : photo
                    ? "Replace photo"
                    : "Choose photo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  data-testid="input-crop-photo"
                  onClick={(event) => {
                    event.currentTarget.value = "";
                  }}
                  onChange={(event) => choosePhoto(event.target.files?.[0])}
                />
              </label>
              {photoError && (
                <div
                  className="mt-4 text-sm font-semibold text-[hsl(4_48%_36%)]"
                  role="alert"
                  data-testid="error-crop-photo"
                >
                  {photoError}
                </div>
              )}
              {photo && (
                <div className="mt-4 text-xs font-semibold text-[hsl(var(--primary))]">
                  {photo.name} · image quality check ready
                </div>
              )}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="border border-[hsl(var(--border))] p-4">
                <div className="text-xs font-bold uppercase tracking-wider">
                  Good photo
                </div>
                <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                  One plant part, daylight, close enough to see spots.
                </p>
              </div>
              <div className="border border-[hsl(var(--border))] p-4 opacity-70">
                <div className="text-xs font-bold uppercase tracking-wider">
                  Avoid
                </div>
                <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                  Dark, distant, wet lens or several crops in one frame.
                </p>
              </div>
            </div>
            <div className="mt-7 flex justify-end">
              <Button
                onClick={() => setStep(2)}
                testId="button-photo-continue"
                disabled={!photo}
              >
                Continue to location <ChevronRight size={16} />
              </Button>
            </div>
          </Box>
        )}
        {step === 2 && (
          <Box>
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
                <MapPin size={27} />
              </div>
              <h2 className="mt-5 text-2xl font-bold">
                Use an approximate location
              </h2>
              <p className="mt-3 leading-7 text-[hsl(var(--muted-foreground))]">
                Location helps Wellfarm compare weather and nearby patterns.
                Exact farm coordinates are never shown in regional insights.
              </p>
              {locationState === "idle" && (
                <Button onClick={locate} testId="button-request-location">
                  <MapPin size={16} />
                  Allow browser location
                </Button>
              )}
              {locationState === "loading" && (
                <div className="mt-7 text-sm font-semibold text-[hsl(var(--muted-foreground))]">
                  Requesting location permission…
                </div>
              )}
              {locationState === "success" && (
                <div className="mt-7 text-left">
                  <div className="border border-[hsl(112_22%_54%)] bg-[hsl(112_22%_81%/_.45)] p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]">
                      <Check size={16} />
                      Approximate area detected
                    </div>
                    <div className="mt-1 text-sm">
                      {location?.label ?? "Detected area (approx.)"} · location
                      accuracy kept private
                    </div>
                    {location?.attribution && (
                      <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                        {location.attribution}
                      </div>
                    )}
                  </div>
                  {location && (
                    <WellfarmMap
                      ariaLabel={`Your detected location near ${location.label}`}
                      className="h-[240px] sm:h-[280px]"
                      center={[location.latitude, location.longitude]}
                      zoom={11}
                      approximateRadiusMeters={1200}
                      points={[
                        {
                          latitude: location.latitude,
                          longitude: location.longitude,
                          label: location.label,
                          detail: "Approximate private location",
                        },
                      ]}
                    />
                  )}
                </div>
              )}
              {(locationState === "denied" ||
                locationState === "unavailable") && (
                <div className="mt-7 border border-[hsl(39_77%_55%)] bg-[hsl(39_77%_66%/_.18)] p-4 text-left">
                  <div className="font-bold">
                    {locationState === "denied"
                      ? "Location permission is blocked"
                      : "Your location could not be detected"}
                  </div>
                  <p className="mt-1 text-sm leading-6">
                    {locationState === "denied"
                      ? "Allow location in this site's browser settings, then try again."
                      : "Make sure location services are enabled and try again."}
                  </p>
                  <Button
                    onClick={locate}
                    variant="outline"
                    testId="button-retry-location"
                  >
                    <MapPin size={16} /> Retry location
                  </Button>
                </div>
              )}
              <div className="mt-8 flex justify-between">
                <Button
                  onClick={() => setStep(1)}
                  variant="quiet"
                  testId="button-location-back"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  testId="button-location-continue"
                  disabled={locationState !== "success"}
                >
                  Continue <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </Box>
        )}
        {step === 3 && !analysis && (
          <Box>
            <h2 className="text-xl font-bold">Tell us about the crop</h2>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              A few details help keep the indication grounded.
            </p>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Crop
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value as Crop)}
                  className="mt-2 h-11 w-full border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3"
                  data-testid="select-crop"
                >
                  {crops.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Affected plant part
                <select
                  value={affectedPart}
                  onChange={(e) => setAffectedPart(e.target.value)}
                  className="mt-2 h-11 w-full border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3"
                  data-testid="select-plant-part"
                >
                  <option>Leaf</option>
                  <option>Stem</option>
                  <option>Fruit</option>
                  <option>Whole plant</option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                Growth stage
                <select
                  value={growthStage}
                  onChange={(e) => setGrowthStage(e.target.value)}
                  className="mt-2 h-11 w-full border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3"
                  data-testid="select-growth-stage"
                >
                  <option>Vegetative</option>
                  <option>Flowering</option>
                  <option>Fruit / grain fill</option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                Approx. affected area
                <select
                  value={affectedArea}
                  onChange={(e) => setAffectedArea(e.target.value)}
                  className="mt-2 h-11 w-full border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3"
                  data-testid="select-affected-area"
                >
                  <option>One plant</option>
                  <option>A few plants</option>
                  <option>More than one row</option>
                </select>
              </label>
            </div>
            <label className="mt-5 block text-sm font-semibold">
              Are nearby plants showing similar symptoms?
              <select
                value={nearbySymptoms}
                onChange={(e) => setNearbySymptoms(e.target.value)}
                className="mt-2 h-11 w-full border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3"
                data-testid="select-nearby-symptoms"
              >
                <option>Yes, nearby plants too</option>
                <option>No, only this plant</option>
                <option>Not sure</option>
              </select>
            </label>
            <label className="mt-5 block text-sm font-semibold">
              Visible symptoms
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="mt-2 min-h-20 w-full border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-3 font-normal"
                placeholder="Yellow edges, brown spots, curling… separate multiple symptoms with commas"
                data-testid="textarea-visible-symptoms"
              />
            </label>
            <label className="mt-5 block text-sm font-semibold">
              Optional notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2 min-h-24 w-full border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-3 font-normal"
                placeholder="Anything else you noticed?"
                data-testid="textarea-scan-notes"
              />
            </label>
            <div className="mt-7 flex justify-between">
              <Button
                onClick={() => setStep(2)}
                variant="quiet"
                testId="button-details-back"
              >
                Back
              </Button>
              <Button
                onClick={runAnalysis}
                testId="button-start-analysis"
                disabled={analysis}
              >
                {t.farmer.analyze} <Sparkles size={16} />
              </Button>
            </div>
            {submissionError && (
              <div
                className="mt-5 border border-[hsl(4_48%_55%)] bg-[hsl(4_48%_44%/_.08)] p-4 text-sm text-[hsl(4_48%_36%)]"
                role="alert"
              >
                {submissionError}
              </div>
            )}
          </Box>
        )}
        {analysis && (
          <Box>
            <div className="mx-auto max-w-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
                    Analysis in progress
                  </div>
                  <h2 className="mt-2 text-2xl font-bold">
                    Reading the field signal
                  </h2>
                </div>
                <Clock3 className="text-[hsl(var(--primary))]" />
              </div>
              <div className="mt-8 space-y-5">
                {[
                  "Image quality check · preparing photograph",
                  `Crop compatibility · ${crop.toLowerCase()} head selected`,
                  "Visual diagnosis · comparing leaf patterns",
                  "Weather retrieval · humidity and rainfall context",
                  `Regional context · ${location?.label ?? "location available"}`,
                  "Plain-language guidance · preparing safe explanation",
                ].map((label, i) => (
                  <div key={label}>
                    <div className="flex items-center gap-3 text-sm">
                      <div
                        className={`grid h-6 w-6 place-items-center rounded-full ${i < 3 ? "bg-[hsl(var(--primary))] text-[hsl(var(--card))]" : "border border-[hsl(var(--border))]"}`}
                      >
                        {i < 3 ? (
                          <Check size={13} />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
                        )}
                      </div>
                      {label}
                      <span className="ml-auto font-mono text-[10px] text-[hsl(var(--muted-foreground))]">
                        {i < 3 ? "done" : "working"}
                      </span>
                    </div>
                    <div className="ml-9 mt-2 h-1 overflow-hidden bg-[hsl(var(--muted))]">
                      <div
                        className={`h-full bg-[hsl(var(--primary))] ${i > 2 ? "wf-bar w-full" : "w-full"}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Box>
        )}
        {step === 4 && result && (
          <ScanResultCard
            result={result}
            explanation={explanation ?? undefined}
            scanId={savedScanId}
            imageUrl={photoPreview}
            locationLabel={location?.label ?? "Approximate location unavailable"}
            weatherContext={scanWeather}
            onRetry={retryWithAnotherPhoto}
          />
        )}
      </div>
    </AppShell>
  )}</LocalizedContent>;
}

export function FarmerHistory({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  const { id } = useParams();
  const [records, setRecords] = useState<Scan[]>([]);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [savedAnalysis, setSavedAnalysis] = useState<ScanAnalysisResult | null>(null);
  const [reportState, setReportState] = useState("loading");
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    setSelectedScan(null);
    setSavedAnalysis(null);
    setReportState("loading");
    if (id) fetch(`/api/scans/${encodeURIComponent(id)}/analysis`)
      .then(response => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error("Report unavailable");
        return response.json();
      })
      .then(result => { if (active) { setSavedAnalysis(result); setReportState(result ? "ready" : "missing"); } })
      .catch(() => { if (active) setReportState("error"); });

    const request = id ? getScanRecord(id) : listScanRecords();
    request
      .then((result) => {
        if (!active) return;
        if (Array.isArray(result)) setRecords(result);
        else setSelectedScan(result);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    setLocationLabel(null);
    if (!selectedScan) return;

    getApproximateLocationLabel(
      selectedScan.latitude,
      selectedScan.longitude,
    ).then((location) => {
      if (active) setLocationLabel(location.label);
    });

    return () => {
      active = false;
    };
  }, [selectedScan]);

  if (id) {
    return <LocalizedContent>{(
      <AppShell role="farmer" locale={locale} setLocale={setLocale}>
        <PageHeader
          eyebrow="Farmer fieldbook / saved scan"
          title={selectedScan ? `${selectedScan.crop} scan` : "Saved scan"}
        >
          <Button
            href="/farmer/history"
            variant="outline"
            testId="button-scan-detail-back"
          >
            Back to history
          </Button>
        </PageHeader>

        {loading && (
          <Box>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Loading saved scan…
            </p>
          </Box>
        )}
        {loadError && (
          <Box>
            <h2 className="font-bold">This scan could not be loaded</h2>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              The record may not exist, or the local API may not be running.
            </p>
          </Box>
        )}
        {selectedScan && (
          <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
            <Box className="h-fit">
              {selectedScan.imagePath ? (
                <img
                  src={selectedScan.imagePath}
                  alt={`Uploaded ${selectedScan.crop} crop`}
                  className="max-h-[520px] w-full rounded-lg bg-[hsl(var(--muted))] object-contain"
                  data-testid="image-saved-scan"
                />
              ) : (
                <div className="grid min-h-72 place-items-center border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/_.35)] text-center">
                  <div>
                    <Leaf
                      className="mx-auto text-[hsl(var(--primary))]"
                      size={30}
                    />
                    <p className="mt-3 text-sm font-semibold">
                      No image stored for this scan
                    </p>
                  </div>
                </div>
              )}
            </Box>

            <div className="space-y-5">
              {savedAnalysis && (
                <Box>
                  <h2 className="font-bold">Leading model indication</h2>
                  <p className="mt-2 text-sm">{savedAnalysis.summary}</p>
                  {savedAnalysis.candidates.map(candidate => (
                    <p key={candidate.condition} className="mt-3 flex justify-between gap-3 text-sm">
                      <span>{candidate.condition}</span><span>{Math.round(candidate.confidence * 100)}%</span>
                    </p>
                  ))}
                  <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">{savedAnalysis.limitations[0]}</p>
                </Box>
              )}
              <Box>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">
                      Saved API record
                    </div>
                    <h2 className="mt-2 text-2xl font-extrabold">
                      {selectedScan.crop}
                    </h2>
                    <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                      {selectedScan.id}
                    </p>
                  </div>
                  <ScanStatusBadge status={selectedScan.status} />
                </div>

                <div className="mt-6 grid gap-4 border-y border-[hsl(var(--border))] py-5 sm:grid-cols-2">
                  <Metric
                    label="Submitted"
                    value={formatScanDate(selectedScan.createdAt, locale)}
                  />
                  <Metric
                    label="Approximate area"
                    value={locationLabel ?? "Resolving area…"}
                  />
                  <Metric
                    label="Affected part"
                    value={selectedScan.affectedPart ?? "Not provided"}
                  />
                  <Metric
                    label="Growth stage"
                    value={selectedScan.growthStage ?? "Not provided"}
                  />
                  <Metric
                    label="Affected area"
                    value={
                      selectedScan.affectedAreaPercentage === undefined
                        ? "Not provided"
                        : `${selectedScan.affectedAreaPercentage}%`
                    }
                  />
                  <Metric
                    label="Nearby plants"
                    value={
                      selectedScan.nearbyPlantsAffected === undefined
                        ? "Not sure"
                        : selectedScan.nearbyPlantsAffected
                          ? "Also affected"
                          : "Not affected"
                    }
                  />
                </div>

                <div className="mt-5">
                  <div className="text-xs font-bold uppercase tracking-wider">
                    Visible symptoms
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    {selectedScan.symptoms?.join(", ") || "None provided"}
                  </p>
                </div>
                {selectedScan.notes && (
                  <div className="mt-5">
                    <div className="text-xs font-bold uppercase tracking-wider">
                      Farmer notes
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                      <span translate="no">{selectedScan.notes}</span>
                    </p>
                  </div>
                )}
              </Box>

              {!savedAnalysis && <Box className="bg-[hsl(39_77%_66%/_.12)]">
                <div className="flex gap-3">
                  <Info
                    className="mt-0.5 shrink-0 text-[hsl(26_44%_35%)]"
                    size={19}
                  />
                  <div>
                    <h3 className="font-bold">{reportState === "loading" ? "Loading saved report…" : reportState === "error" ? "Report could not be loaded" : "No analysis saved for this photo"}</h3>
                    <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                      {reportState === "error" ? "Your photo is saved. The report request failed; reload this page to retry." : reportState === "missing" ? "Your photo and crop details are saved, but analysis has not completed for this photo." : "Retrieving the model result for this scan."}
                    </p>
                  </div>
                </div>
              </Box>}
            </div>
          </div>
        )}
      </AppShell>
    )}</LocalizedContent>;
  }

  return <LocalizedContent>{(
    <AppShell role="farmer" locale={locale} setLocale={setLocale}>
      <PageHeader
        eyebrow="Farmer fieldbook / history"
        title="Your crop-health record"
      >
        <Button href="/farmer/scan" testId="button-history-new-scan">
          <Leaf size={16} />
          New scan
        </Button>
      </PageHeader>
      <Box>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="font-bold">All saved scans</div>
            <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Real records from the local Wellfarm API
            </div>
          </div>
          {!loading && !loadError && (
            <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
              {records.length} total
            </span>
          )}
        </div>

        {loading && (
          <div className="border-y border-[hsl(var(--border))] py-8 text-sm text-[hsl(var(--muted-foreground))]">
            Loading scan history…
          </div>
        )}
        {loadError && (
          <div className="border-y border-[hsl(var(--border))] py-8 text-sm text-[hsl(4_48%_36%)]">
            Scan history is unavailable. Check that the local API is running.
          </div>
        )}
        {!loading && !loadError && records.length === 0 && (
          <div className="border-y border-[hsl(var(--border))] py-8">
            <div className="font-bold">No saved scans yet</div>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Complete a crop scan and it will appear here automatically.
            </p>
          </div>
        )}
        {!loading && !loadError && records.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-y border-[hsl(var(--border))] font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                <tr>
                  <th className="py-3 pr-4">Scan</th>
                  <th className="py-3 pr-4">Crop / details</th>
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Image</th>
                  <th className="py-3">Record</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {records.map((scan) => (
                  <tr
                    key={scan.id}
                    className="hover:bg-[hsl(var(--muted)/_.35)]"
                  >
                    <td className="py-4 pr-4 font-mono text-xs">
                      {scan.id.slice(0, 8)}…
                    </td>
                    <td className="py-4 pr-4">
                      <div className="font-semibold">{scan.crop}</div>
                      <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                        {scanSummary(scan)}
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-xs text-[hsl(var(--muted-foreground))]">
                      {formatScanDate(scan.createdAt, locale)}
                    </td>
                    <td className="py-4 pr-4">
                      <ScanStatusBadge status={scan.status} />
                    </td>
                    <td className="py-4 pr-4 text-xs">
                      {scan.imagePath ? "Uploaded" : "Missing"}
                    </td>
                    <td className="py-4">
                      <Link
                        href={`/farmer/history/${scan.id}`}
                        className="font-bold text-[hsl(var(--primary))]"
                        data-testid={`link-history-detail-${scan.id}`}
                      >
                        Open <ArrowUpRight size={14} className="inline" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Box>
    </AppShell>
  )}</LocalizedContent>;
}
function InsightTabs({ active }: { active: string }) {
  return <LocalizedContent>{(
    <div className="mb-7 flex gap-1 overflow-x-auto border-b border-[hsl(var(--border))]">
      {[
        ["overview", "Overview", "/insights"],
        ["intelligence", "Patterns", "/insights/intelligence"],
      ].map(([key, label, href]) => (
        <Link
          href={href}
          key={key}
          className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold ${active === key ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]" : "border-transparent text-[hsl(var(--muted-foreground))]"}`}
          data-testid={`link-insight-tab-${key}`}
        >
          {label}
        </Link>
      ))}
    </div>
  )}</LocalizedContent>;
}
function IndiaSignalMap() {
  return <LocalizedContent>{(
    <WellfarmMap
      ariaLabel="Map of sample district crop-health signals across India"
      className="h-[390px] sm:h-[460px]"
      maxFitZoom={5}
      showLegend
      points={districtSummaries.map((district) => ({
        latitude: district.latitude,
        longitude: district.longitude,
        label: `${district.district}, ${district.state}`,
        detail: `${district.reports} reports · ${district.farms} farms · ${district.change}`,
        severity: district.severity,
      }))}
    />
  )}</LocalizedContent>;
}
export function RegionalOverview({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  return <LocalizedContent>{(
    <AppShell role="insights" locale={locale} setLocale={setLocale}>
      <PageHeader
        eyebrow="Regional insights / national overview"
        title="Regional crop-health intelligence"
      >
        <div className="flex flex-wrap gap-2">
          <Provenance kind="sample" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {locales.en.insights.updated}
          </span>
        </div>
      </PageHeader>
      <InsightTabs active="overview" />
      <div className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Reports"
          value={String(allIndiaSummary.reports)}
          note="last 30 days"
        />
        <Metric
          label="Reporting farms"
          value={String(allIndiaSummary.farms)}
          note="deduplicated"
        />
        <Metric
          label="High risk"
          value={String(allIndiaSummary.high)}
          note="needs review"
          tone="red"
        />
        <Metric
          label="Moderate"
          value={String(allIndiaSummary.moderate)}
          note="watch clusters"
          tone="amber"
        />
        <Metric
          label="Recent sample records"
          value={String(allIndiaSummary.pending)}
          note="across India"
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Box className="p-3">
          <div className="mb-3 flex items-center justify-between px-2">
            <div>
              <div className="font-bold">District signal map</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                Sample locations · select a marker for details
              </div>
            </div>
            <button
              className="flex items-center gap-2 border border-[hsl(var(--border))] px-3 py-2 text-xs"
              data-testid="button-map-filters"
            >
              <SlidersHorizontal size={14} />
              Filters
            </button>
          </div>
          <IndiaSignalMap />
        </Box>
        <Box>
          <SectionLabel eyebrow="Search the signal">
            Explore records
          </SectionLabel>
          <label className="flex h-11 items-center gap-2 border border-[hsl(var(--input))] px-3">
            <Search size={16} className="text-[hsl(var(--muted-foreground))]" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              placeholder="State, district or crop"
              data-testid="input-insight-search"
            />
          </label>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {[
              ["Crop", "All crops"],
              ["Condition", "All conditions"],
              ["Severity", "All levels"],
              ["Date range", "Last 30 days"],
              ["Data source", "All sources"],
            ].map(([label, val]) => (
              <label
                key={label}
                className="text-xs font-bold text-[hsl(var(--muted-foreground))]"
              >
                {label}
                <select
                  className="mt-1 h-10 w-full border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-2 font-normal text-[hsl(var(--foreground))]"
                  data-testid={`select-filter-${label.toLowerCase().replace(" ", "-")}`}
                >
                  <option>{val}</option>
                  <option>Moderate and high only</option>
                </select>
              </label>
            ))}
          </div>
          <div className="mt-6 border-t border-[hsl(var(--border))] pt-5 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
            <CircleHelp size={14} className="mb-2" />
            Severity combines reporting farms, growth, clustering, confidence,
            confirmations, weather suitability and duplicate filtering.
          </div>
        </Box>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Box>
          <SectionLabel eyebrow="Highest attention">
            Districts to review
          </SectionLabel>
          <div className="space-y-1">
            {districtSummaries.map((d) => (
              <Link
                href={`/insights/district/${d.district.toLowerCase()}`}
                key={d.district}
                className="flex items-center justify-between border-b border-[hsl(var(--border))] py-3 last:border-0"
                data-testid={`link-district-${d.district.toLowerCase()}`}
              >
                <div>
                  <div className="text-sm font-bold">{d.district}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">
                    {d.state} · {d.reports} reports · {d.farms} farms
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs">{d.change}</span>
                  <SeverityBadge severity={d.severity} small />
                </div>
              </Link>
            ))}
          </div>
        </Box>
        <Box>
          <SectionLabel eyebrow="30-day movement">Reports by week</SectionLabel>
          <MiniBar values={trend} />
          <div className="mt-4 flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
            <span>01 Mar</span>
            <span>31 Mar · 66 reports</span>
          </div>
          <div className="mt-6 border-t border-[hsl(var(--border))] pt-5 text-sm leading-6">
            <span className="font-bold text-[hsl(var(--primary))]">
              +31% in Cuttack
            </span>{" "}
            compared with the previous period. The rise is a regional signal and
            not proof of a single cause.
          </div>
        </Box>
      </div>
    </AppShell>
  )}</LocalizedContent>;
}

export function RegionalIntelligence({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  return <LocalizedContent>{(
    <AppShell role="insights" locale={locale} setLocale={setLocale}>
      <PageHeader
        eyebrow="Regional insights / pattern analysis"
        title="When weather and reports move together"
      >
        <Provenance kind="sample" />
      </PageHeader>
      <InsightTabs active="intelligence" />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Box>
          <div className="flex items-start justify-between">
            <SectionLabel eyebrow="Pattern signal">
              Coastal Odisha · rice
            </SectionLabel>
            <span className="font-mono text-xs text-[hsl(var(--primary))]">
              r = 0.61
            </span>
          </div>
          <div
            className="mt-2 grid grid-cols-12 items-end gap-2 border-b border-l border-[hsl(var(--border))] p-4"
            style={{ height: 220 }}
          >
            {trend.map((v, i) => (
              <div key={i} className="relative h-full">
                <div
                  className="absolute bottom-0 w-full bg-[hsl(var(--primary))]"
                  style={{ height: `${(v / 70) * 100}%` }}
                />
                <div
                  className="absolute bottom-0 w-1/2 translate-x-full bg-[hsl(var(--accent))]"
                  style={{ height: `${Math.max(12, ((v - 7) / 70) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-5 text-xs">
            <span className="flex items-center gap-2">
              <i className="h-2 w-2 bg-[hsl(var(--primary))]" />
              Reported scans
            </span>
            <span className="flex items-center gap-2">
              <i className="h-2 w-2 bg-[hsl(var(--accent))]" />
              Humidity / rain index
            </span>
          </div>
        </Box>
        <Box>
          <SectionLabel eyebrow="Read with care">
            Correlation, not causation
          </SectionLabel>
          <p className="text-sm leading-7 text-[hsl(var(--muted-foreground))]">
            This comparison uses 18 reports from 01–31 March and a weather index
            from the approximate district centroid. It helps decide where to
            look next; it does not prove that weather caused the condition.
          </p>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between border-b border-[hsl(var(--border))] pb-3">
              <span>Sample size</span>
              <b>18 reports · 14 farms</b>
            </div>
            <div className="flex justify-between border-b border-[hsl(var(--border))] pb-3">
              <span>Window</span>
              <b>31 days</b>
            </div>
            <div className="flex justify-between">
              <span>Signal</span>
              <b className="text-[hsl(var(--primary))]">Investigate</b>
            </div>
          </div>
        </Box>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {[
          [
            "Hotspot clusters",
            "3 clusters exceed the district baseline.",
            MapPin,
          ],
          ["Anomaly indicator", "+2.4σ report growth this week.", BarChart3],
          [
            "Weather signature",
            "Humidity stayed above 75% for 5 days.",
            CloudRain,
          ],
        ].map(([title, text, Icon]) => (
          <Box key={title as string}>
            <Icon size={19} className="text-[hsl(var(--primary))]" />
            <h3 className="mt-6 font-bold">{title as string}</h3>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              {text as string}
            </p>
          </Box>
        ))}
      </div>
      <Box className="mt-5">
          <SectionLabel eyebrow="Model engineering">
          Offline evaluation and cache
        </SectionLabel>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="border border-[hsl(var(--border))] p-4">
            <div className="flex items-center justify-between">
              <b>Sample evaluation snapshot</b>
              <Provenance kind="sample" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric
                label="Reviewed images"
                value={String(modelEvaluation.reviewed)}
              />
              <Metric label="Changed" value={String(modelEvaluation.changed)} />
              <Metric label="Skipped" value="1,284" />
              <Metric label="Candidate" value={modelEvaluation.candidate} />
            </div>
            <div className="mt-5 text-xs text-[hsl(var(--muted-foreground))]">
              Evaluated {modelEvaluation.evaluated} · {modelEvaluation.status}
            </div>
          </div>
          <div className="border border-[hsl(var(--border))] p-4">
            <div className="flex items-center justify-between">
              <b>Inference-cache experiment</b>
              <Provenance kind="cache" />
            </div>
            {cacheEntries.map((entry) => (
              <div
                key={entry.condition}
                className="mt-4 border-t border-[hsl(var(--border))] pt-4"
              >
                <div className="text-sm font-bold">{entry.condition}</div>
                <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                  <span>
                    Full inference <b className="block text-sm">{entry.full}</b>
                  </span>
                  <span>
                    Cache match{" "}
                    <b className="block text-sm text-[hsl(var(--primary))]">
                      {entry.cached}
                    </b>
                  </span>
                  <span>
                    Validations{" "}
                    <b className="block text-sm">{entry.validations}</b>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Box>
    </AppShell>
  )}</LocalizedContent>;
}

export function RegionalDistrict({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  const { id } = useParams();
  const district =
    districtSummaries.find((d) => d.district.toLowerCase() === id) ??
    districtSummaries[0];
  return <LocalizedContent>{(
    <AppShell role="insights" locale={locale} setLocale={setLocale}>
      <PageHeader
        eyebrow={`Regional insights / district · ${district.state}`}
        title={`${district.district} district brief`}
      >
        <Button
          href="/insights"
          variant="outline"
          testId="button-district-back"
        >
          Back to national view
        </Button>
      </PageHeader>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Current severity"
          value={
            district.severity[0].toUpperCase() + district.severity.slice(1)
          }
          tone={
            district.severity === "high"
              ? "red"
              : district.severity === "moderate"
                ? "amber"
                : "default"
          }
        />
        <Metric
          label="Reports"
          value={String(district.reports)}
          note="last 30 days"
        />
        <Metric
          label="Unique farms"
          value={String(district.farms)}
          note="duplicate filtered"
        />
        <Metric label="Change" value={district.change} note="previous period" />
      </div>
      <Box className="mt-6 p-3">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3 px-2">
          <div>
            <div className="font-bold">Where this signal is located</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              District-centre reference · sample regional record
            </div>
          </div>
          <Provenance kind="sample">Sample regional data</Provenance>
        </div>
        <WellfarmMap
          ariaLabel={`Map showing ${district.district} district in ${district.state}`}
          className="h-[300px] sm:h-[380px]"
          center={[district.latitude, district.longitude]}
          zoom={9}
          approximateRadiusMeters={18000}
          points={[
            {
              latitude: district.latitude,
              longitude: district.longitude,
              label: `${district.district}, ${district.state}`,
              detail: `${district.reports} reports · ${district.severity} severity`,
              severity: district.severity,
            },
          ]}
        />
      </Box>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Box>
          <SectionLabel eyebrow="District pattern">
            Seven and thirty-day trend
          </SectionLabel>
          <MiniBar values={[4, 6, 5, 8, 7, 11, 9, 13, 12, 15, 14, 18]} />
          <div className="mt-4 flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
            <span>01 Mar</span>
            <span>31 Mar</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[hsl(var(--border))] pt-5 text-sm">
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                Reviewed sample records
              </div>
              <b>6 · 33%</b>
            </div>
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                Recent records
              </div>
              <b>4</b>
            </div>
          </div>
        </Box>
        <Box>
          <SectionLabel eyebrow="Crop / condition breakdown">
            What is being reported
          </SectionLabel>
          {[
            ["Rice bacterial leaf blight", 48],
            ["Rice brown spot", 26],
            ["Healthy / other", 26],
          ].map(([label, value]) => (
            <div key={label as string} className="mb-5">
              <div className="flex justify-between text-sm">
                <span>{label as string}</span>
                <b>{value as number}%</b>
              </div>
              <div className="mt-2 h-2 bg-[hsl(var(--muted))]">
                <div
                  className="h-full bg-[hsl(var(--primary))]"
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
          <div className="mt-7 border-t border-[hsl(var(--border))] pt-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Weather pattern: 78% humidity and 7.4 mm rain today. Suitable
            conditions are a reason to investigate, not proof of causation.
          </div>
        </Box>
      </div>
      <Box className="mt-5">
        <SectionLabel eyebrow="Suggested exploration">
          Next practical steps
        </SectionLabel>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            "Compare the cluster with the previous period",
            "Review the contributing sample records",
            "Recheck the trend after the next rainfall event",
          ].map((a, i) => (
            <div
              key={a}
              className="border-l-2 border-[hsl(var(--primary))] p-3"
            >
              <span className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">
                0{i + 1}
              </span>
              <p className="mt-2 text-sm font-semibold">{a}</p>
            </div>
          ))}
        </div>
      </Box>
    </AppShell>
  )}</LocalizedContent>;
}
export function Transparency({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  const badges = [
    {
      kind: "live" as const,
      title: "Live weather",
      text: "Fetched from Open-Meteo when permission, network and coordinates are available. Otherwise the screen clearly identifies sample weather.",
    },
    {
      kind: "model" as const,
      title: "Vision model",
      text: "A ranked visual indication with uncertainty. It is not an independently confirmed diagnosis and should not drive chemical treatment alone.",
    },
    {
      kind: "sample" as const,
      title: "Sample regional data",
      text: "Deterministic non-user records support maps and trend exploration. They are not a live surveillance feed.",
    },
    {
      kind: "local" as const,
      title: "Local scan records",
      text: "Scans saved through the local API remain in the user's fieldbook. Wellfarm does not submit them to another organization.",
    },
  ];
  return <LocalizedContent>{(
    <div className="min-h-[100dvh]">
      <PublicNav locale={locale} setLocale={setLocale} />
      <main className="mx-auto max-w-[1100px] px-5 py-14 lg:px-8">
        <PageHeader
          eyebrow="Wellfarm / data transparency"
          title="A clear line between live, model-generated, local and sample data."
        >
          <Button
            href="/workspaces"
            variant="outline"
            testId="button-transparency-roles"
          >
            Open Wellfarm <ArrowRight size={16} />
          </Button>
        </PageHeader>
        <div className="grid gap-3 md:grid-cols-2">
          {badges.map((badge) => (
            <Box key={badge.title}>
              <Provenance kind={badge.kind} />
              <h2 className="mt-6 text-lg font-bold">{badge.title}</h2>
              <p className="mt-2 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                {badge.text}
              </p>
            </Box>
          ))}
        </div>
        <Box className="mt-8">
          <SectionLabel eyebrow="Privacy by default">
            What each workspace can see
          </SectionLabel>
          <div className="grid gap-5 md:grid-cols-2">
            {[
              [
                "Farmer view",
                "Your crop photo, approximate area and advisory.",
              ],
              [
                "Regional insights",
                "Aggregated counts, trends and patterns across farms.",
              ],
            ].map(([title, text]) => (
              <div
                key={title}
                className="border-l-2 border-[hsl(var(--primary))] pl-4"
              >
                <h3 className="font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </Box>
        <Box className="mt-8">
          <SectionLabel eyebrow="Adapter notes">
            Designed to be replaced, not disguised
          </SectionLabel>
          <p className="max-w-3xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">
            Weather, crop analysis, history and regional calculations sit behind
            replaceable service adapters. Stable sample fixtures keep analytical
            screens useful without implying an external data partnership.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="border border-[hsl(var(--border))] px-3 py-2 font-mono text-[10px]">
              Open-Meteo adapter
            </span>
            <span className="border border-[hsl(var(--border))] px-3 py-2 font-mono text-[10px]">
              Deterministic mock service
            </span>
            <span className="border border-[hsl(var(--border))] px-3 py-2 font-mono text-[10px]">
              Approximate geometry fallback
            </span>
          </div>
        </Box>
      </main>
    </div>
  )}</LocalizedContent>;
}
