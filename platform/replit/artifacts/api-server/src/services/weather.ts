const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const CACHE_TTL_MS = 5 * 60 * 1000;
const STALE_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;

export interface WeatherReading {
  latitude: number;
  longitude: number;
  temperatureCelsius: number;
  relativeHumidityPercentage: number;
  precipitationMm: number;
  windSpeedKph: number;
  weatherCode: number;
  isDay: boolean;
  observedAt: Date;
  timezone: string;
  source: "open-meteo";
  freshness: "live" | "cached";
}

interface CacheEntry {
  reading: WeatherReading;
  fetchedAt: number;
}

interface OpenMeteoCurrent {
  time: number;
  temperature_2m: number;
  relative_humidity_2m: number;
  precipitation: number;
  wind_speed_10m: number;
  weather_code: number;
  is_day: number;
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: OpenMeteoCurrent;
}

const cache = new Map<string, CacheEntry>();

export class WeatherUnavailableError extends Error {
  constructor() {
    super("Live weather is temporarily unavailable.");
    this.name = "WeatherUnavailableError";
  }
}

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseOpenMeteoResponse(value: unknown): OpenMeteoResponse {
  if (!value || typeof value !== "object") {
    throw new WeatherUnavailableError();
  }

  const response = value as Partial<OpenMeteoResponse>;
  const current = response.current as Partial<OpenMeteoCurrent> | undefined;

  if (
    !isFiniteNumber(response.latitude) ||
    !isFiniteNumber(response.longitude) ||
    typeof response.timezone !== "string" ||
    !current ||
    !isFiniteNumber(current.time) ||
    !isFiniteNumber(current.temperature_2m) ||
    !isFiniteNumber(current.relative_humidity_2m) ||
    !isFiniteNumber(current.precipitation) ||
    !isFiniteNumber(current.wind_speed_10m) ||
    !isFiniteNumber(current.weather_code) ||
    !isFiniteNumber(current.is_day)
  ) {
    throw new WeatherUnavailableError();
  }

  return response as OpenMeteoResponse;
}

function asCached(reading: WeatherReading): WeatherReading {
  return { ...reading, freshness: "cached" };
}

export async function getCurrentWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherReading> {
  const key = cacheKey(latitude, longitude);
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.fetchedAt <= CACHE_TTL_MS) {
    return asCached(cached.reading);
  }

  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation",
      "wind_speed_10m",
      "weather_code",
      "is_day",
    ].join(","),
  );
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("precipitation_unit", "mm");
  url.searchParams.set("timeformat", "unixtime");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "1");

  try {
    let response: Response | undefined;
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (response.ok) break;
        lastError = new Error(`Open-Meteo returned ${response.status}`);
      } catch (error) {
        lastError = error;
      }
    }

    if (!response?.ok) {
      throw lastError ?? new WeatherUnavailableError();
    }

    const data = parseOpenMeteoResponse(await response.json());
    const reading: WeatherReading = {
      latitude: data.latitude,
      longitude: data.longitude,
      temperatureCelsius: data.current.temperature_2m,
      relativeHumidityPercentage: data.current.relative_humidity_2m,
      precipitationMm: data.current.precipitation,
      windSpeedKph: data.current.wind_speed_10m,
      weatherCode: data.current.weather_code,
      isDay: data.current.is_day === 1,
      observedAt: new Date(data.current.time * 1000),
      timezone: data.timezone,
      source: "open-meteo",
      freshness: "live",
    };

    cache.set(key, { reading, fetchedAt: now });
    return reading;
  } catch (error) {
    if (cached && now - cached.fetchedAt <= STALE_TTL_MS) {
      return asCached(cached.reading);
    }

    if (error instanceof WeatherUnavailableError) {
      throw error;
    }

    throw new WeatherUnavailableError();
  }
}
