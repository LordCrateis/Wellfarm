import { setBaseUrl } from "@workspace/api-client-react";

// GitHub Pages serves the static UI on one origin while the API runs on Render.
// Keep this rewrite in one place so existing relative `/api/...` calls continue
// to work locally and receive cookies cross-origin in production.
const configuredApiOrigin = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, "");

export function apiUrl(path: string) {
  if (!configuredApiOrigin || !path.startsWith("/api/")) return path;
  return `${configuredApiOrigin}${path}`;
}

export function configureApiRuntime() {
  if (!configuredApiOrigin || typeof window === "undefined") return;
  setBaseUrl(configuredApiOrigin);
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const rawUrl = input instanceof Request ? input.url : input instanceof URL ? input.href : input;
    const url = new URL(rawUrl, window.location.origin);
    const isConfiguredApi = url.origin === configuredApiOrigin;
    const isRelativeApi = url.origin === window.location.origin && url.pathname.startsWith("/api/");
    if (!isConfiguredApi && !isRelativeApi) return nativeFetch(input, init);
    const target = isRelativeApi ? apiUrl(`${url.pathname}${url.search}`) : url.href;
    const request = input instanceof Request ? new Request(target, input) : target;
    return nativeFetch(request, { ...init, credentials: init?.credentials ?? "include" });
  };
}
