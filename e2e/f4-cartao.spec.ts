// Fase 4 — ciclo completo do cartão pela UI:
// comprar → fatura OPEN cresce → fechar (congela) → pagar PARCIAL →
// caixa debita o PAGO (invariante 8) → diferença ROLA para a próxima fatura.

import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { API, apiGet, apiLogin, apiPost, uniqueEmail, type Tokens } from "./helpers";

interface SeedContext {
  tokens: Tokens;
  entityId: string;
  bankId: string;
  cardId: string;
}

let ctx: SeedContext | null = null;

async function seed(request: APIRequestContext): Promise<SeedContext> {
  if (ctx) return ctx;
  const email = uniqueEmail("f4");
  const password = "senha12345";
  await request.post(`${API}/auth/signup`, {
    data: { name: "Usuário F4", email, password, baseCurrency: "BRL", locale: "pt-BR" },
  });
  const tokens = await apiLogin(request, { email, password });
  const entity = await apiPost<{ id: string }>(request, tokens, "/entities", {
    name: "Casa F4",
    type: "PERSONAL",
  });
  const bank = await apiPost<{ id: string }>(request, tokens, "/me/accounts", {
    name: "Banco F4",
    type: "BANK",
    currency: "BRL",
    initialBalance: "200000", // R$ 2.000,00
  });
  const card = await apiPost<{ id: string }>(request, tokens, "/me/accounts", {
    name: "Hipercard F4",
    type: "CREDIT_CARD",
    currency: "BRL",
    initialBalance: "0",
    creditLimit: "300000",
    statementClosingDay: 28,
    dueDay: 10,
  });
  // Compra de R$ 124,47 no cartão (o cenário clássico do manual).
  const cats = await apiGet<Array<{ id: string; type: string }>>(
    request,
    tokens,
    `/entities/${entity.id}/categories`,
  );
  const expenseCat = cats.find((c) => c.type === "EXPENSE")!;
  await apiPost(request, tokens, `/entities/${entity.id}/transactions`, {
    type: "EXPENSE",
    accountId: card.id,
    categoryId: expenseCat.id,
    amount: "12447",
    description: "Compras do mês F4",
    competenceDate: new Date().toISOString().slice(0, 10),
    status: "PLANNED",
    scope: "ENTITY",
  });
  ctx = { tokens, entityId: entity.id, bankId: bank.id, cardId: card.id };
  return ctx;
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

test.describe.serial("F4 — ciclo da fatura do cartão", () => {
  test.beforeEach(async ({ page, request }) => {
    await seed(request);
    await loginUI(page);
  });

  test("detalhe mostra limite usado e fatura corrente com a compra", async ({ page }) => {
    await page.goto(`/cartoes/${ctx!.cardId}`);
    await expect(page.getByText("Hipercard F4").first()).toBeVisible({ timeout: 10_000 });
    // Limite: usado R$ 124,47 de R$ 3.000,00.
    await expect(page.getByText("Usado", { exact: false })).toContainText("124,47");
    await expect(page.getByText("Fatura corrente")).toBeVisible();
    // Compras no detalhe da fatura.
    await page.getByRole("button", { name: "Ver compras" }).first().click();
    await expect(page.getByText("Compras do mês F4")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("fechar fatura congela e habilita pagamento", async ({ page }) => {
    await page.goto(`/cartoes/${ctx!.cardId}`);
    await page.getByRole("button", { name: "Fechar fatura" }).click();
    await page.getByRole("button", { name: "Fechar fatura" }).last().click(); // confirmar
    await expect(page.getByText("Fatura fechada", { exact: false })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: "Pagar", exact: true })).toBeVisible();
  });

  test("pagamento parcial: caixa debita o pago; resto ROLA para a próxima", async ({
    page,
    request,
  }) => {
    await page.goto(`/cartoes/${ctx!.cardId}`);
    await page.getByRole("button", { name: "Pagar", exact: true }).click();

    // Paga R$ 100,00 de R$ 124,47 — frase viva do rollover.
    await page.fill("#pay-amount", "10000");
    await expect(page.getByText("rolam para a próxima fatura", { exact: false })).toBeVisible();
    await expect(page.getByText("R$ 24,47", { exact: false }).first()).toBeVisible();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox").first().click();
    await page.getByRole("option", { name: /Banco F4/ }).click();
    await page.getByRole("button", { name: "Confirmar pagamento" }).click();
    await expect(page.getByText("Pagamento registrado")).toBeVisible({ timeout: 10_000 });

    // Invariante 8: caixa debitou APENAS o pago (R$ 100,00).
    const accounts = await apiGet<Array<{ id: string; currentBalance: string }>>(
      request,
      ctx!.tokens,
      `/entities/${ctx!.entityId}/accounts`,
    );
    expect(accounts.find((a) => a.id === ctx!.bankId)!.currentBalance).toBe("190000");

    // Fatura PARTIAL + rollover de R$ 24,47 na próxima.
    const invoices = await apiGet<
      Array<{ status: string; carriedBalance: string; calculatedAmount: string }>
    >(request, ctx!.tokens, `/accounts/${ctx!.cardId}/invoices`);
    expect(invoices.some((i) => i.status === "PARTIAL")).toBe(true);
    expect(invoices.some((i) => i.carriedBalance === "2447")).toBe(true);
  });

  test("criar e arquivar conta pela tela de Contas", async ({ page }) => {
    await page.goto("/contas");
    await page.getByRole("button", { name: "Nova conta" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Carteira" }).click();
    await page.fill("#account-form-name", "Carteira Descartável F4");
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText("Conta criada")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Carteira Descartável F4")).toBeVisible();

    // Arquivar (sem movimento → permitido).
    await page.getByRole("button", { name: "Ações da conta Carteira Descartável F4" }).click();
    await page.getByRole("menuitem", { name: "Arquivar" }).click();
    await page.getByRole("button", { name: "Arquivar", exact: true }).last().click();
    await expect(page.getByText("arquivada", { exact: false })).toBeVisible({ timeout: 10_000 });
  });
});
