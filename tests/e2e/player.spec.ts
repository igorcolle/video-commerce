import { test, expect } from "@playwright/test";
import { stubImages } from "../support/helpers";

// E2E do caminho de um usuário real no player: ramificação por botão,
// formulário de coleta e tela de resultado com os CTAs corretos.

test("fluxo completo: pergunta → coleta → resultado", async ({ page }) => {
  await stubImages(page);
  await page.goto("/j/demo");

  // Etapa de pergunta → escolhe "Em casa" (vai para a coleta).
  await page.getByRole("button", { name: /Em casa/ }).click();

  // Etapa de coleta: preenche e continua.
  await expect(page.getByText("Deixe seu contato")).toBeVisible();
  await page.getByLabel("Nome completo").fill("Fulano de Tal");
  await page.getByLabel("WhatsApp").fill("62999999999");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();

  // Etapa de resultado: produtos + CTA geral configurável.
  await expect(page.getByRole("heading", { name: "Produto A" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Produto B" })).toBeVisible();

  const cta = page.getByRole("link", { name: "Falar com consultor" });
  await expect(cta).toHaveAttribute("href", /wa\.me\/5562999999999/);

  // Botões configuráveis do produto A: WhatsApp (wa.me) e link "Ver produto".
  const verProduto = page.getByRole("link", { name: "Ver produto" }).first();
  await expect(verProduto).toHaveAttribute("href", "https://exemplo.com/a");
});

test("ramificação direta: 'No trabalho' vai direto ao resultado", async ({ page }) => {
  await stubImages(page);
  await page.goto("/j/demo");
  await page.getByRole("button", { name: /No trabalho/ }).click();
  await expect(page.getByRole("heading", { name: "Produto A" })).toBeVisible();
});
