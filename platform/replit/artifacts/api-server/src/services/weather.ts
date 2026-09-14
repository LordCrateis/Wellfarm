import { get as httpsGet } from "node:https";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const MET_NORWAY_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const WEATHER_USER_AGENT = "Wellfarm/1.0 (https://wellfarm.shivambuilds.dev)";
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
  source: "open-meteo" | "met-norway";
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

interface MetNorwayResponse {
  geometry?: { coordinates?: unknown[] };
  properties?: {
    timeseries?: Array<{
      time?: string;
      data?: {
        instant?: {
          details?: {
            air_temperature?: number;
            relative_humidity?: number;
            wind_speed?: number;
          };
        };
        next_1_hours?: {
          summary?: { symbol_code?: string };
          details?: { precipitation_amount?: number };
        };
      };
    }>;
  };
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

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

function requestWithNodeHttps(url: URL, provider: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = httpsGet(
      url,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": WEATHER_USER_AGENT,
        },
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`${provider} returned ${response.statusCode ?? "no status"}`));
          return;
        }

        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 1_000_000) {
            request.destroy(new Error(`${provider} response was too large`));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.setTimeout(REQUEST_TIMEOUT_MS, () => request.destroy(new Error(`${provider} request timed out`)));
    request.on("error", reject);
  });
}

function metNorwayWeatherCode(symbolCode: string): number {
  if (symbolCode.includes("thunder")) return 95;
  if (symbolCode.includes("snow") || symbolCode.includes("sleet")) return 71;
  if (symbolCode.includes("heavyrain")) return 65;
  if (symbolCode.includes("rain")) return 61;
  if (symbolCode.includes("fog")) return 45;
  if (symbolCode.includes("cloudy")) return 3;
  if (symbolCode.includes("fair")) return 1;
  return 0;
}

function parseMetNorwayResponse(
  value: unknown,
  requestedLatitude: number,
  requestedLongitude: number,
): WeatherReading {
  if (!value || typeof value !== "object") throw new WeatherUnavailableError();

  const response = value as MetNorwayResponse;
  const point = response.properties?.timeseries?.[0];
  const instant = point?.data?.instant?.details;
  const nextHour = point?.data?.next_1_hours;
  const symbolCode = nextHour?.summary?.symbol_code ?? "";
  const observedAt = point?.time ? new Date(point.time) : new Date(Number.NaN);
  const precipitation = nextHour?.details?.precipitation_amount ?? 0;

  if (
    !instant ||
    !isFiniteNumber(instant.air_temperature) ||
    !isFiniteNumber(instant.relative_humidity) ||
    !isFiniteNumber(instant.wind_speed) ||
    !isFiniteNumber(precipitation) ||
    Number.isNaN(observedAt.getTime())
  ) {
    throw new WeatherUnavailableError();
  }

  return {
    latitude: requestedLatitude,
    longitude: requestedLongitude,
    temperatureCelsius: instant.air_temperature,
    relativeHumidityPercentage: instant.relative_humidity,
    precipitationMm: precipitation,
    windSpeedKph: instant.wind_speed * 3.6,
    weatherCode: metNorwayWeatherCode(symbolCode),
    isDay: symbolCode.endsWith("_day"),
    observedAt,
    timezone: "UTC",
    source: "met-norway",
    freshness: "live",
  };
}

async function getMetNorwayWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherReading> {
  const url = new URL(MET_NORWAY_URL);
  url.searchParams.set("lat", latitude.toFixed(4));
  url.searchParams.set("lon", longitude.toFixed(4));

  let fetchError: unknown;
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": WEATHER_USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`MET Norway returned ${response.status}`);
    return parseMetNorwayResponse(await response.json(), latitude, longitude);
  } catch (error) {
    fetchError = error;
  }

  try {
    return parseMetNorwayResponse(
      await requestWithNodeHttps(url, "MET Norway"),
      latitude,
      longitude,
    );
  } catch (httpsError) {
    console.error("MET Norway weather request failed", {
      fetch: describeError(fetchError),
      https: describeError(httpsError),
    });
    throw new WeatherUnavailableError();
  }
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
    let data: OpenMeteoResponse | undefined;
    let fetchError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) {
          throw new Error(`Open-Meteo returned ${response.status}`);
        }

        data = parseOpenMeteoResponse(await response.json());
        break;
      } catch (error) {
        fetchError = error;
      }
    }

    if (!data) {
      try {
        data = parseOpenMeteoResponse(await requestWithNodeHttps(url, "Open-Meteo"));
      } catch (httpsError) {
        console.warn("Open-Meteo unavailable; using MET Norway", {
          fetch: describeError(fetchError),
          https: describeError(httpsError),
        });
        const reading = await getMetNorwayWeather(latitude, longitude);
        cache.set(key, { reading, fetchedAt: now });
        return reading;
      }
    }

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
