import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Crop } from "@workspace/api-client-react";
import { Link, useLocation, useParams } from "wouter";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  CloudRain,
  Filter,
  FlaskConical,
  History,
  Info,
  Leaf,
  MapPin,
  Microscope,
  Play,
  Printer,
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
  centers,
  crops,
  districtSummaries,
  mapStates,
  recentScans,
  referrals,
  report,
  retraining,
  scans,
  trend,
  weather,
  type Severity,
} from "@/data/mock";
import {
  analyzeCropScan,
  createScanRecord,
  demoLocation,
  requestLocation,
  uploadCropImage,
  weatherService,
  type DisplayWeather,
} from "@/services/adapters";
import { Brand } from "@/components/Brand";
import { AppShell, LanguageSelect, PublicNav } from "@/components/AppShell";
import {
  MiniBar,
  Provenance,
  SectionLabel,
  SeverityBadge,
} from "@/components/Status";
import { languageNames, locales, type LocaleKey } from "@/i18n/locales";

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
        "This control is a prototype preview. The adapter is ready for a production data source.",
      ));
  return href ? (
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
  );
};
const PageHeader = ({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) => (
  <div className="mb-8 flex flex-col gap-5 border-b border-[hsl(var(--border))] pb-7 md:flex-row md:items-end md:justify-between">
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
        {eyebrow}
      </div>
      <h1 className="max-w-3xl text-3xl font-extrabold tracking-[-.04em] text-[hsl(var(--foreground))] md:text-4xl">
        {title}
      </h1>
    </div>
    {children}
  </div>
);
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
}) => (
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
);
const Box = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <section
    className={`border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm ${className}`}
  >
    {children}
  </section>
);

export function PublicHome({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  const t = locales[locale];
  return (
    <div className="wf-noise min-h-[100dvh]">
      <PublicNav locale={locale} setLocale={setLocale} />
      <section className="mx-auto grid max-w-[1240px] gap-10 px-5 pb-20 pt-14 md:pt-20 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:px-8 lg:pb-28">
        <div className="wf-enter">
          <div className="mb-6 inline-flex items-center gap-2 border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 font-mono text-[10px] uppercase tracking-[.14em] text-[hsl(var(--primary))]">
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />
            SIH26131 · field intelligence prototype
          </div>
          <h1 className="max-w-[680px] text-5xl font-extrabold leading-[.98] tracking-[-.065em] text-[hsl(var(--primary))] md:text-7xl">
            A crop photo is the start of a{" "}
            <span className="text-[hsl(var(--foreground))]">
              regional response.
            </span>
          </h1>
          <p className="mt-7 max-w-[560px] text-lg leading-8 text-[hsl(var(--muted-foreground))]">
            Wellfarm connects an individual farmer’s early signal to a verified,
            privacy-aware view of crop health across India.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/farmer" testId="button-hero-scan">
              <Leaf size={17} />
              {t.actions.scan}
            </Button>
            <Button
              href="/officials"
              variant="outline"
              testId="button-hero-dashboard"
            >
              View outbreak dashboard <ArrowUpRight size={16} />
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            <Provenance kind="model" />
            <Provenance kind="demo" />
            <Provenance kind="verified" />
          </div>
        </div>
        <div className="wf-enter wf-delay-2 relative border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-3 pb-3">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">
                Live product preview
              </div>
              <div className="mt-1 text-sm font-bold">
                Coastal Odisha crop watch
              </div>
            </div>
            <Provenance kind="demo" />
          </div>
          <div className="relative mt-3 h-[310px] overflow-hidden bg-[hsl(112_22%_90%)]">
            <div className="absolute inset-0 opacity-30 wf-grid-paper" />
            <div className="absolute left-[16%] top-[20%] h-32 w-40 rotate-12 border-2 border-[hsl(var(--primary)/_.3)] bg-[hsl(112_22%_81%/_.7)]" />
            <div className="absolute left-[45%] top-[28%] h-40 w-56 -rotate-6 border-2 border-[hsl(var(--primary)/_.3)] bg-[hsl(112_22%_81%/_.7)]" />
            <div className="absolute left-[34%] top-[61%] h-28 w-44 rotate-3 border-2 border-[hsl(var(--primary)/_.3)] bg-[hsl(112_22%_81%/_.7)]" />
            {districtSummaries.slice(0, 4).map((d) => (
              <div
                key={d.district}
                className="wf-map-dot absolute"
                style={{ left: `${d.x}%`, top: `${d.y}%` }}
              >
                <span
                  className={`block h-4 w-4 rounded-full border-4 border-[hsl(var(--card))] ${d.severity === "high" ? "bg-[hsl(4_48%_44%)]" : d.severity === "moderate" ? "bg-[hsl(var(--accent))]" : "bg-[hsl(var(--primary))]"}`}
                />
                <span className="absolute left-5 top-0 whitespace-nowrap text-[10px] font-bold">
                  {d.district}
                </span>
              </div>
            ))}
            <div className="absolute bottom-3 left-3 border border-[hsl(var(--border))] bg-[hsl(var(--card)/_.9)] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Cuttack cluster
              </div>
              <div className="mt-1 text-lg font-extrabold">
                18 reports · moderate
              </div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                14 unique farms · +31% this period
              </div>
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
              ["03", "Warn", "Patterns are grouped by district."],
              ["04", "Coordinate", "Officials see where support is needed."],
              ["05", "Verify", "Field teams add human evidence."],
              ["06", "Learn", "Verified records improve the next scan."],
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
          <SectionLabel eyebrow="Built for the response">
            Three desks, one shared record
          </SectionLabel>
          <p className="max-w-md leading-7 text-[hsl(var(--muted-foreground))]">
            The interface changes with the person using it, while the case
            record stays consistent from upload to verification.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            [
              "Farmers",
              "A calm next step, not a chemical prescription.",
              "/farmer",
            ],
            [
              "Officials",
              "A regional view with reasons behind severity.",
              "/officials",
            ],
            [
              "Field teams",
              "Compatible referrals and auditable verification.",
              "/lab",
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
              Every indication carries confidence, provenance and a clear
              referral path. Exact farm coordinates stay private in the official
              view.
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
        <span>SIH26131 · frontend-first demonstration · 2025</span>
        <Link
          href="/roles"
          className="font-bold text-[hsl(var(--primary))]"
          data-testid="link-footer-prototype"
        >
          Open the prototype
        </Link>
      </footer>
    </div>
  );
}

export function Roles({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  const t = locales[locale];
  const roles = [
    {
      title: t.nav.farmers,
      desc: "Scan a plant, understand the early indication, and choose a safe next step.",
      href: "/farmer",
      code: "01",
      icon: Leaf,
    },
    {
      title: t.nav.officials,
      desc: "Read national, state and district patterns without exposing farm coordinates.",
      href: "/officials",
      code: "02",
      icon: BarChart3,
    },
    {
      title: "Laboratory / field officer",
      desc: "Take an assignment from a compatible centre and return verified evidence.",
      href: "/lab",
      code: "03",
      icon: Microscope,
    },
    {
      title: t.nav.demo,
      desc: "A 4-minute guided journey from Cuttack scan to verified district signal.",
      href: "/demo",
      code: "04",
      icon: Play,
    },
  ];
  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--background))]">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-6 lg:px-8">
        <Brand />
        <LanguageSelect locale={locale} setLocale={setLocale} />
      </header>
      <main className="mx-auto max-w-[1080px] px-5 pb-20 pt-12 lg:px-8">
        <div className="max-w-xl">
          <div className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
            Wellfarm workspace
          </div>
          <h1 className="mt-3 text-4xl font-extrabold tracking-[-.05em] text-[hsl(var(--primary))] md:text-6xl">
            Choose the view you need.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[hsl(var(--muted-foreground))]">
            The same crop-health record moves through different desks. Pick a
            role to begin.
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
  );
}

