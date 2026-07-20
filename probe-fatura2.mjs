import { chromium } from "playwright";

const API = "http://127.0.0.1:3001";
const user = { email: "teste.frisby@example.com", password: "senha12345" };

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message));

const loginRes = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(user),
});
const tokens = await loginRes.json();
await page.addInitScript(
  ([access, refresh]) => {
    localStorage.setItem("frisby.access_token", access);
    localStorage.setItem("frisby.refresh_token", refresh);
  },
  [tokens.accessToken, tokens.refreshToken],
);

await page.goto("http://localhost:8081/lancamentos");
await page.waitForTimeout(2000);

await page.getByRole("button", { name: /importar/i }).first().click();
await page.waitForTimeout(300);
await page.getByRole("menuitem", { name: /importar lançamentos/i }).click();
await page.waitForTimeout(800);

await page.getByRole("combobox").first().click();
await page.waitForTimeout(300);
await page.getByRole("option", { name: /cartão teste ux/i }).click();
await page.waitForTimeout(800);

// Escolher a fatura (deve ter pelo menos uma opção "Fatura 2026-07")
const invoiceTrigger = page.getByText("Escolha a fatura");
await invoiceTrigger.click();
await page.waitForTimeout(400);
await page.screenshot({ path: "fatura-2-lista-faturas.png" });

await page.getByRole("option", { name: /fatura 2026-07/i }).click();
await page.waitForTimeout(400);

// Colar linha do Sapato (que já foi importada antes — deve acusar duplicata)
// mais uma nova, diferente
const textarea = page.locator("textarea").first();
await textarea.fill(
  "2026-02-15;SAPATO LOJA DO SAPATEIRO;6;8;60,00\n2026-07-15;COMPRA NOVA TESTE;;;25,00",
);
await page.waitForTimeout(600);
await page.screenshot({ path: "fatura-3-preview-duplicata.png", fullPage: true });

await browser.close();
