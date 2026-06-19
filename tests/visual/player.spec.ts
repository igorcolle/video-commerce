import { test, expect } from "@playwright/test";
import { gotoStable, settle } from "../support/helpers";

// Regressão visual do PLAYER público (sem autenticação). Roda em desktop e
// mobile (projetos do playwright.config). Trava a aparência atual de cada tela.

test.describe("player visual", () => {
  test("etapa de pergunta", async ({ page }) => {
    await gotoStable(page, "/j/demo");
    await expect(page.getByRole("button", { name: /Em casa/ })).toBeVisible();
    await expect(page).toHaveScreenshot("player-question.png");
  });

  test("carrinho de produtos aberto", async ({ page }) => {
    await gotoStable(page, "/j/demo");
    await page.getByRole("button", { name: "Produtos" }).click();
    await expect(page.getByRole("heading", { name: "Produto A" })).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("player-cart.png");
  });

  test("etapa de coleta de dados", async ({ page }) => {
    await gotoStable(page, "/j/demo");
    await page.getByRole("button", { name: /Em casa/ }).click();
    await expect(page.getByText("Deixe seu contato")).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("player-collect.png");
  });

  test("etapa de resultado", async ({ page }) => {
    await gotoStable(page, "/j/demo");
    await page.getByRole("button", { name: /No trabalho/ }).click();
    await expect(page.getByRole("heading", { name: "Produto A" })).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("player-result.png");
  });
});
