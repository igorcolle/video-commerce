import { test as setup } from "@playwright/test";
import path from "node:path";

// Faz login uma vez e salva o estado autenticado (cookie de sessão) para os
// testes de admin reusarem. O endpoint de token é servido pelo mock.
export const ADMIN_STATE = path.join(__dirname, ".auth", "admin.json");

setup("authenticate admin", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill("admin@teste.com");
  await page.getByLabel("Senha").fill("senha-teste");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/admin/jornadas", { timeout: 20_000 });
  await page.context().storageState({ path: ADMIN_STATE });
});
