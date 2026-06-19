import { test, expect } from "@playwright/test";
import { gotoStable, settle } from "../support/helpers";
import { IDS } from "../mocks/fixtures.mjs";

const MOCK = "http://127.0.0.1:54321";
const EDITOR = `/admin/jornadas/${IDS.journey}`;

// Regressão visual do ADMIN (autenticado via storageState do projeto).
test.beforeEach(async ({ request }) => {
  await request.post(`${MOCK}/__reset`); // base de dados limpa antes de cada teste
});

test("lista de jornadas", async ({ page }) => {
  await gotoStable(page, "/admin/jornadas");
  await expect(page.getByText("Jornada Demo")).toBeVisible();
  await expect(page).toHaveScreenshot("admin-journeys.png", { fullPage: true });
});

test("editor (canvas + produtos)", async ({ page }) => {
  await gotoStable(page, EDITOR);
  await expect(page.getByText("Resultado", { exact: true }).first()).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("admin-editor.png", { fullPage: true });
});

test("editor em tema escuro", async ({ page }) => {
  await gotoStable(page, EDITOR);
  await page.getByRole("button", { name: "Mudar para tema escuro" }).click();
  await settle(page);
  await expect(page).toHaveScreenshot("admin-editor-dark.png", { fullPage: true });
});

test("editor com etapa selecionada (inspector)", async ({ page }) => {
  await gotoStable(page, EDITOR);
  await page.locator(".react-flow__node", { hasText: "Uso" }).click();
  await expect(page.getByRole("heading", { name: "Editar etapa" })).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("admin-inspector.png", { fullPage: true });
});
