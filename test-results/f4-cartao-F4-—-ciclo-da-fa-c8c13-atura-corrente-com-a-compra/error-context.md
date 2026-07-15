# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: f4-cartao.spec.ts >> F4 — ciclo da fatura do cartão >> detalhe mostra limite usado e fatura corrente com a compra
- Location: e2e/f4-cartao.spec.ts:82:3

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:3001
Call log:
  - → POST http://127.0.0.1:3001/auth/signup
    - user-agent: Playwright/1.61.1 (x64; ubuntu 24.04) node/24.18
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - content-type: application/json
    - content-length: 128

```

# Test source

```ts
  1   | // Fase 4 — ciclo completo do cartão pela UI:
  2   | // comprar → fatura OPEN cresce → fechar (congela) → pagar PARCIAL →
  3   | // caixa debita o PAGO (invariante 8) → diferença ROLA para a próxima fatura.
  4   | 
  5   | import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
  6   | import { API, apiGet, apiLogin, apiPost, uniqueEmail, type Tokens } from "./helpers";
  7   | 
  8   | interface SeedContext {
  9   |   tokens: Tokens;
  10  |   entityId: string;
  11  |   bankId: string;
  12  |   cardId: string;
  13  | }
  14  | 
  15  | let ctx: SeedContext | null = null;
  16  | 
  17  | async function seed(request: APIRequestContext): Promise<SeedContext> {
  18  |   if (ctx) return ctx;
  19  |   const email = uniqueEmail("f4");
  20  |   const password = "senha12345";
> 21  |   await request.post(`${API}/auth/signup`, {
      |                 ^ Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:3001
  22  |     data: { name: "Usuário F4", email, password, baseCurrency: "BRL", locale: "pt-BR" },
  23  |   });
  24  |   const tokens = await apiLogin(request, { email, password });
  25  |   const entity = await apiPost<{ id: string }>(request, tokens, "/entities", {
  26  |     name: "Casa F4",
  27  |     type: "PERSONAL",
  28  |   });
  29  |   const bank = await apiPost<{ id: string }>(request, tokens, "/me/accounts", {
  30  |     name: "Banco F4",
  31  |     type: "BANK",
  32  |     currency: "BRL",
  33  |     initialBalance: "200000", // R$ 2.000,00
  34  |   });
  35  |   const card = await apiPost<{ id: string }>(request, tokens, "/me/accounts", {
  36  |     name: "Hipercard F4",
  37  |     type: "CREDIT_CARD",
  38  |     currency: "BRL",
  39  |     initialBalance: "0",
  40  |     creditLimit: "300000",
  41  |     statementClosingDay: 28,
  42  |     dueDay: 10,
  43  |   });
  44  |   // Compra de R$ 124,47 no cartão (o cenário clássico do manual).
  45  |   const cats = await apiGet<Array<{ id: string; type: string }>>(
  46  |     request,
  47  |     tokens,
  48  |     `/entities/${entity.id}/categories`,
  49  |   );
  50  |   const expenseCat = cats.find((c) => c.type === "EXPENSE")!;
  51  |   await apiPost(request, tokens, `/entities/${entity.id}/transactions`, {
  52  |     type: "EXPENSE",
  53  |     accountId: card.id,
  54  |     categoryId: expenseCat.id,
  55  |     amount: "12447",
  56  |     description: "Compras do mês F4",
  57  |     competenceDate: new Date().toISOString().slice(0, 10),
  58  |     status: "PLANNED",
  59  |     scope: "ENTITY",
  60  |   });
  61  |   ctx = { tokens, entityId: entity.id, bankId: bank.id, cardId: card.id };
  62  |   return ctx;
  63  | }
  64  | 
  65  | async function loginUI(page: Page) {
  66  |   await page.addInitScript(
  67  |     ([access, refresh, entityId]) => {
  68  |       localStorage.setItem("frisby.access_token", access);
  69  |       localStorage.setItem("frisby.refresh_token", refresh);
  70  |       localStorage.setItem("frisby.currentEntityId", entityId);
  71  |     },
  72  |     [ctx!.tokens.accessToken, ctx!.tokens.refreshToken, ctx!.entityId],
  73  |   );
  74  | }
  75  | 
  76  | test.describe.serial("F4 — ciclo da fatura do cartão", () => {
  77  |   test.beforeEach(async ({ page, request }) => {
  78  |     await seed(request);
  79  |     await loginUI(page);
  80  |   });
  81  | 
  82  |   test("detalhe mostra limite usado e fatura corrente com a compra", async ({ page }) => {
  83  |     await page.goto(`/cartoes/${ctx!.cardId}`);
  84  |     await expect(page.getByText("Hipercard F4").first()).toBeVisible({ timeout: 10_000 });
  85  |     // Limite: usado R$ 124,47 de R$ 3.000,00.
  86  |     await expect(page.getByText("Usado", { exact: false })).toContainText("124,47");
  87  |     await expect(page.getByText("Fatura corrente")).toBeVisible();
  88  |     // Compras no detalhe da fatura.
  89  |     await page.getByRole("button", { name: "Ver compras" }).first().click();
  90  |     await expect(page.getByText("Compras do mês F4")).toBeVisible();
  91  |     await page.keyboard.press("Escape");
  92  |   });
  93  | 
  94  |   test("fechar fatura congela e habilita pagamento", async ({ page }) => {
  95  |     await page.goto(`/cartoes/${ctx!.cardId}`);
  96  |     await page.getByRole("button", { name: "Fechar fatura" }).click();
  97  |     await page.getByRole("button", { name: "Fechar fatura" }).last().click(); // confirmar
  98  |     await expect(page.getByText("Fatura fechada", { exact: false })).toBeVisible({
  99  |       timeout: 10_000,
  100 |     });
  101 |     await expect(page.getByRole("button", { name: "Pagar", exact: true })).toBeVisible();
  102 |   });
  103 | 
  104 |   test("pagamento parcial: caixa debita o pago; resto ROLA para a próxima", async ({
  105 |     page,
  106 |     request,
  107 |   }) => {
  108 |     await page.goto(`/cartoes/${ctx!.cardId}`);
  109 |     await page.getByRole("button", { name: "Pagar", exact: true }).click();
  110 | 
  111 |     // Paga R$ 100,00 de R$ 124,47 — frase viva do rollover.
  112 |     await page.fill("#pay-amount", "10000");
  113 |     await expect(page.getByText("rolam para a próxima fatura", { exact: false })).toBeVisible();
  114 |     await expect(page.getByText("R$ 24,47", { exact: false }).first()).toBeVisible();
  115 | 
  116 |     const dialog = page.getByRole("dialog");
  117 |     await dialog.getByRole("combobox").first().click();
  118 |     await page.getByRole("option", { name: /Banco F4/ }).click();
  119 |     await page.getByRole("button", { name: "Confirmar pagamento" }).click();
  120 |     await expect(page.getByText("Pagamento registrado")).toBeVisible({ timeout: 10_000 });
  121 | 
```