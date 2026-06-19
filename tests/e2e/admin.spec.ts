import { test, expect } from "@playwright/test";
import { stubImages } from "../support/helpers";
import { IDS } from "../mocks/fixtures.mjs";

const MOCK = "http://127.0.0.1:54321";
const EDITOR = `/admin/jornadas/${IDS.journey}`;

test.beforeEach(async ({ request }) => {
  await request.post(`${MOCK}/__reset`);
});

test("editor carrega as etapas da jornada", async ({ page }) => {
  await stubImages(page);
  await page.goto(EDITOR);
  await expect(page.locator(".react-flow__node", { hasText: "Uso" })).toBeVisible();
  await expect(page.locator(".react-flow__node", { hasText: "Seus dados" })).toBeVisible();
  await expect(page.locator(".react-flow__node").filter({ hasText: "Resultado" })).toBeVisible();
  await expect(page.locator(".react-flow__node")).toHaveCount(3);
});

test("adicionar etapa cria um novo bloco", async ({ page }) => {
  await stubImages(page);
  await page.goto(EDITOR);
  await expect(page.locator(".react-flow__node")).toHaveCount(3);
  await page.getByRole("button", { name: "+ Etapa de pergunta" }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(4);
});

test("duplicar etapa pelo ícone do card", async ({ page }) => {
  await stubImages(page);
  await page.goto(EDITOR);
  await expect(page.locator(".react-flow__node")).toHaveCount(3);
  await page.getByRole("button", { name: "Duplicar etapa" }).first().click();
  await expect(page.locator(".react-flow__node")).toHaveCount(4);
});

test("seção de produtos: rótulos e editor de botões", async ({ page }) => {
  await stubImages(page);
  await page.goto(EDITOR);
  await expect(page.getByText("Descrição").first()).toBeVisible();
  await expect(page.getByText("Link", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Botões de ação (até 2)").first()).toBeVisible();
});
