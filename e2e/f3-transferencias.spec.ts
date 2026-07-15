// Fase 3 — transferências: efetivada mexe nos DOIS saldos; prevista não;
// invariante 6: não aparecem em lançamentos.

import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { API, apiGet, apiLogin, apiPost, uniqueEmail, type Tokens } from "./helpers";

interface SeedContext {
  tokens: Tokens;
  entityId: string;
  bankId: string;
  walletId: string;
}

let ctx: SeedContext | null = null;

async function seed(request: APIRequestContext): Promise<SeedContext> {
  if (ctx) return ctx;
  const email = uniqueEmail("f3");
  const password = "senha12345";
  await request.post(`${API}/auth/signup`, {
    data: { name: "Usuário F3", email, password, baseCurrency: "BRL", locale: "pt-BR" },
  });
  const tokens = await apiLogin(request, { email, password });
  const entity = await apiPost<{ id: string }>(request, tokens, "/entities", {
    name: "Casa F3",
    type: "PERSONAL",
  });
  const bank = await apiPost<{ id: string }>(request, tokens, "/me/accounts", {
    name: "Banco F3",
    type: "BANK",
    currency: "BRL",
    initialBalance: "100000",
  });
  const wallet = await apiPost<{ id: string }>(request, tokens, "/me/accounts", {
    name: "Carteira F3",
    type: "WALLET",
    currency: "BRL",
    initialBalance: "0",
  });
  ctx = { tokens, entityId: entity.id, bankId: bank.id, walletId: wallet.id };
  return ctx;
}

async function balances(request: APIRequestContext): Promise<Record<string, string>> {
  const accounts = await apiGet<Array<{ id: string; currentBalance: string }>>(
    request,
    ctx!.tokens,
    `/entities/${ctx!.entityId}/accounts`,
  );
  return Object.fromEntries(accounts.map((a) => [a.id, a.currentBalance]));
}

async function loginUI(page: Page) {
  await page.addInitScript(
    ([access, refresh, entityId]) => {
      localStorage.setItem("frisby.access_token", access);
      localStorage.setItem("frisby.refresh_token", refresh);
      localStorage.setItem("frisby.currentEntityId", entityId);
    },
    [ctx!.tokens.accessToken, ctx!.tokens.refreshToken, ctx!.entityId],
  );
}

test.describe.serial("F3 — transferências", () => {
  test.beforeEach(async ({ page, request }) => {
    await seed(request);
    await loginUI(page);
  });

  test("efetivada move os dois saldos; não vira despesa/receita", async ({ page, request }) => {
    await page.goto("/transferencias");
    await page.getByRole("button", { name: "Nova", exact: true }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByRole("combobox").nth(0).click();
    await page.getByRole("option", { name: /Banco F3/ }).click();
    await dialog.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: /Carteira F3/ }).click();
    await page.fill("#transfer-amount", "30000"); // R$ 300,00
    await page.fill("#transfer-description", "Reserva F3");
    await page.getByRole("button", { name: "Transferir" }).click();
    await expect(page.getByText("Transferência criada")).toBeVisible({ timeout: 10_000 });

    const b = await balances(request);
    expect(b[ctx!.bankId]).toBe("70000"); // 1000 − 300
    expect(b[ctx!.walletId]).toBe("30000");

    // Invariante 6: as pernas não aparecem na lista de lançamentos da UI.
    await page.goto("/lancamentos");
    await expect(page.getByText("Nada por aqui ainda")).toBeVisible({ timeout: 10_000 });
  });

  test("prevista não altera saldos; efetivar depois altera", async ({ page, request }) => {
    await page.goto("/transferencias");
    await page.getByRole("button", { name: "Nova", exact: true }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByRole("combobox").nth(0).click();
    await page.getByRole("option", { name: /Banco F3/ }).click();
    await dialog.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: /Carteira F3/ }).click();
    await page.fill("#transfer-amount", "10000");
    await dialog.getByRole("button", { name: "Prevista" }).click();
    await page.getByRole("button", { name: "Transferir" }).click();
    await expect(page.getByText("Transferência criada")).toBeVisible({ timeout: 10_000 });

    let b = await balances(request);
    expect(b[ctx!.bankId]).toBe("70000"); // intacto

    // Efetivar pela lista (o pill de status PLANNED mostra "Previsto").
    const row = page.locator("li", { hasText: "Previsto" }).first();
    await row.getByRole("button", { name: "Ações da transferência" }).click();
    await page.getByRole("menuitem", { name: "Efetivar" }).click();
    await expect(page.getByText("efetivada", { exact: false }).first()).toBeVisible({
      timeout: 10_000,
    });

    b = await balances(request);
    expect(b[ctx!.bankId]).toBe("60000"); // 700 − 100
    expect(b[ctx!.walletId]).toBe("40000");
  });

  test("origem = destino é bloqueado", async ({ page }) => {
    await page.goto("/transferencias");
    await page.getByRole("button", { name: "Nova", exact: true }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByRole("combobox").nth(0).click();
    await page.getByRole("option", { name: /Banco F3/ }).click();
    await dialog.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: /Banco F3/ }).click();
    await page.fill("#transfer-amount", "1000");
    await expect(page.getByRole("button", { name: "Transferir" })).toBeDisabled();
  });
});
