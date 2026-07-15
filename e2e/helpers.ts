// Helpers compartilhados dos testes E2E.
// Login via API (rápido e estável) + utilitários de seed por API.

import type { Page, APIRequestContext } from "@playwright/test";

export const API = "http://127.0.0.1:3001";
export const TEST_USER = { email: "teste.frisby@example.com", password: "senha12345" };

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/** Faz login direto no backend e devolve os tokens. */
export async function apiLogin(request: APIRequestContext, user = TEST_USER): Promise<Tokens> {
  const res = await request.post(`${API}/auth/login`, { data: user });
  if (!res.ok()) throw new Error(`login falhou: HTTP ${res.status()} ${await res.text()}`);
  return (await res.json()) as Tokens;
}

/**
 * Autentica a página injetando os tokens no localStorage ANTES do primeiro
 * load do app (mesmas chaves do tokenStore em src/lib/api/client.ts).
 */
export async function loginViaApi(page: Page, user = TEST_USER): Promise<Tokens> {
  const tokens = await apiLogin(page.request, user);
  await page.addInitScript(
    ([access, refresh]) => {
      localStorage.setItem("frisby.access_token", access);
      localStorage.setItem("frisby.refresh_token", refresh);
    },
    [tokens.accessToken, tokens.refreshToken],
  );
  return tokens;
}

/** GET autenticado no backend (para asserts de estado, ex.: saldo de conta). */
export async function apiGet<T>(
  request: APIRequestContext,
  tokens: Tokens,
  path: string,
): Promise<T> {
  const res = await request.get(`${API}${path}`, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });
  if (!res.ok()) throw new Error(`GET ${path}: HTTP ${res.status()} ${await res.text()}`);
  return (await res.json()) as T;
}

/** POST autenticado no backend (seed de dados de teste). */
export async function apiPost<T>(
  request: APIRequestContext,
  tokens: Tokens,
  path: string,
  data: unknown,
): Promise<T> {
  const res = await request.post(`${API}${path}`, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
    data,
  });
  if (!res.ok()) throw new Error(`POST ${path}: HTTP ${res.status()} ${await res.text()}`);
  return (await res.json()) as T;
}

/** E-mail único por execução — signup de usuários descartáveis. */
export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e4)}@example.com`;
}
