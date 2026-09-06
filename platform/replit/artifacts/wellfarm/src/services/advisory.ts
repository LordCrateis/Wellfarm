import type { LocaleKey } from "@/i18n/locales";
import type { DisplayWeather } from "@/services/adapters";
import type { ScanAnalysisResult } from "@/services/scan-analysis";

export interface AdvisoryExplanation {
  source: "gemini" | "fallback";
  model: string | null;
  summary: string;
  uncertainty: string;
  nextSteps: string[];
  safetyNote: string;
  generatedAt: string;
}

export interface AdvisoryContext {
  symptoms: string[];
  affectedPart: string;
  affectedAreaPercentage?: number;
  nearbyPlantsAffected?: boolean;
  weather: DisplayWeather | null;
  locale: LocaleKey;
}

function numberFromDisplay(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function browserFallback(
  result: ScanAnalysisResult,
): AdvisoryExplanation {
  return {
    source: "fallback",
    model: null,
    summary: result.summary,
    uncertainty:
      "Different crop conditions can look similar in one photograph. Lighting, framing, growth stage, and unsupported conditions can change the ranking.",
    nextSteps: result.safeActions.slice(0, 3),
    safetyNote: result.limitations[0],
    generatedAt: new Date().toISOString(),
  };
}

function isExplanation(value: unknown): value is AdvisoryExplanation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AdvisoryExplanation>;
  return (
    (candidate.source === "gemini" || candidate.source === "fallback") &&
    (typeof candidate.model === "string" || candidate.model === null) &&
    typeof candidate.summary === "string" &&
    typeof candidate.uncertainty === "string" &&
    Array.isArray(candidate.nextSteps) &&
    candidate.nextSteps.length >= 1 &&
    candidate.nextSteps.length <= 3 &&
    candidate.nextSteps.every((step) => typeof step === "string") &&
    typeof candidate.safetyNote === "string" &&
    typeof candidate.generatedAt === "string"
  );
}

export async function requestAdvisoryExplanation(
  result: ScanAnalysisResult,
  context: AdvisoryContext,
): Promise<AdvisoryExplanation> {
  try {
    const response = await fetch("/api/advisory/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: result.mode,
        crop: result.crop,
        candidates: result.candidates,
        severity: result.severity,
        symptoms: context.symptoms,
        affectedPart: context.affectedPart,
        affectedAreaPercentage: context.affectedAreaPercentage,
        nearbyPlantsAffected: context.nearbyPlantsAffected,
        weather: context.weather
          ? {
              temperatureCelsius: numberFromDisplay(context.weather.temperature),
              relativeHumidityPercentage: numberFromDisplay(
                context.weather.humidity,
              ),
              precipitationMm: numberFromDisplay(context.weather.rain),
            }
          : undefined,
        locale: context.locale,
      }),
    });
    if (!response.ok) return browserFallback(result);

    const explanation: unknown = await response.json();
    return isExplanation(explanation)
      ? explanation
      : browserFallback(result);
  } catch {
    return browserFallback(result);
  }
}
