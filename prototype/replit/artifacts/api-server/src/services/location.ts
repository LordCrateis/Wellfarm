const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_REQUEST_INTERVAL_MS = 1_100;

export interface ApproximateLocation {
  label: string;
  locality?: string;
  district?: string;
  state?: string;
  country?: string;
  source: "openstreetmap";
}

interface CacheEntry {
  location: ApproximateLocation;
  fetchedAt: number;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state_district?: string;
  state?: string;
  country?: string;
}

interface NominatimResponse {
  address?: NominatimAddress;
}

const cache = new Map<string, CacheEntry>();
let nextRequestAt = 0;
let requestQueue: Promise<void> = Promise.resolve();

export class LocationUnavailableError extends Error {
  constructor() {
    super("Approximate place name is temporarily unavailable.");
    this.name = "LocationUnavailableError";
  }
}

function roundedCoordinate(value: number): string {
  return value.toFixed(2);
}

function cacheKey(latitude: number, longitude: number): string {
  return `${roundedCoordinate(latitude)},${roundedCoordinate(longitude)}`;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function scheduleRequest<T>(operation: () => Promise<T>): Promise<T> {
  let resolveResult!: (value: T | PromiseLike<T>) => void;
  let rejectResult!: (reason?: unknown) => void;
  const result = new Promise<T>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  requestQueue = requestQueue.then(async () => {
    const delay = Math.max(0, nextRequestAt - Date.now());
    if (delay > 0) await wait(delay);

    try {
      resolveResult(await operation());
    } catch (error) {
      rejectResult(error);
    } finally {
      nextRequestAt = Date.now() + MIN_REQUEST_INTERVAL_MS;
    }
  });

  return result;
}

function parseLocation(value: unknown): ApproximateLocation {
  if (!value || typeof value !== "object") {
    throw new LocationUnavailableError();
  }

  const address = (value as NominatimResponse).address;
  if (!address || typeof address !== "object") {
    throw new LocationUnavailableError();
  }

  const locality =
    address.city ?? address.town ?? address.village ?? address.municipality;
  const district = address.state_district ?? address.county;
  const parts = [locality, district, address.state].filter(
    (part, index, all): part is string =>
      typeof part === "string" &&
      part.length > 0 &&
      all.indexOf(part) === index,
  );

  if (parts.length === 0) {
    throw new LocationUnavailableError();
  }

  return {
    label: parts.slice(0, 2).join(", "),
    locality,
    district,
    state: address.state,
    country: address.country,
    source: "openstreetmap",
  };
}

export async function getApproximateLocation(
  latitude: number,
  longitude: number,
): Promise<ApproximateLocation> {
  const key = cacheKey(latitude, longitude);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt <= CACHE_TTL_MS) {
    return cached.location;
  }

  return scheduleRequest(async () => {
    const url = new URL(NOMINATIM_REVERSE_URL);
    // Deliberately round GPS coordinates before sharing them with the provider.
    url.searchParams.set("lat", roundedCoordinate(latitude));
    url.searchParams.set("lon", roundedCoordinate(longitude));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("zoom", "10");
    url.searchParams.set("accept-language", "en");

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          Referer: "https://github.com/LordCrateis/Wellfarm",
          "User-Agent":
            "WellfarmDemo/0.1 (+https://github.com/LordCrateis/Wellfarm)",
        },
        signal: AbortSignal.timeout(5_000),
      });

      if (!response.ok) throw new LocationUnavailableError();

      const location = parseLocation(await response.json());
      cache.set(key, { location, fetchedAt: Date.now() });
      return location;
    } catch (error) {
      if (error instanceof LocationUnavailableError) throw error;
      throw new LocationUnavailableError();
    }
  });
}
