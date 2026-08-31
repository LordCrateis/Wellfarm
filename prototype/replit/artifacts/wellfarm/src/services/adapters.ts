import {
  createScan,
  getWeather,
  uploadScanImage,
  type CreateScanInput,
  type Scan,
} from "@workspace/api-client-react";
import { weather } from "@/data/mock";

export interface DisplayWeather {
  location: string;
  temperature: string;
  humidity: string;
  rain: string;
  wind: string;
  source: string;
  updated: string;
  freshness: "live" | "cached" | "demo";
}

const demoWeather: DisplayWeather = {
  ...weather,
  freshness: "demo",
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
      return demoWeather;
    }
  },
};

export function createScanRecord(input: CreateScanInput): Promise<Scan> {
  return createScan(input);
}

export function uploadCropImage(scanId: string, image: File): Promise<Scan> {
  return uploadScanImage(scanId, { image });
}

export const requestLocation = (): Promise<{
  latitude: number;
  longitude: number;
  label: string;
}> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          label: "Detected area (approx.)",
        }),
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

export const demoLocation = {
  latitude: 20.4625,
  longitude: 85.883,
  label: "Cuttack district · demo location",
};

export const analyzeCropScan = async (crop: string) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return crop === "Rice"
    ? {
        condition: "Rice bacterial leaf blight",
        confidence: 0.84,
        severity: "moderate" as const,
      }
    : {
        condition: "Early visual signal — expert review advised",
        confidence: 0.68,
        severity: "low" as const,
      };
};
