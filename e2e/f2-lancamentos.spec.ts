// Fase 2 — invariantes do produto exercitados pela UI real:
//  1. PLANNED nunca afeta saldo
//  2. Baixa debita o valor PAGO (pode diferir do previsto)
//  3. Compra no cartão vai para a fatura e NUNCA toca o caixa
//  4. Rateio só salva com soma exata (submit bloqueado)
//  5. Parcelamento 3x soma exato, resto na última

import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { API, apiGet, apiLogin, apiPost, uniqueEmail, type Tokens } from "./helpers";

interface SeedContext {
  email: string;
  tokens: Tokens;
  entityId: string;
  bankId: string;
  cardId: string;
}

let ctx: SeedContext | null = null;

/** Usuário/entidade/contas frescos para a suíte (uma vez; workers=1). */
async function seed(request: APIRequestContext): Promise<SeedContext> {
  if (ctx) return ctx;
  const email = uniqueEmail("f2");
  const password = "senha12345";
  const signup = await request.post(`${API}/auth/signup`, {
    data: { name: "Usuário F2", email, password, baseCurrency: "BRL", locale: "pt-BR" },
  });
  if (!signup.ok()) throw new Error(`signup: ${await signup.text()}`);
  const tokens = await apiLogin(request, { email, password });
  const entity = await apiPost<{ id: string }>(request, tokens, "/entities", {
    name: "Casa F2",
    type: "PERSONAL",
  });
  const bank = await apiPost<{ id: string }>(request, tokens, "/me/accounts", {
    name: "Banco F2",
    type: "BANK",
    currency: "BRL",
    initialBalance: "100000", // R$ 1.000,00
  });
  const card = await apiPost<{ id: string }>(request, tokens, "/me/accounts", {
    name: "Cartão F2",
    type: "CREDIT_CARD",
    currency: "BRL",
    initialBalance: "0",
    creditLimit: "500000",
    statementClosingDay: 28,
    dueDay: 10,
  });
  ctx = { email, tokens, entityId: entity.id, bankId: bank.id, cardId: card.id };
  return ctx;
}

async function bankBalance(request: APIRequestContext): Promise<string> {
  const accounts = await apiGet<Array<{ id: string; currentBalance: string }>>(
    request,
    ctx!.tokens,
    `/entities/${ctx!.entityId}/accounts`,
  );
  return accounts.find((a) => a.id === ctx!.bankId)!.currentBalance;
}

async function loginUI(page: Page) {
  const seeded = ctx!;
  await page.addInitScript(
    ([access, refresh, entityId]) => {
      localStorage.setItem("frisby.access_token", access);
      localStorage.setItem("frisby.refresh_token", refresh);
      localStorage.setItem("frisby.currentEntityId", entityId);
    },
    [seeded.tokens.accessToken, seeded.tokens.refreshToken, seeded.entityId],
  );
}

