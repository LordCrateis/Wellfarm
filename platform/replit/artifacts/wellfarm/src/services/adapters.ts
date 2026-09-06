import {
  createScan,
  getScan,
  getWeather,
  uploadScanImage,
  type CreateScanInput,
  type Scan,
} from "@workspace/api-client-react";
import { weather } from "@/data/mock";
import {
  createPreviewAnalysis,
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
  freshness: "live" | "cached" | "sample";
}

const sampleWeather: DisplayWeather = {
  ...weather,
  freshness: "sample",
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
        source: "Open-Meteo",
        updated: new Date(current.observedAt).toLocaleString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        freshness: current.freshness,
      };
    } catch {
      return sampleWeather;
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

    navigator.geolocation.getCurrentPosition(
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
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? "denied"
              : error.code === 2
                ? "unavailable"
                : "timeout",
          ),
        ),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    );
  });

export const sampleLocation: BrowserLocation = {
  latitude: 20.4625,
  longitude: 85.883,
  label: "Cuttack district · sample location",
};

export const analyzeCropScan = async (
  crop: CreateScanInput["crop"],
): Promise<ScanAnalysisResult> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return createPreviewAnalysis(crop);
};
