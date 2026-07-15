// Fase 1: signup → onboarding (entidade + conta) → dashboard; fluxos de
// esqueci a senha e reset com token inválido.

import { test, expect } from "@playwright/test";
import { uniqueEmail } from "./helpers";

test.describe("F1 — auth completo + onboarding", () => {
  test("signup → onboarding cria Casa e conta → dashboard", async ({ page }) => {
    const email = uniqueEmail("signup");

    await page.goto("/signup");
    await page.fill("#name", "Novo Usuário E2E");
    await page.fill("#email", email);
    await page.fill("#password", "senha12345");
    await page.click('button[type="submit"]');

    // Sem entidades → guard manda para o onboarding.
    await page.waitForURL("**/onboarding", { timeout: 15_000 });
    await expect(page.getByText("Vamos começar pela sua entidade")).toBeVisible();

    await page.getByRole("button", { name: "Casa" }).click();
    await page.fill("#entity-name", "Casa E2E");
    await page.getByRole("button", { name: "Continuar" }).click();

    // Passo 2 — primeira conta.
    await expect(page.getByText("Sua primeira conta")).toBeVisible({ timeout: 10_000 });
    await page.fill("#account-name", "Banco E2E");
    await page.fill("#initial-balance", "100000"); // R$ 1.000,00
    await page.getByRole("button", { name: "Criar conta" }).click();

    // Dashboard com a entidade nova.
    await page.waitForURL((u) => u.pathname === "/", { timeout: 15_000 });
    await expect(page.getByText("Casa E2E").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Banco E2E").first()).toBeVisible();
  });

  test("signup com botão Pular no passo da conta", async ({ page }) => {
    const email = uniqueEmail("skip");
    await page.goto("/signup");
    await page.fill("#name", "Usuário Pula Conta");
    await page.fill("#email", email);
    await page.fill("#password", "senha12345");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/onboarding", { timeout: 15_000 });
    await page.fill("#entity-name", "Casa Sem Conta");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Sua primeira conta")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Pular" }).click();
    await page.waitForURL((u) => u.pathname === "/", { timeout: 15_000 });
  });

  test("esqueci a senha mostra resposta neutra", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.fill("#email", "qualquer@example.com");
    await page.getByRole("button", { name: "Enviar link" }).click();
    await expect(page.getByText("você receberá um e-mail", { exact: false })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("reset com token inválido mostra erro", async ({ page }) => {
    await page.goto("/reset-password?token=token-invalido");
    await page.fill("#password", "novasenha123");
    await page.fill("#confirm", "novasenha123");
    await page.getByRole("button", { name: "Redefinir senha" }).click();
    await expect(page.getByText("inválido ou expirado", { exact: false })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("verify-email com token inválido mostra erro", async ({ page }) => {
    await page.goto("/verify-email?token=token-invalido");
    await expect(page.getByText("inválido ou expirado", { exact: false })).toBeVisible({
      timeout: 10_000,
    });
  });
});
