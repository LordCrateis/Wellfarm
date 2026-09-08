const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileResponse = {
  success?: boolean;
  hostname?: string;
  "error-codes"?: string[];
};

export class TurnstileConfigurationError extends Error {}

function allowedHostnames() {
  const configured = process.env.TURNSTILE_ALLOWED_HOSTNAMES
    ?.split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);

  if (configured?.length) return new Set(configured);

  try {
    return new Set([new URL(process.env.APP_ORIGIN ?? "http://localhost:5173").hostname.toLowerCase()]);
  } catch {
    throw new TurnstileConfigurationError("APP_ORIGIN is not a valid URL.");
  }
}

export async function verifyTurnstileToken(token: unknown, remoteIp?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!process.env.TURNSTILE_SITE_KEY || !secret) {
    throw new TurnstileConfigurationError("Turnstile has not been fully configured.");
  }
  if (typeof token !== "string" || token.length < 10 || token.length > 2048) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  let response: Response;
  try {
    response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return false;
  }

  if (!response.ok) return false;

  let result: TurnstileResponse;
  try {
    result = (await response.json()) as TurnstileResponse;
  } catch {
    return false;
  }

  if (!result.success || !result.hostname) return false;
  return allowedHostnames().has(result.hostname.toLowerCase());
}
