import {
  createScan,
  getScan,
  getWeather,
  uploadScanImage,
  type CreateScanInput,
  type Scan,
} from "@workspace/api-client-react";
import {
  type ScanAnalysisResult,
} from "@/services/scan-analysis";

export interface DisplayWeather {
  location: string;
  temperature: string;
  humidity: string;
  rain: string;
  wind: string;
  source: string;
  updated: string;
  freshness: "live" | "cached" | "unavailable";
}

export const unavailableWeather: DisplayWeather = {
  location: "Location unavailable", temperature: "—", humidity: "—", rain: "—", wind: "—", source: "Weather unavailable", updated: "", freshness: "unavailable",
};

export const weatherService = {
  async getCurrentWeather(
    latitude: number,
    longitude: number,
  ): Promise<DisplayWeather> {
    try {
      const current = await getWeather({ latitude, longitude });
      return {
        location: "Detected area (approx.)",
        temperature: `${Math.round(current.temperatureCelsius)}°C`,
        humidity: `${Math.round(current.relativeHumidityPercentage)}%`,
        rain: `${current.precipitationMm} mm`,
        wind: `${Math.round(current.windSpeedKph)} km/h`,
        source: current.source === "met-norway" ? "MET Norway" : "Open-Meteo",
        updated: new Date(current.observedAt).toLocaleString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        freshness: current.freshness,
      };
    } catch {
      return unavailableWeather;
    }
  },
};

export function createScanRecord(input: CreateScanInput): Promise<Scan> {
  return createScan(input);
}

export async function listScanRecords(): Promise<Scan[]> {
  const response = await fetch("/api/scans");
  if (!response.ok) throw new Error("scan history unavailable");

  const records: unknown = await response.json();
  if (!Array.isArray(records)) throw new Error("invalid scan history");
  return records as Scan[];
}

export interface RegionalScanSummary {
  crop: string;
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  indication: string | null;
  severity: "low" | "moderate" | "high" | null;
  status: "analyzed" | "awaiting-analysis";
  createdAt: string;
}

export async function listRegionalScanRecords(): Promise<RegionalScanSummary[]> {
  const response = await fetch("/api/scans/regional", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("regional scans unavailable");

  const records: unknown = await response.json();
  if (!Array.isArray(records)) throw new Error("invalid regional scans");
  return records as RegionalScanSummary[];
}

export function getScanRecord(scanId: string): Promise<Scan> {
  return getScan(scanId);
}

export function uploadCropImage(scanId: string, image: File): Promise<Scan> {
  return uploadScanImage(scanId, { image });
}

export interface BrowserLocation {
  latitude: number;
  longitude: number;
  label: string;
  attribution?: string;
}

interface ApproximateLocationResponse {
  label: string;
  source: "openstreetmap";
}

export async function getApproximateLocationLabel(
  latitude: number,
  longitude: number,
): Promise<Pick<BrowserLocation, "label" | "attribution">> {
  try {
    const query = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
    });
    const response = await fetch(`/api/location?${query}`);
    if (!response.ok) throw new Error("location unavailable");

    const location = (await response.json()) as ApproximateLocationResponse;
    if (typeof location.label !== "string" || !location.label) {
      throw new Error("invalid location");
    }

    return {
      label: `${location.label} · approximate area`,
      attribution: "Place data © OpenStreetMap contributors",
    };
  } catch {
    return { label: "Detected area (approx.)" };
  }
}

export const requestLocation = (): Promise<BrowserLocation> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }

    const locate = (attempt: number) => navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const place = await getApproximateLocationLabel(
          coords.latitude,
          coords.longitude,
        );
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          ...place,
        });
      },
      (error) => {
        if (attempt === 0 && error.code !== 1) {
          locate(1);
          return;
        }
        reject(new Error(error.code === 1 ? "denied" : error.code === 2 ? "unavailable" : "timeout"));
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
    locate(0);
  });


export const analyzeCropScan = async (
  scanId: string,
): Promise<ScanAnalysisResult> => {
  const response = await fetch(`/api/scans/${encodeURIComponent(scanId)}/analysis`, { method: "POST" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (body?.error?.code === "ROUTE_NOT_FOUND") {
      throw new Error("Your scan was saved. Restart npm run dev to load the updated analysis API, then retry.");
    }
    throw new Error(body?.error?.message ?? "Your scan was saved, but analysis failed. Check the model service and retry.");
  }
  return response.json();
};
