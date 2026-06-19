import type { Page } from "@playwright/test";

// PNG 2x2 cinza — placeholder determinístico para qualquer imagem externa.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGNkYGD4z8DAwMAAAA8AAgEAe2WgUgAAAABJRU5ErkJggg==",
  "base64"
);

// Congela animações/transições e desliga o caret — screenshots estáveis.
const FREEZE_CSS = `*,*::before,*::after{animation:none!important;animation-duration:0s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}`;

// Stub de imagens (precisa ser chamado ANTES de navegar).
export async function stubImages(page: Page) {
  await page.route(/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i, (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PNG })
  );
}

// Depois de navegar: espera fontes, congela animações e pausa vídeos.
export async function settle(page: Page) {
  await page.evaluate(() => (document as Document).fonts?.ready);
  await page.addStyleTag({ content: FREEZE_CSS });
  await page.evaluate(() => {
    document.querySelectorAll("video").forEach((v) => {
      try {
        v.pause();
        v.removeAttribute("autoplay");
        v.currentTime = 0;
      } catch {
        /* ignore */
      }
    });
  });
  // Pequena folga para o layout assentar após o freeze.
  await page.waitForTimeout(150);
}

// Navega com imagens stubadas e UI estabilizada.
export async function gotoStable(page: Page, url: string) {
  await stubImages(page);
  await page.goto(url, { waitUntil: "networkidle" });
  await settle(page);
}