/** Abre o form "Novo", preenche valor/conta/categoria/descrição. */
async function fillBasicForm(
  page: Page,
  opts: { amount: string; accountName?: string; description: string },
) {
  await page.getByRole("button", { name: "Novo", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.fill("#tx-amount", opts.amount);
  if (opts.accountName) {
    await dialog.getByRole("combobox").nth(0).click();
    await page.getByRole("option", { name: new RegExp(opts.accountName) }).click();
  }
  await dialog.getByRole("combobox").nth(1).click();
  await page.getByRole("option").first().click();
  await page.fill("#tx-description", opts.description);
  return dialog;
}

test.describe.serial("F2 — lançamentos e invariantes", () => {
  test.beforeEach(async ({ page, request }) => {
    await seed(request);
    await loginUI(page);
  });

  test("1. PLANNED não mexe no saldo", async ({ page, request }) => {
    await page.goto("/lancamentos");
    await fillBasicForm(page, {
      amount: "25000",
      accountName: "Banco F2",
      description: "Conta de luz F2",
    });
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText("Lançamento previsto criado")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("table").getByText("Conta de luz F2")).toBeVisible();

    expect(await bankBalance(request)).toBe("100000"); // intacto
  });

  test("2. baixa debita o valor PAGO (diferente do previsto)", async ({ page, request }) => {
    await page.goto("/lancamentos");
    const row = page.getByRole("row", { name: /Conta de luz F2/ });
    await row.getByRole("button", { name: "Ações do lançamento" }).click();
    await page.getByRole("menuitem", { name: "Dar baixa" }).click();

    await page.fill("#settle-amount", "20000"); // paga R$ 200 em vez de R$ 250
    await page.getByRole("button", { name: "Confirmar baixa" }).click();
    await expect(page.getByText("Lançamento baixado")).toBeVisible({ timeout: 10_000 });

    expect(await bankBalance(request)).toBe("80000"); // 1000,00 − 200,00
  });

  test("3. compra no cartão vai para a fatura e não toca o caixa", async ({ page, request }) => {
    await page.goto("/lancamentos");
    const dialog = await fillBasicForm(page, {
      amount: "9900",
      accountName: "Cartão F2",
      description: "Streaming F2",
    });
    // Aviso de fatura + status oculto (trava PLANNED).
    await expect(dialog.getByText("entra na fatura de", { exact: false })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Baixado" })).toHaveCount(0);

    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText("Lançamento previsto criado")).toBeVisible({ timeout: 10_000 });

    expect(await bankBalance(request)).toBe("80000"); // caixa intacto
    const invoices = await apiGet<Array<{ calculatedAmount: string }>>(
      request,
      ctx!.tokens,
      `/accounts/${ctx!.cardId}/invoices`,
    );
    expect(invoices.length).toBeGreaterThan(0);
    expect(invoices.map((i) => i.calculatedAmount)).toContain("9900");
  });

  test("4. rateio que não fecha bloqueia o salvar", async ({ page }) => {
    await page.goto("/lancamentos");
    const dialog = await fillBasicForm(page, { amount: "10000", description: "Rateio F2" });

    await dialog.getByRole("button", { name: "Membros" }).click();
    // Seleciona o único membro e muda para modo Valor com soma errada.
    await dialog.getByRole("checkbox").first().click();
    await dialog.getByRole("button", { name: "Valor", exact: true }).click();
    const shareInput = dialog.locator('input[inputmode="numeric"]').last();
    await shareInput.fill("5000");

    await expect(dialog.getByText("Faltam", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar", exact: true })).toBeDisabled();

    // Igualar fecha o rateio e libera.
    await dialog.getByRole("button", { name: "Igual" }).click();
    await expect(dialog.getByText("Rateio fechado")).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar", exact: true })).toBeEnabled();
    await page.keyboard.press("Escape");
  });

  test("5. parcelamento 3x com soma exata e resto na última", async ({ page, request }) => {
    await page.goto("/lancamentos");
    const dialog = await fillBasicForm(page, {
      amount: "10000", // R$ 100,00 / 3 = 33,33 + 33,33 + 33,34
      accountName: "Cartão F2",
      description: "Curso F2",
    });
    await dialog.getByLabel("Parcelar").click();
    await dialog.getByLabel("Número de parcelas").fill("3");
    await expect(dialog.getByText("3x de R$ 33,33", { exact: false })).toBeVisible();
    await expect(dialog.getByText("última de R$ 33,34", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText("parcelada em 3x", { exact: false })).toBeVisible({
      timeout: 10_000,
    });

    // Backend: 3 transações do grupo somando exatamente 10000.
    const txs = await apiGet<Array<{ amount: string; installmentNumber: number | null }>>(
      request,
      ctx!.tokens,
      `/entities/${ctx!.entityId}/transactions?pageSize=100`,
    );
    const parts = txs.filter((t) => t.installmentNumber !== null).map((t) => BigInt(t.amount));
    expect(parts).toHaveLength(3);
    expect(parts.reduce((a, b) => a + b, 0n)).toBe(10000n);

    // Badge 1/3 visível na lista.
    await expect(page.getByRole("table").getByText("1/3").first()).toBeVisible();
  });
});
