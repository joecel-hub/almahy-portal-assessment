import type { ApiErrorBody } from "./types";

/** Error thrown by `api()` for non-2xx responses. Carries the HTTP status and field errors. */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

type ApiOptions = Omit<RequestInit, "body"> & { json?: unknown };

/**
 * Thin typed wrapper around fetch for the portal's REST API.
 * - sends/receives JSON
 * - turns error responses into `HttpError` so TanStack Query can decide
 *   whether to retry (5xx/network) or not (4xx)
 * - redirects to /login when the session has expired
 */
export async function api<T>(path: string, { json, headers, ...init }: ApiOptions = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });

  if (res.ok) return (await res.json()) as T;

  const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
  if (res.status === 401 && typeof window !== "undefined") {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    // A full page load (not router.push) on purpose: it also discards all
    // in-memory client state from the expired session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/login?next=${next}`);
  }
  throw new HttpError(
    res.status,
    body?.error.code ?? "http_error",
    body?.error.message ?? `Request failed (${res.status})`,
    body?.error.fields,
  );
}
