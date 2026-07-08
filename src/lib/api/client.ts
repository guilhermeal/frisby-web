// Cliente HTTP tipado com JWT + refresh + retry em 401.
// Roda 100% no browser. Em dev usa proxy `/api` (ver vite.config.ts).
// Em produção usa `VITE_API_URL` — deve ser uma URL PÚBLICA (não localhost).

import type { ApiErrorShape, AuthTokens } from "./types";

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

const ACCESS_KEY = "frisby.access_token";
const REFRESH_KEY = "frisby.refresh_token";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ---------- storage helpers (browser-only) ----------

function isBrowser() {
  return typeof window !== "undefined";
}

export const tokenStore = {
  getAccess(): string | null {
    return isBrowser() ? localStorage.getItem(ACCESS_KEY) : null;
  },
  getRefresh(): string | null {
    return isBrowser() ? localStorage.getItem(REFRESH_KEY) : null;
  },
  set(tokens: AuthTokens) {
    if (!isBrowser()) return;
    localStorage.setItem(ACCESS_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  },
  clear() {
    if (!isBrowser()) return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// ---------- error normalization ----------

async function extractError(res: Response): Promise<ApiErrorShape> {
  const text = await res.text().catch(() => "");
  if (!text) return { message: res.statusText || `HTTP ${res.status}` };
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object") {
      const p = parsed as Record<string, unknown>;
      if (p.error && typeof p.error === "object") {
        const e = p.error as Record<string, unknown>;
        return {
          message: String(e.message ?? res.statusText),
          code: typeof e.code === "string" ? e.code : undefined,
          details: e.details,
        };
      }
      if (typeof p.error === "string") return { message: p.error };
      if (typeof p.message === "string") return { message: p.message };
    }
  } catch {
    // fall through
  }
  return { message: text || res.statusText || `HTTP ${res.status}` };
}

// ---------- refresh (single-flight) ----------

let refreshPromise: Promise<AuthTokens | null> | null = null;

async function refreshTokens(): Promise<AuthTokens | null> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as AuthTokens;
      tokenStore.set(data);
      return data;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ---------- listeners para invalidar sessão ----------

type SessionListener = () => void;
const sessionListeners = new Set<SessionListener>();

export function onSessionExpired(fn: SessionListener) {
  sessionListeners.add(fn);
  return () => sessionListeners.delete(fn);
}

function fireSessionExpired() {
  tokenStore.clear();
  for (const fn of sessionListeners) {
    try {
      fn();
    } catch {
      // ignore
    }
  }
}

// ---------- core request ----------

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  /** Evita anexar Authorization/refresh. Usado por endpoints de auth. */
  anonymous?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(
    path.startsWith("http") ? path : `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`,
    isBrowser() ? window.location.origin : "http://localhost",
  );
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  // preservar path relativo para permitir proxy /api em dev
  if (!path.startsWith("http") && isBrowser()) {
    return `${url.pathname}${url.search}`;
  }
  return url.toString();
}

async function doFetch(path: string, opts: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers ?? {}),
  };
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  if (token && !opts.anonymous) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(buildUrl(path, opts.query), {
    method: opts.method ?? "GET",
    headers,
    body,
    signal: opts.signal,
  });
}

export async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = tokenStore.getAccess();
  let res: Response;
  try {
    res = await doFetch(path, opts, token);
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : "Erro de rede",
      0,
      "NETWORK_ERROR",
    );
  }

  if (res.status === 401 && !opts.anonymous) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      res = await doFetch(path, opts, refreshed.access_token);
    }
    if (res.status === 401) {
      fireSessionExpired();
      const err = await extractError(res);
      throw new ApiError(err.message, 401, err.code, err.details);
    }
  }

  if (!res.ok) {
    const err = await extractError(res);
    throw new ApiError(err.message, res.status, err.code, err.details);
  }

  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return undefined as T;
  return (await res.json()) as T;
}

// atalhos
export const api = {
  get: <T>(path: string, query?: RequestOptions["query"], opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "GET", query }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};
