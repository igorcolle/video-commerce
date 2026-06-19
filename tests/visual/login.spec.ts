import { test, expect } from "@playwright/test";
import { gotoStable } from "../support/helpers";

// Tela de login (sem autenticação). Roda nos projetos públicos.
test("admin login", async ({ page }) => {
  await gotoStable(page, "/admin/login");
  await expect(page.getByRole("heading", { name: "Entrar no painel" })).toBeVisible();
  await expect(page).toHaveScreenshot("admin-login.png");
});
