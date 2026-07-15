// Smoke de regressão da Fase 0: o split move-only da camada de API não pode
// ter mudado comportamento — as telas existentes continuam carregando dados.

import { test, expect } from "@playwright/test";
import { loginViaApi } from "./helpers";

test.describe("smoke pós-split", () => {
  test("login por formulário continua funcionando e redireciona", async ({ page }) => {
    await page.goto("/auth");
    await page.fill("#email", "teste.frisby@example.com");
    await page.fill("#password", "senha12345");
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 10_000 });
    await expect(page.getByText("Bom dia", { exact: false })).toBeVisible();
  });

  test("dashboard carrega dados reais (entidade, contas, lançamentos)", async ({ page }) => {
    await loginViaApi(page);
    await page.goto("/");
    await expect(page.getByText("Casa Teste").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Banco Teste").first()).toBeVisible();
  });

  test("lançamentos e relatórios renderizam", async ({ page }) => {
    await loginViaApi(page);
    await page.goto("/lancamentos");
    // Em desktop a lista mobile fica oculta — mirar a tabela.
    await expect(page.getByRole("table").getByText("Mercado teste")).toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/relatorios");
    await expect(page.getByText("Fluxo de caixa").first()).toBeVisible({ timeout: 10_000 });
  });

  test("rota protegida sem sessão volta ao login com redirect", async ({ page }) => {
    await page.goto("/lancamentos");
    await page.waitForURL((u) => u.pathname.startsWith("/auth"), { timeout: 10_000 });
    expect(page.url()).toContain("redirect=%2Flancamentos");
  });
});
