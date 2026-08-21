import { decideOn401 } from './refresh-decision';

/**
 * The access token lives here, in memory, and nowhere else — never
 * localStorage/sessionStorage (XSS exposure). AuthProvider (lib/auth/) is
 * the single writer via setAccessToken; every fetch call in this module
 * reads the current value at call time. The refresh token itself is never
 * held or read by the frontend at all — it's an httpOnly cookie
 * (`autonexa_refresh_token`, scoped to path /api/v1/auth by the backend —
 * see auth.controller.ts's REFRESH_COOKIE_PATH, must stay in sync with
 * wherever the auth routes are actually mounted) that `credentials:
 * 'include'` lets ride along automatically.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Called once (by AuthProvider) with a callback to run when a request is
 * unauthenticated and cannot be recovered by a refresh — clears auth state
 * and redirects to /login. Kept as an injectable callback rather than an
 * import of the auth module, to avoid a circular dependency (AuthProvider
 * already imports this module to read/write the token).
 */
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

function apiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_URL is not set — see apps/web/README.md setup instructions.');
  }
  return url;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/** The backend's HttpExceptionFilter shape: `{ statusCode, timestamp, path, message }`, where `message` is either a string or a class-validator string[]. */
function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const raw = (body as { message: unknown }).message;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return raw.filter((m) => typeof m === 'string').join(', ');
    if (raw && typeof raw === 'object' && 'message' in raw) {
      // class-validator sometimes nests one level further: { message: { message: [...] } }
      return extractMessage(raw, fallback);
    }
  }
  return fallback;
}

function isAuthEndpoint(path: string): boolean {
  return path.startsWith('/auth/login') || path.startsWith('/auth/refresh');
}

/**
 * Single-flight refresh: concurrent 401s across multiple in-flight
 * requests all await this SAME promise instead of each firing their own
 * POST /auth/refresh — the stampede guard. Exported so AuthProvider can
 * call it directly for the on-mount silent refresh, reusing the exact
 * same path rather than a parallel raw-fetch implementation.
 */
let refreshPromise: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${apiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as { accessToken: string };
        setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown; // plain object — JSON-stringified automatically; pass a string/FormData/etc. through as-is
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  return doFetch<T>(path, options, false);
}

async function doFetch<T>(path: string, options: ApiFetchOptions, alreadyRetried: boolean): Promise<T> {
  const headers = new Headers(options.headers);
  const authEndpoint = isAuthEndpoint(path);

  if (accessToken && !authEndpoint) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined && typeof options.body !== 'string' && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  } else {
    body = options.body as BodyInit | undefined;
  }

  const res = await fetch(`${apiBaseUrl()}${path}`, {
    ...options,
    headers,
    body,
    credentials: 'include',
  });

  const decision = decideOn401({
    status: res.status,
    alreadyRetried,
    refreshInFlight: refreshPromise !== null,
    isAuthEndpoint: authEndpoint,
  });

  if (decision === 'start-refresh' || decision === 'await-inflight') {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return doFetch<T>(path, options, true);
    }
    onUnauthorized?.();
    throw new ApiError(401, undefined, 'Session expired — please log in again.');
  }

  if (decision === 'fail' && res.status === 401 && !authEndpoint) {
    // Retried once already and still 401 — the refreshed token itself
    // isn't valid for this request. Treat as a real auth failure.
    onUnauthorized?.();
  }

  if (!res.ok) {
    let responseBody: unknown;
    try {
      responseBody = await res.json();
    } catch {
      // No JSON body (e.g. a 204 error path, or a non-API error page) — leave undefined.
    }
    throw new ApiError(res.status, responseBody, extractMessage(responseBody, res.statusText));
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export function apiGet<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  return apiFetch<T>(path, { ...options, method: 'GET' });
}

/**
 * Same auth/refresh handling as apiFetch, but for a binary response (PDF
 * download, etc.) that isn't JSON — apiFetch always calls res.json() on
 * success, which would throw on a PDF body.
 */
export async function apiGetBlob(path: string): Promise<Blob> {
  return doFetchBlob(path, false);
}

async function doFetchBlob(path: string, alreadyRetried: boolean): Promise<Blob> {
  const headers = new Headers();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const res = await fetch(`${apiBaseUrl()}${path}`, { headers, credentials: 'include' });

  const decision = decideOn401({
    status: res.status,
    alreadyRetried,
    refreshInFlight: refreshPromise !== null,
    isAuthEndpoint: false,
  });

  if (decision === 'start-refresh' || decision === 'await-inflight') {
    const newToken = await refreshAccessToken();
    if (newToken) return doFetchBlob(path, true);
    onUnauthorized?.();
    throw new ApiError(401, undefined, 'Session expired — please log in again.');
  }

  if (decision === 'fail' && res.status === 401) {
    onUnauthorized?.();
  }

  if (!res.ok) {
    let responseBody: unknown;
    try {
      responseBody = await res.json();
    } catch {
      // Non-JSON error body — leave undefined.
    }
    throw new ApiError(res.status, responseBody, extractMessage(responseBody, res.statusText));
  }

  return res.blob();
}

export function apiPost<T>(path: string, body?: unknown, options?: ApiFetchOptions): Promise<T> {
  return apiFetch<T>(path, { ...options, method: 'POST', body });
}

export function apiPatch<T>(path: string, body?: unknown, options?: ApiFetchOptions): Promise<T> {
  return apiFetch<T>(path, { ...options, method: 'PATCH', body });
}

export function apiDelete<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  return apiFetch<T>(path, { ...options, method: 'DELETE' });
}
