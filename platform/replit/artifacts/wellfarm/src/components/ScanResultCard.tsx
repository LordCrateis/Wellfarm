import { LocalizedContent } from "@/i18n/TranslationProvider";
import { Link } from "wouter";
import {
  AlertTriangle,
  BadgeCheck,
  Camera,
  Check,
  CloudRain,
  Info,
  MapPin,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Provenance, SeverityBadge } from "@/components/Status";
import type { DisplayWeather } from "@/services/adapters";
import type { AdvisoryExplanation } from "@/services/advisory";
import type { ScanAnalysisResult } from "@/services/scan-analysis";

interface ScanResultCardProps {
  result: ScanAnalysisResult;
  explanation?: AdvisoryExplanation;
  scanId: string | null;
  imageUrl: string | null;
  locationLabel: string;
  weatherContext: DisplayWeather | null;
  onRetry: () => void;
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <LocalizedContent>{(
    <section
      className={`border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm ${className}`}
    >
      {children}
    </section>
  )}</LocalizedContent>;
}

function confidenceLabel(value: number): string {
  if (value >= 0.8) return "High match";
  if (value >= 0.6) return "Review alternatives";
  return "Low confidence";
}

export function ScanResultCard({
  result,
  explanation,
  scanId,
  imageUrl,
  locationLabel,
  weatherContext,
  onRetry,
}: ScanResultCardProps) {
  const primary = result.candidates[0];
  const isPreview = result.mode === "preview";
  const lowConfidence = primary.confidence < 0.6;
  const guidance: AdvisoryExplanation = explanation ?? {
    source: "fallback",
    model: null,
    summary: result.summary,
    uncertainty:
      "Different crop conditions can look similar in a single photograph.",
    nextSteps: result.safeActions,
    safetyNote: result.limitations[0],
    generatedAt: new Date().toISOString(),
  };

  return <LocalizedContent>{(
    <div className="space-y-5" data-testid="scan-result">
      {isPreview && (
        <div
          className="flex gap-3 border border-[hsl(39_77%_55%)] bg-[hsl(39_77%_66%/_.16)] p-4"
          role="status"
          data-testid="notice-preview-result"
        >
          <Sparkles className="mt-0.5 shrink-0 text-[hsl(26_44%_31%)]" size={18} />
          <div>
            <div className="font-bold text-[hsl(26_44%_31%)]">
              Results interface preview
            </div>
            <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              The vision model is not connected to the website yet. The ranking
              below demonstrates the final interface and is not an analysis of
              your uploaded photograph.
            </p>
          </div>
        </div>
      )}

      <Panel className="border-t-4 border-t-[hsl(var(--primary))]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
              {isPreview ? "Example indication" : "Leading model indication"}
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">
              {result.crop} · {primary.condition}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <SeverityBadge severity={result.severity} />
              <Provenance kind={isPreview ? "sample" : "model"}>
                {isPreview ? "Preview data" : result.model.version}
              </Provenance>
              <Provenance
                kind={guidance.source === "gemini" ? "model" : "local"}
              >
                {guidance.source === "gemini"
                  ? "Gemini explanation"
                  : "Local explanation"}
              </Provenance>
            </div>
          </div>
          <div className="min-w-32 border-l-2 border-[hsl(var(--primary))] pl-4">
            <div className="font-mono text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
              {isPreview ? "Example score" : "Top confidence"}
            </div>
            <div className="mt-1 text-3xl font-extrabold">
              {Math.round(primary.confidence * 100)}%
            </div>
            <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              {confidenceLabel(primary.confidence)}
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-5 border-t border-[hsl(var(--border))] pt-5 md:grid-cols-[180px_1fr]">
          <div className="overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Crop submitted for analysis"
                className="h-44 w-full object-cover"
                data-testid="image-result-crop"
              />
            ) : (
              <div className="grid h-44 place-items-center text-[hsl(var(--muted-foreground))]">
                <Camera size={26} />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-bold">What this result means</h3>
            <p className="mt-2 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
              {guidance.summary}
            </p>
            <div className="mt-4 border-l-2 border-[hsl(var(--accent))] pl-4">
              <div className="text-xs font-bold uppercase tracking-[.08em]">
                Severity basis
              </div>
              <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                {result.severityBasis}
              </p>
            </div>
            <div className="mt-4 border-l-2 border-[hsl(var(--border))] pl-4">
              <div className="text-xs font-bold uppercase tracking-[.08em]">
                Why it may be uncertain
              </div>
              <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                {guidance.uncertainty}
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 md:grid-cols-[1.25fr_.75fr]">
        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
                Ranked comparison
              </div>
              <h3 className="mt-1 text-xl font-bold">
                {isPreview ? "Expected top-three layout" : "Top three model matches"}
              </h3>
            </div>
            <Info size={18} className="text-[hsl(var(--muted-foreground))]" />
          </div>
          <div className="mt-6 space-y-5">
            {result.candidates.map((candidate, index) => (
              <div key={candidate.condition}>
                <div className="flex items-center gap-3 text-sm">
                  <span className="grid h-7 w-7 place-items-center border border-[hsl(var(--border))] font-mono text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="font-semibold">{candidate.condition}</span>
                  <span className="ml-auto font-bold">
                    {Math.round(candidate.confidence * 100)}%
                  </span>
                </div>
                <div
                  className="ml-10 mt-2 h-2 overflow-hidden bg-[hsl(var(--muted))]"
                  role="progressbar"
                  aria-label={`${candidate.condition} confidence`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(candidate.confidence * 100)}
                >
                  <div
                    className={`h-full ${index === 0 ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--accent))]"}`}
                    style={{ width: `${candidate.confidence * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {lowConfidence && !isPreview && (
            <div className="mt-6 flex gap-3 border border-[hsl(39_77%_55%)] bg-[hsl(39_77%_66%/_.12)] p-3 text-sm">
              <AlertTriangle size={17} className="shrink-0" />
              No candidate is reliable enough. Try another clear photograph.
            </div>
          )}
        </Panel>

        <Panel>
          <div className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
            Input checks
          </div>
          <h3 className="mt-1 text-xl font-bold">Image and model</h3>
          <dl className="mt-5 divide-y divide-[hsl(var(--border))] text-sm">
            <div className="py-3">
              <dt className="text-[hsl(var(--muted-foreground))]">Image quality</dt>
              <dd className="mt-1 font-bold">{result.imageQuality.label}</dd>
            </div>
            <div className="py-3">
              <dt className="text-[hsl(var(--muted-foreground))]">Crop support</dt>
              <dd className="mt-1 font-bold">
                {result.supported ? `${result.crop} supported` : "Unsupported"}
              </dd>
            </div>
            <div className="py-3">
              <dt className="text-[hsl(var(--muted-foreground))]">Model</dt>
              <dd className="mt-1 font-bold">
                {result.model.connected ? result.model.version : "Connection pending"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
            {result.imageQuality.guidance}
          </p>
        </Panel>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel>
          <h3 className="flex items-center gap-2 font-bold">
            <Check size={17} className="text-[hsl(var(--primary))]" />
            Safe next actions
          </h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            {guidance.nextSteps.map((action) => (
              <li key={action} className="border-l-2 border-[hsl(var(--primary))] pl-3">
                {action}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <h3 className="flex items-center gap-2 font-bold">
            <ShieldAlert size={17} className="text-[hsl(4_48%_36%)]" />
            Important limitations
          </h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            <li className="border-l-2 border-[hsl(4_48%_55%)] pl-3 font-semibold text-[hsl(var(--foreground))]">
              {guidance.safetyNote}
            </li>
            {result.limitations.map((limitation) => (
              <li key={limitation} className="border-l-2 border-[hsl(var(--accent))] pl-3">
                {limitation}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex gap-3">
            <MapPin size={18} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" />
            <div>
              <div className="font-bold">Location context</div>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                {locationLabel}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <CloudRain size={18} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" />
            <div>
              <div className="font-bold">Weather context</div>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                {weatherContext
                  ? `${weatherContext.temperature}, ${weatherContext.humidity} humidity · ${weatherContext.source}`
                  : "Weather was unavailable for this scan."}
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="bg-[hsl(112_22%_81%/_.3)]">
        <div className="flex gap-3">
          <BadgeCheck className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" />
          <div>
            <h3 className="font-bold">Scan saved to your fieldbook</h3>
            <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Record {scanId ?? "pending"} contains your photograph, crop details,
              and approximate location. Wellfarm has not sent it to another person
              or organization.
            </p>
          </div>
        </div>
      </Panel>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 text-sm font-bold hover:bg-[hsl(var(--muted))]"
          data-testid="button-retry-photo"
        >
          <RotateCcw size={16} /> Try another photo
        </button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/transparency"
            className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-bold text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))]"
            data-testid="link-result-methodology"
          >
            How results work
          </Link>
          <Link
            href={scanId ? `/farmer/history/${scanId}` : "/farmer/history"}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[hsl(var(--primary))] px-4 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90"
            data-testid="link-result-history"
          >
            View saved scan
          </Link>
        </div>
      </div>
    </div>
  )}</LocalizedContent>;
}