export function FarmerHome({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  const t = locales[locale];
  const [fieldWeather, setFieldWeather] = useState<DisplayWeather>({
    ...weather,
    freshness: "demo",
  });

  useEffect(() => {
    let active = true;
    weatherService
      .getCurrentWeather(demoLocation.latitude, demoLocation.longitude)
      .then((nextWeather) => {
        if (active) setFieldWeather(nextWeather);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell role="farmer" locale={locale} setLocale={setLocale}>
      <PageHeader eyebrow="Farmer fieldbook / 01" title={t.farmer.hello}>
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
            <Provenance kind="demo" />
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
                fieldWeather.freshness === "demo"
                  ? "demo"
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
            {recentScans.map((scan) => (
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
                      {scan.condition}
                    </div>
                    <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                      {scan.crop} · {scan.date} · {scan.id}
                    </div>
                  </div>
                </div>
                <SeverityBadge severity={scan.severity} small />
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
                href="/officials"
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
  );
}

export function ScanJourney({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  const t = locales[locale];
  const [step, setStep] = useState(1);
  const [crop, setCrop] = useState<Crop>("Rice");
  const [photo, setPhoto] = useState<File | null>(null);
  const [locationState, setLocationState] = useState<
    "idle" | "loading" | "success" | "denied"
  >("idle");
  const [location, setLocation] = useState<typeof demoLocation | null>(null);
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
  const [result, setResult] = useState<{
    condition: string;
    confidence: number;
    severity: Severity;
  } | null>(null);

  const locate = async () => {
    setLocationState("loading");
    try {
      const detected = await requestLocation();
      setLocation(detected);
      setLocationState("success");
    } catch {
      setLocationState("denied");
    }
  };

  const useDemoLocation = () => {
    setLocation(demoLocation);
    setLocationState("success");
  };

  const runAnalysis = async () => {
    if (!photo || !location) return;
    setAnalysis(true);
    setSubmissionError(null);

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
      const scan = await createScanRecord({
        crop,
        symptoms: symptoms
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        affectedPart,
        growthStage,
        affectedAreaPercentage: areaPercentages[affectedArea],
        nearbyPlantsAffected,
        notes: notes.trim() || undefined,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      await uploadCropImage(scan.id, photo);
      const weatherContext = await weatherService.getCurrentWeather(
        location.latitude,
        location.longitude,
      );
      const diagnosis = await analyzeCropScan(crop);

      setSavedScanId(scan.id);
      setScanWeather(weatherContext);
      setResult(diagnosis);
      setStep(4);
    } catch {
      setSubmissionError(
        "Wellfarm could not save this scan. Check that the local API is running, then try again.",
      );
    } finally {
      setAnalysis(false);
    }
  };
  return (
    <AppShell role="farmer" locale={locale} setLocale={setLocale}>
      <PageHeader
        eyebrow={`Farmer scan / 0${step}`}
        title={result ? t.farmer.result : t.farmer.scanTitle}
      >
        <Link
          href="/farmer"
          className="text-sm font-bold text-[hsl(var(--primary))]"
          data-testid="link-exit-scan"
        >
          Save and exit
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
              <div className="grid h-14 w-14 place-items-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
                <Upload size={23} />
              </div>
              <h2 className="mt-5 text-xl font-bold">
                Upload one clear leaf or plant photo
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Keep the affected part in focus. JPG or PNG, up to 10 MB. Avoid
                backlit or heavily blurred images.
              </p>
              <label
                className="mt-6 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 text-sm font-bold text-[hsl(var(--card))]"
                data-testid="label-upload-photo"
              >
                <Upload size={16} />
                Choose photo
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  data-testid="input-crop-photo"
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                />
              </label>
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
                Exact farm coordinates are never shown to officials.
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
                <div className="mt-7 border border-[hsl(112_22%_54%)] bg-[hsl(112_22%_81%/_.45)] p-4 text-left">
                  <div className="flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]">
                    <Check size={16} />
                    Approximate area detected
                  </div>
                  <div className="mt-1 text-sm">
                    {location?.label ?? "Detected area (approx.)"} · location
                    accuracy kept private
                  </div>
                </div>
              )}
              {locationState === "denied" && (
                <div className="mt-7 border border-[hsl(39_77%_55%)] bg-[hsl(39_77%_66%/_.18)] p-4 text-left">
                  <div className="font-bold">
                    Location permission was not available
                  </div>
                  <p className="mt-1 text-sm leading-6">
                    You can still continue with a demo location. No precise
                    coordinates will be saved in this prototype.
                  </p>
                  <Button
                    onClick={useDemoLocation}
                    variant="outline"
                    testId="button-use-demo-location"
                  >
                    Use demo location · Cuttack
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
        {step === 3 && (
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
                  "Image quality check · clear enough to review",
                  "Crop compatibility · rice visual library matched",
                  "Visual diagnosis · comparing leaf patterns",
                  "Weather retrieval · humidity and rainfall context",
                  "Regional lookup · Cuttack cluster found",
                  "Solution cache · checking validated matches",
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
        {result && (
          <ResultCard
            result={result}
            scanId={savedScanId}
            weatherContext={scanWeather}
          />
        )}
      </div>
    </AppShell>
  );
}
function ResultCard({
  result,
  scanId,
  weatherContext,
}: {
  result: { condition: string; confidence: number; severity: Severity };
  scanId: string | null;
  weatherContext: DisplayWeather | null;
}) {
  return (
    <div className="space-y-5">
      <Box className="border-t-4 border-t-[hsl(var(--primary))]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
              Result · early indication
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">
              {result.condition}
            </h2>
          </div>
          <SeverityBadge severity={result.severity} />
        </div>
        <div className="mt-7 grid gap-5 border-y border-[hsl(var(--border))] py-5 sm:grid-cols-3">
          <Metric
            label="Model confidence"
            value={`${Math.round(result.confidence * 100)}%`}
            note="Not laboratory confirmed"
          />
          <Metric
            label="Image quality"
            value="Good"
            note="Suitable for review"
          />
          <Metric
            label="Model version"
            value="WF-Vision 0.8"
            note="Prototype model"
          />
        </div>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">
          The leaf pattern is visually consistent with bacterial leaf blight.
          Similar reports have been seen in the Cuttack cluster, but other
          causes remain possible and need expert review.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Provenance kind="model" />
          <Provenance kind="simulated" />
          {weatherContext && (
            <Provenance
              kind={
                weatherContext.freshness === "live"
                  ? "live"
                  : weatherContext.freshness === "cached"
                    ? "cache"
                    : "demo"
              }
            >
              {weatherContext.source}
            </Provenance>
          )}
        </div>
      </Box>
      <div className="grid gap-5 md:grid-cols-2">
        <Box>
          <h3 className="flex items-center gap-2 font-bold">
            <Check size={17} className="text-[hsl(var(--primary))]" />
            Safe immediate actions
          </h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            <li className="border-l-2 border-[hsl(var(--primary))] pl-3">
              Mark and observe affected plants separately.
            </li>
            <li className="border-l-2 border-[hsl(var(--primary))] pl-3">
              Take a second clear photo in daylight after checking nearby
              plants.
            </li>
            <li className="border-l-2 border-[hsl(var(--primary))] pl-3">
              Share the scan with an agricultural expert if symptoms spread.
            </li>
          </ul>
        </Box>
        <Box>
          <h3 className="flex items-center gap-2 font-bold">
            <ShieldAlert
              size={17}
              className="text-[hsl(var(--accent-foreground))]"
            />
            What to avoid
          </h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            <li className="border-l-2 border-[hsl(var(--accent))] pl-3">
              Do not treat this as a confirmed diagnosis.
            </li>
            <li className="border-l-2 border-[hsl(var(--accent))] pl-3">
              Do not apply a chemical product based only on this screen.
            </li>
            <li className="border-l-2 border-[hsl(var(--accent))] pl-3">
              Contact an expert when multiple plants are affected.
            </li>
          </ul>
        </Box>
      </div>
      <Box>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-bold">
              A verification centre is recommended
            </div>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Odisha Crop Health Centre · 18 km · rice disease microscopy and
              field visit.
            </p>
            <div className="mt-3 flex gap-2">
              <Provenance kind="sample" />
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                Selected by crop capability and approximate distance
              </span>
            </div>
          </div>
          <Button href="/farmer/referral" testId="button-view-referral">
            View referral <ArrowRight size={16} />
          </Button>
        </div>
      </Box>
      <Box className="bg-[hsl(112_22%_81%/_.3)]">
        <div className="flex gap-3">
          <BadgeCheck className="mt-1 text-[hsl(var(--primary))]" />
          <div>
            <h3 className="font-bold">Your contribution was recorded</h3>
            <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Record {scanId ?? "pending"} now contains the submitted crop
              details and image. It is grouped using an approximate area;
              officials see the pattern, not your farm location.
            </p>
          </div>
        </div>
      </Box>
    </div>
  );
}

export function FarmerHistory({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  return (
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
        <div className="mb-5 flex flex-wrap gap-2">
          <Button variant="outline" testId="button-history-filter">
            All scans <Filter size={14} />
          </Button>
          <Button variant="quiet" testId="button-history-reviewed">
            Reviewed
          </Button>
          <Button variant="quiet" testId="button-history-referred">
            Referred
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-y border-[hsl(var(--border))] font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="py-3 pr-4">Scan</th>
                <th className="py-3 pr-4">Crop / indication</th>
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Risk</th>
                <th className="py-3 pr-4">Referral</th>
                <th className="py-3">Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {scans.slice(0, 12).map((scan) => (
                <tr key={scan.id} className="hover:bg-[hsl(var(--muted)/_.35)]">
                  <td className="py-4 pr-4 font-mono text-xs">{scan.id}</td>
                  <td className="py-4 pr-4">
                    <div className="font-semibold">{scan.crop}</div>
                    <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                      {scan.condition}
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-xs text-[hsl(var(--muted-foreground))]">
                    {scan.date}
                  </td>
                  <td className="py-4 pr-4">
                    <SeverityBadge severity={scan.severity} small />
                  </td>
                  <td className="py-4 pr-4 text-xs">
                    {scan.referral === "None" ? "No referral" : scan.referral}
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
      </Box>
    </AppShell>
  );
}
export function ReferralDetail({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  return (
    <AppShell role="farmer" locale={locale} setLocale={setLocale}>
      <PageHeader
        eyebrow="Referral / RF-1082"
        title="A compatible verification centre"
      >
        <Button href="/farmer" variant="outline" testId="button-referral-back">
          Back to fieldbook
        </Button>
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <Box>
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
              <FlaskConical size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{centers[0].name}</h2>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                {centers[0].district}, {centers[0].state} ·{" "}
                {centers[0].distance}
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-4 border-y border-[hsl(var(--border))] py-5 sm:grid-cols-2">
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                Capability
              </div>
              <div className="mt-1 text-sm font-semibold">
                {centers[0].capability}
              </div>
            </div>
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                Contact
              </div>
              <div className="mt-1 text-sm font-semibold">
                {centers[0].contact}
              </div>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
            Selected because it supports rice disease review and is the nearest
            compatible centre in this demonstration. Distance is approximate.
          </p>
          <Button
            onClick={() =>
              window.alert(
                "Prototype referral noted. The centre would receive the case through the official service in production.",
              )
            }
            testId="button-confirm-referral"
          >
            Confirm referral <ArrowRight size={16} />
          </Button>
        </Box>
        <Box>
          <SectionLabel eyebrow="Referral timeline">RF-1082</SectionLabel>
          <div className="space-y-5">
            {[
              "Suggested · today, 09:14",
              "Farmer notified · today, 09:14",
              "Awaiting centre acceptance",
              "Field result · not yet available",
            ].map((item, i) => (
              <div key={item} className="flex gap-3">
                <div
                  className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${i < 2 ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]" : "border-[hsl(var(--border))]"}`}
                />
                <div
                  className={`text-sm ${i > 1 ? "text-[hsl(var(--muted-foreground))]" : "font-semibold"}`}
                >
                  {item}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 border-t border-[hsl(var(--border))] pt-5 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
            <Info size={14} className="mb-2" />
            Privacy notice: only an approximate district is shared with the
            recommended centre until you choose to confirm.
          </div>
        </Box>
      </div>
    </AppShell>
  );
}

function OfficialTabs({ active }: { active: string }) {
  return (
    <div className="mb-7 flex gap-1 overflow-x-auto border-b border-[hsl(var(--border))]">
      {[
        ["overview", "Overview", "/officials"],
        ["intelligence", "Intelligence", "/officials/intelligence"],
        ["cases", "Cases", "/officials/cases"],
        ["referrals", "Referrals", "/officials/referrals"],
        ["report", "Monthly report", "/officials/report"],
      ].map(([key, label, href]) => (
        <Link
          href={href}
          key={key}
          className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold ${active === key ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]" : "border-transparent text-[hsl(var(--muted-foreground))]"}`}
          data-testid={`link-official-tab-${key}`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
function IndiaSchematic() {
  return (
    <div className="relative h-[360px] overflow-hidden border border-[hsl(var(--border))] bg-[hsl(112_22%_90%)]">
      <div className="absolute inset-0 opacity-25 wf-grid-paper" />
      <div className="absolute left-[24%] top-[8%] h-[270px] w-[54%] rotate-[12deg] border-2 border-[hsl(var(--primary)/_.45)] bg-[hsl(112_22%_81%/_.65)] [clip-path:polygon(31%_0,65%_4%,88%_18%,81%_40%,100%_57%,78%_71%,74%_100%,53%_80%,35%_86%,23%_66%,0_56%,16%_32%)]" />
      {mapStates.map((s, i) => (
        <div
          key={s.name}
          title={`${s.name} · ${s.severity}`}
          className="wf-map-dot absolute"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
        >
          <span
            className={`block h-2.5 w-2.5 rounded-full ${s.severity === "high" ? "bg-[hsl(4_48%_44%)]" : s.severity === "moderate" ? "bg-[hsl(var(--accent))]" : "bg-[hsl(var(--primary))]"}`}
          />
        </div>
      ))}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 border border-[hsl(var(--border))] bg-[hsl(var(--card)/_.92)] p-2 text-[10px]">
        <span className="font-bold">Schematic view</span>
        <span className="flex items-center gap-1">
          <i className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
          Low
        </span>
        <span className="flex items-center gap-1">
          <i className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />
          Moderate
        </span>
        <span className="flex items-center gap-1">
          <i className="h-2 w-2 rounded-full bg-[hsl(4_48%_44%)]" />
          High
        </span>
      </div>
      <div className="absolute right-3 top-3">
        <Provenance kind="demo">
          Demo outbreak data · not official boundaries
        </Provenance>
      </div>
    </div>
  );
}
export function OfficialsOverview({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  return (
    <AppShell role="official" locale={locale} setLocale={setLocale}>
      <PageHeader
        eyebrow="India crop watch / national overview"
        title="Regional crop-health intelligence"
      >
        <div className="flex flex-wrap gap-2">
          <Provenance kind="demo" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {locales[locale].official.updated}
          </span>
        </div>
      </PageHeader>
      <OfficialTabs active="overview" />
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
          label="Pending referral"
          value={String(allIndiaSummary.pending)}
          note="across India"
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Box className="p-3">
          <div className="mb-3 flex items-center justify-between px-2">
            <div className="font-bold">State severity summary</div>
            <button
              className="flex items-center gap-2 border border-[hsl(var(--border))] px-3 py-2 text-xs"
              data-testid="button-map-filters"
            >
              <SlidersHorizontal size={14} />
              Filters
            </button>
          </div>
          <IndiaSchematic />
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
              data-testid="input-official-search"
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
                href={`/officials/district/${d.district.toLowerCase()}`}
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
  );
}

export function OfficialIntelligence({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  return (
    <AppShell role="official" locale={locale} setLocale={setLocale}>
      <PageHeader
        eyebrow="India crop watch / intelligence"
        title="When weather and reports move together"
      >
        <Provenance kind="demo" />
      </PageHeader>
      <OfficialTabs active="intelligence" />
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
        <SectionLabel eyebrow="System intelligence">
          Collective learning and cache
        </SectionLabel>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="border border-[hsl(var(--border))] p-4">
            <div className="flex items-center justify-between">
              <b>Simulated retraining</b>
              <Provenance kind="simulated" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric
                label="New verified"
                value={String(retraining.verified)}
              />
              <Metric label="Changed" value={String(retraining.changed)} />
              <Metric label="Skipped" value="1,284" />
              <Metric label="Candidate" value={retraining.candidate} />
            </div>
            <div className="mt-5 text-xs text-[hsl(var(--muted-foreground))]">
              Last run {retraining.last} · next scheduled {retraining.next} ·{" "}
              {retraining.status}
            </div>
          </div>
          <div className="border border-[hsl(var(--border))] p-4">
            <div className="flex items-center justify-between">
              <b>Solution-cache demonstration</b>
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
  );
}

export function OfficialDistrict({
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
  return (
    <AppShell role="official" locale={locale} setLocale={setLocale}>
      <PageHeader
        eyebrow={`India crop watch / district · ${district.state}`}
        title={`${district.district} district brief`}
      >
        <Button
          href="/officials"
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
                Verified reports
              </div>
              <b>6 · 33%</b>
            </div>
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                Pending referrals
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
        <SectionLabel eyebrow="Recommended official actions">
          Next practical steps
        </SectionLabel>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            "Survey three farms in the cluster",
            "Keep the rice centre referral queue visible",
            "Recheck trend after the next rainfall event",
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
  );
}
export function OfficialCases({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = scans.filter((s) =>
    `${s.id} ${s.district} ${s.crop} ${s.condition}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <AppShell role="official" locale={locale} setLocale={setLocale}>
      <PageHeader eyebrow="India crop watch / cases" title="Case register">
        <Button
          variant="outline"
          onClick={() => setQuery("")}
          testId="button-reset-cases"
        >
          <X size={15} />
          Clear filters
        </Button>
      </PageHeader>
      <OfficialTabs active="cases" />
      <Box>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-[hsl(var(--muted-foreground))]">
            {filtered.length} of {scans.length} records · farm locations
            aggregated
          </div>
          <label className="flex h-10 items-center gap-2 border border-[hsl(var(--input))] px-3 sm:w-72">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Search case, district…"
              data-testid="input-case-search"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-y border-[hsl(var(--border))] font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              <tr>
                {[
                  "Case",
                  "Crop / condition",
                  "District",
                  "Confidence",
                  "Severity",
                  "Precision",
                  "Verification",
                ].map((h) => (
                  <th key={h} className="py-3 pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-[hsl(var(--muted)/_.35)]">
                  <td className="py-4 pr-4">
                    <Link
                      href={`/officials/cases/${s.id}`}
                      className="font-mono font-bold text-[hsl(var(--primary))]"
                      data-testid={`link-case-${s.id}`}
                    >
                      {s.id}
                    </Link>
                    <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                      {s.date}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <b>{s.crop}</b>
                    <div className="mt-1 max-w-[220px] text-xs text-[hsl(var(--muted-foreground))]">
                      {s.condition}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    {s.district}, {s.state}
                  </td>
                  <td className="py-4 pr-4 font-mono">
                    {Math.round(s.confidence * 100)}%
                  </td>
                  <td className="py-4 pr-4">
                    <SeverityBadge severity={s.severity} small />
                  </td>
                  <td className="py-4 pr-4 text-xs">District approx.</td>
                  <td className="py-4 pr-4 text-xs">
                    {s.verified ? (
                      <span className="text-[hsl(var(--primary))]">
                        Verified
                      </span>
                    ) : (
                      "Unverified"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>
    </AppShell>
  );
}
export function OfficialCaseDetail({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  const { id } = useParams();
  const scan = scans.find((s) => s.id === id) ?? scans[0];
  return (
    <AppShell role="official" locale={locale} setLocale={setLocale}>
      <PageHeader eyebrow={`Case register / ${scan.id}`} title={scan.condition}>
        <Button
          href="/officials/cases"
          variant="outline"
          testId="button-case-back"
        >
          Back to cases
        </Button>
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Box>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              {scan.crop} · {scan.district}, {scan.state}
            </div>
            <SeverityBadge severity={scan.severity} />
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-3">
            <Metric
              label="Confidence"
              value={`${Math.round(scan.confidence * 100)}%`}
              note="Prototype visual model"
            />
            <Metric
              label="Location precision"
              value="District"
              note="Privacy-preserving"
            />
            <Metric
              label="Verification"
              value={scan.verified ? "Verified" : "Pending"}
              note={scan.verified ? "Field result received" : "Referral open"}
            />
          </div>
          <div className="mt-7 border-t border-[hsl(var(--border))] pt-6">
            <h3 className="font-bold">Why this severity?</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                "14 unique farms in cluster",
                "Recent reports +31%",
                "Geographic clustering",
                "Model confidence 84%",
                "1 laboratory confirmation",
                "Humidity suitability",
                "Duplicate filtering applied",
              ].map((x) => (
                <div
                  key={x}
                  className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]"
                >
                  <Check size={15} className="text-[hsl(var(--primary))]" />
                  {x}
                </div>
              ))}
            </div>
          </div>
        </Box>
        <Box>
          <SectionLabel eyebrow="Action path">Official response</SectionLabel>
          <div className="space-y-3">
            {[
              "Review clustered reports",
              "Coordinate compatible centre",
              "Request field observation",
              "Recalculate district severity",
            ].map((x, i) => (
              <div
                key={x}
                className="flex gap-3 border-b border-[hsl(var(--border))] pb-3 text-sm"
              >
                <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                  0{i + 1}
                </span>
                <span>{x}</span>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Button href="/officials/referrals" testId="button-case-referral">
              Open referrals <ArrowRight size={16} />
            </Button>
          </div>
        </Box>
      </div>
    </AppShell>
  );
}

export function OfficialReferrals({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  const [status, setStatus] = useState("All");
  const visible =
    status === "All" ? referrals : referrals.filter((r) => r.status === status);
  return (
    <AppShell role="official" locale={locale} setLocale={setLocale}>
      <PageHeader
        eyebrow="India crop watch / referrals"
        title="Referral coordination"
      >
        <Provenance kind="sample" />
      </PageHeader>
      <OfficialTabs active="referrals" />
      <div className="mb-5 flex flex-wrap gap-2">
        {[
          "All",
          "Suggested",
          "Assigned",
          "In progress",
          "Verified",
          "Closed",
        ].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            data-testid={`button-referral-filter-${s.toLowerCase().replaceAll(" ", "-")}`}
            className={`border px-3 py-2 text-xs font-bold ${status === s ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--card))]" : "border-[hsl(var(--border))] bg-[hsl(var(--card))]"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <Box>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-y border-[hsl(var(--border))] font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              <tr>
                {[
                  "Referral",
                  "Case",
                  "District",
                  "Compatible centre",
                  "Distance",
                  "Status",
                ].map((h) => (
                  <th key={h} className="py-3 pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {visible.map((r) => (
                <tr key={r.id}>
                  <td className="py-4 pr-4 font-mono text-xs">{r.id}</td>
                  <td className="py-4 pr-4">
                    <Link
                      href={`/officials/cases/${r.scan}`}
                      className="font-bold text-[hsl(var(--primary))]"
                      data-testid={`link-referral-case-${r.id}`}
                    >
                      {r.scan}
                    </Link>
                  </td>
                  <td className="py-4 pr-4">{r.district}</td>
                  <td className="py-4 pr-4">
                    <div className="font-semibold">{r.target}</div>
                    <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                      {r.capability}
                    </div>
                  </td>
                  <td className="py-4 pr-4">{r.distance}</td>
                  <td className="py-4 pr-4">
                    <span className="border border-[hsl(var(--border))] px-2 py-1 text-xs font-semibold">
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>
    </AppShell>
  );
}

export function OfficialReport({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  const printReport = () => window.print();
  return (
    <AppShell role="official" locale={locale} setLocale={setLocale}>
      <PageHeader eyebrow="India crop watch / reports" title="Monthly report">
        <div className="flex gap-2">
          <Button
            onClick={printReport}
            variant="outline"
            testId="button-print-report"
          >
            <Printer size={16} />
            Print / save PDF
          </Button>
          <Provenance kind="demo" />
        </div>
      </PageHeader>
      <OfficialTabs active="report" />
      <Box className="mx-auto max-w-4xl p-6 md:p-10">
        <div className="flex flex-col gap-4 border-b-2 border-[hsl(var(--primary))] pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--primary))]">
              Wellfarm · Crop health intelligence
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-.04em]">
              {report.title}
            </h2>
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">
            Generated {report.generated}
            <br />
            Prototype / demo data
          </div>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="font-bold">Executive summary</h3>
            <p className="mt-3 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
              {report.summary}
            </p>
          </div>
          <div className="border-l-2 border-[hsl(var(--accent))] pl-5">
            <h3 className="font-bold">Recommended field surveys</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              <li>• Cuttack rice cluster · sample 3 farms</li>
              <li>• Karnal wheat cluster · review rust reports</li>
              <li>• Darjeeling potato belt · confirm late blight signal</li>
            </ul>
          </div>
        </div>
        <div className="mt-9 border-t border-[hsl(var(--border))] pt-6">
          <h3 className="font-bold">District risk ranking</h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {report.rankings.map((r, i) => (
              <div
                key={r}
                className="flex gap-3 border-b border-[hsl(var(--border))] py-3 text-sm"
              >
                <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                  0{i + 1}
                </span>
                {r}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-9 grid gap-5 sm:grid-cols-3">
          <Metric label="Reports" value="412" />
          <Metric label="High-risk districts" value="9" tone="red" />
          <Metric label="Weather signals" value="3" tone="amber" />
        </div>
      </Box>
    </AppShell>
  );
}

export function LabDesk({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  return (
    <AppShell role="lab" locale={locale} setLocale={setLocale}>
      <PageHeader
        eyebrow="Verification desk / Odisha network"
        title="Field assignments"
      >
        <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
          04 open assignments
        </div>
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <Box>
          <div className="mb-4 flex items-center justify-between">
            <div className="font-bold">Priority queue</div>
            <Button variant="outline" testId="button-assignment-filters">
              <Filter size={15} />
              Filter
            </Button>
          </div>
          <div className="space-y-2">
            {scans
              .filter((s) => s.status === "Referred")
              .slice(0, 6)
              .map((s, i) => (
                <Link
                  href={`/lab/case/${s.id}`}
                  key={s.id}
                  className="flex items-center gap-4 border border-[hsl(var(--border))] p-4 hover:border-[hsl(var(--primary))]"
                  data-testid={`link-assignment-${s.id}`}
                >
                  <div
                    className={`font-mono text-xs font-bold ${s.severity === "high" ? "text-[hsl(4_48%_44%)]" : "text-[hsl(var(--accent-foreground))]"}`}
                  >
                    P{i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">
                      {s.condition}
                    </div>
                    <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                      {s.id} · {s.district}, {s.state}
                    </div>
                  </div>
                  <div className="hidden text-right text-xs sm:block">
                    <div>{i === 0 ? "18 km" : `${24 + i * 7} km`}</div>
                    <div className="mt-1 text-[hsl(var(--muted-foreground))]">
                      {s.status}
                    </div>
                  </div>
                  <ChevronRight size={16} />
                </Link>
              ))}
          </div>
        </Box>
        <Box>
          <SectionLabel eyebrow="Centre coverage">Your capability</SectionLabel>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
              <Microscope size={20} />
            </div>
            <div>
              <div className="font-bold">Odisha Crop Health Centre</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                Cuttack · rice diagnostics
              </div>
            </div>
          </div>
          <div className="mt-7 space-y-4 border-t border-[hsl(var(--border))] pt-5 text-sm">
            <div className="flex justify-between">
              <span>Open</span>
              <b>04</b>
            </div>
            <div className="flex justify-between">
              <span>Verified this month</span>
              <b>12</b>
            </div>
            <div className="flex justify-between">
              <span>Avg. response</span>
              <b>1.6 days</b>
            </div>
          </div>
          <div className="mt-6">
            <Provenance kind="sample" />
            <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              Assignments are deterministic fixture records for this
              demonstration.
            </p>
          </div>
        </Box>
      </div>
    </AppShell>
  );
}
export function LabCase({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  const { id } = useParams();
  const scan = scans.find((s) => s.id === id) ?? scans[0];
  const [submitted, setSubmitted] = useState(false);
  const [outcome, setOutcome] = useState("Confirmed condition");
  if (submitted)
    return (
      <AppShell role="lab" locale={locale} setLocale={setLocale}>
        <PageHeader
          eyebrow="Verification complete"
          title="The shared record has been updated"
        >
          <Provenance kind="verified" />
        </PageHeader>
        <Box className="mx-auto max-w-2xl">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
            <Check size={30} />
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold">
            Verification submitted for {scan.id}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-7 text-[hsl(var(--muted-foreground))]">
            The result enters the collective dataset with an audit timestamp.
            Cuttack’s district severity will be recalculated in the next
            official refresh.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Metric
              label="Dataset"
              value="Eligible"
              note="next retraining cycle"
            />
            <Metric
              label="District"
              value="Recalculate"
              note="on next refresh"
            />
            <Metric label="Audit" value="Now" note="31 Mar 2025 · 16:34" />
          </div>
          <div className="mt-8 flex justify-center gap-3">
            <Button href="/lab" testId="button-return-assignments">
              Return to assignments
            </Button>
            <Button
              href="/officials/cases"
              variant="outline"
              testId="button-view-updated-case"
            >
              View case register
            </Button>
          </div>
        </Box>
      </AppShell>
    );
  return (
    <AppShell role="lab" locale={locale} setLocale={setLocale}>
      <PageHeader
        eyebrow={`Verification desk / ${scan.id}`}
        title="Review and return field evidence"
      >
        <Button href="/lab" variant="outline" testId="button-lab-back">
          Back to assignments
        </Button>
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Box>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">
                Farmer scan
              </div>
              <h2 className="mt-2 text-xl font-bold">{scan.condition}</h2>
            </div>
            <SeverityBadge severity={scan.severity} />
          </div>
          <div className="mt-6 grid h-56 place-items-center border border-dashed border-[hsl(var(--border))] bg-[hsl(40_24%_92%)]">
            <div className="text-center text-sm text-[hsl(var(--muted-foreground))]">
              <Leaf
                size={30}
                className="mx-auto mb-2 text-[hsl(var(--primary))]"
              />
              Submitted crop image preview
              <br />
              <span className="text-xs">WF-24041.jpg · good image quality</span>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                Approximate location
              </div>
              <b>Cuttack district, Odisha</b>
            </div>
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                Weather context
              </div>
              <b>29°C · 78% humidity · 7.4 mm rain</b>
            </div>
          </div>
          <div className="mt-6 border-t border-[hsl(var(--border))] pt-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            <b className="text-[hsl(var(--foreground))]">Official note:</b>{" "}
            reports are clustered across 14 unique farms. Confirm the field
            pattern before returning a result.
          </div>
        </Box>
        <Box>
          <SectionLabel eyebrow="Verification form">
            Return your observation
          </SectionLabel>
          <label className="block text-sm font-semibold">
            Outcome
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="mt-2 h-11 w-full border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3"
              data-testid="select-verification-outcome"
            >
              <option>Confirmed condition</option>
              <option>Inconclusive</option>
              <option>Rejected model prediction</option>
            </select>
          </label>
          <label className="mt-5 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              data-testid="checkbox-sample-collected"
            />
            Sample collected for laboratory review
          </label>
          <label className="mt-5 block text-sm font-semibold">
            Field observations
            <textarea
              className="mt-2 min-h-28 w-full border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-3 font-normal"
              placeholder="Describe what you observed in the field…"
              data-testid="textarea-field-observations"
            />
          </label>
          <label className="mt-5 block text-sm font-semibold">
            Recommended follow-up
            <select
              className="mt-2 h-11 w-full border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3"
              data-testid="select-follow-up"
            >
              <option>Monitor cluster and revisit in 3 days</option>
              <option>Escalate to laboratory</option>
              <option>No further action</option>
            </select>
          </label>
          <div className="mt-6 border-t border-[hsl(var(--border))] pt-5">
            <Button
              onClick={() => setSubmitted(true)}
              testId="button-submit-verification"
            >
              <ShieldAlert size={16} />
              {locales[locale].lab.submit}
            </Button>
            <p className="mt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              Submitting creates an auditable prototype event. It does not
              represent laboratory certification.
            </p>
          </div>
        </Box>
      </div>
    </AppShell>
  );
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
      text: "Fetched from Open-Meteo when permission, network and coordinates are available. Otherwise the screen says Demo weather.",
    },
    {
      kind: "model" as const,
      title: "Prototype model",
      text: "A visual indication for the demonstration. Confidence is not laboratory confirmation and should not drive chemical treatment alone.",
    },
    {
      kind: "demo" as const,
      title: "Demo outbreak data",
      text: "Deterministic fixture records used to show national, state and district intelligence. It is not an official surveillance feed.",
    },
    {
      kind: "simulated" as const,
      title: "Simulated retraining",
      text: "A visible training and caching workflow with fixture metrics. No model is deployed from this browser.",
    },
    {
      kind: "sample" as const,
      title: "Sample referral",
      text: "A compatible centre record selected by capability and approximate distance for the prototype journey.",
    },
    {
      kind: "verified" as const,
      title: "Verified field result",
      text: "A field officer’s completion event in the prototype; real validation would require authorized audit and laboratory processes.",
    },
  ];
  return (
    <div className="min-h-[100dvh]">
      <PublicNav locale={locale} setLocale={setLocale} />
      <main className="mx-auto max-w-[1100px] px-5 py-14 lg:px-8">
        <PageHeader
          eyebrow="Wellfarm / data transparency"
          title="A clear line between what is live, prototyped and simulated."
        >
          <Button
            href="/roles"
            variant="outline"
            testId="button-transparency-roles"
          >
            Open prototype <ArrowRight size={16} />
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
            What officials can see
          </SectionLabel>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              [
                "Farmer view",
                "Your crop photo, approximate area and advisory.",
              ],
              [
                "District view",
                "Aggregated counts, trends and patterns across farms.",
              ],
              [
                "Verification view",
                "A case record with approximate location and audit trail.",
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
            Weather, crop analysis, referrals and reports sit behind replaceable
            service adapters. This frontend ships with stable local fixtures so
            a judge can complete the whole journey without secrets, accounts or
            an always-on backend.
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
  );
}

export function GuidedDemo({
  locale,
  setLocale,
}: {
  locale: LocaleKey;
  setLocale: (v: LocaleKey) => void;
}) {
  const [step, setStep] = useState(0);
  const demoSteps = [
    {
      title: "A farmer starts with one leaf",
      text: "S. Pradhan, a rice farmer near Cuttack, uploads a clear plant photo. This is the live interaction in the browser; the image analysis below is prototype data.",
      href: "/farmer/scan",
      label: "Open farmer scan",
    },
    {
      title: "Approximate location adds context",
      text: "The browser requests location. If permission is denied, Cuttack remains available as a clearly marked demo fallback. Exact farm coordinates never reach the officials’ map.",
      href: "/farmer/scan",
      label: "See location step",
    },
    {
      title: "Possible bacterial leaf blight",
      text: "The prototype returns an early indication, confidence and a safety notice. Weather and the existing Cuttack cluster add context, not certainty.",
      href: "/farmer/scan",
      label: "See the result",
    },
    {
      title: "The district signal moves to moderate",
      text: "The scan joins an existing cluster of 14 unique farms. Officials can inspect the reasons behind the change instead of seeing a mysterious score.",
      href: "/officials",
      label: "Open district intelligence",
    },
    {
      title: "A field officer closes the loop",
      text: "The compatible centre receives a referral. A verified field result enters the collective dataset and becomes eligible for the next simulated retraining cycle.",
      href: "/lab/case/WF-24041",
      label: "Open verification desk",
    },
    {
      title: "A similar case gets faster",
      text: "Once expert validation is stored, a second similar case matches the solution cache: 4.8 seconds of full inference becomes a simulated 0.7 second reuse.",
      href: "/officials/intelligence",
      label: "See cache comparison",
    },
  ];
  const current = demoSteps[step];
  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-6 lg:px-8">
        <Brand inverse />
        <div className="flex items-center gap-4">
          <LanguageSelect locale={locale} setLocale={setLocale} />
          <Button href="/" variant="outline" testId="button-demo-exit">
            <X size={15} />
            Exit demo
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-14 lg:px-8">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--sidebar-primary))]">
          <Play size={13} />
          Guided judge demo · {step + 1} / {demoSteps.length}
        </div>
        <div className="mt-8 grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-center">
          <div>
            <h1 className="text-4xl font-extrabold tracking-[-.05em] md:text-6xl">
              {current.title}
            </h1>
            <p className="mt-6 text-lg leading-8 text-[hsl(var(--sidebar-foreground)/_.72)]">
              {current.text}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href={current.href} testId="button-demo-open-step">
                {current.label} <ArrowRight size={16} />
              </Button>
              <Button
                onClick={() =>
                  setStep(Math.min(demoSteps.length - 1, step + 1))
                }
                variant="outline"
                testId="button-demo-next"
              >
                {step === demoSteps.length - 1
                  ? "Replay from start"
                  : "Next step"}{" "}
                <ChevronRight size={16} />
              </Button>
            </div>
            <div className="mt-8 flex gap-2">
              {demoSteps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  aria-label={`Go to demo step ${i + 1}`}
                  data-testid={`button-demo-step-${i + 1}`}
                  className={`h-2 flex-1 ${i === step ? "bg-[hsl(var(--sidebar-primary))]" : "bg-[hsl(var(--sidebar-border))]"}`}
                />
              ))}
            </div>
          </div>
          <div className="border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent))] p-6">
            <div className="flex items-center justify-between border-b border-[hsl(var(--sidebar-border))] pb-4">
              <span className="font-mono text-[10px] uppercase tracking-[.14em] text-[hsl(var(--sidebar-primary))]">
                What the judge is seeing
              </span>
              <Provenance
                kind={step === 1 ? "live" : step >= 3 ? "simulated" : "model"}
              />
            </div>
            <div className="mt-7 space-y-4">
              {[
                ["Live", "Browser navigation and permission request"],
                ["Prototype", "Crop indication and safety wording"],
                ["Demo data", "Cuttack cluster, cases and referrals"],
                ["Simulated", "Retraining and cache timings"],
              ].map(([label, text], i) => (
                <div
                  key={label}
                  className={`border-l-2 p-3 ${i === step % 4 ? "border-[hsl(var(--sidebar-primary))] bg-[hsl(var(--sidebar)/_.4)]" : "border-[hsl(var(--sidebar-border))]"}`}
                >
                  <div className="text-sm font-bold">{label}</div>
                  <div className="mt-1 text-xs text-[hsl(var(--sidebar-foreground)/_.65)]">
                    {text}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-2 border-t border-[hsl(var(--sidebar-border))] pt-5 text-xs text-[hsl(var(--sidebar-foreground)/_.6)]">
              <Clock3 size={14} />
              Approximately 3–5 minutes · use Next step to narrate the system
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
