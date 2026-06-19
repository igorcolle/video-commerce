import { test, expect } from "@playwright/test";
import { buildWaLink, buildLeadMessage } from "../../lib/wa";
import {
  onlyDigits,
  maskWhatsapp,
  isValidWhatsapp,
  isValidEmail,
} from "../../lib/mask";
import {
  resolveButtonStyle,
  optionButtonVisual,
  optionsContainerClass,
  buttonTextSizeClass,
} from "../../lib/buttonStyle";
import { productCtaButtons } from "../../lib/productButtons";
import type { Step, Product } from "../../lib/supabase";

// Testes de caracterização: travam a SAÍDA ATUAL das funções centrais.
// Não rodam no navegador (lógica pura). Snapshots gerados na 1ª execução.

test.describe("lib/wa", () => {
  test("buildWaLink limpa o número e codifica a mensagem", () => {
    expect(buildWaLink("(62) 99999-9999", "Olá, mundo!")).toBe(
      "https://wa.me/62999999999?text=Ol%C3%A1%2C%20mundo!"
    );
  });

  test("buildLeadMessage monta o resumo do lead", () => {
    const msg = buildLeadMessage(
      "Jornada Demo",
      { Uso: "Em casa", Área: "Pequena" },
      ["Produto A", "Produto B"]
    );
    expect(msg).toMatchSnapshot("lead-message.txt");
  });
});

test.describe("lib/mask", () => {
  test("onlyDigits", () => {
    expect(onlyDigits("(62) 99999-9999")).toBe("6299999999999".slice(0, 11));
  });
  test("maskWhatsapp progressivo", () => {
    const out = ["6", "62", "6299", "629999", "6299999999", "62999999999"].map(
      maskWhatsapp
    );
    expect(JSON.stringify(out, null, 2)).toMatchSnapshot("mask-whatsapp.txt");
  });
  test("isValidWhatsapp", () => {
    expect(isValidWhatsapp("6299999999")).toBe(true); // 10
    expect(isValidWhatsapp("62999999999")).toBe(true); // 11
    expect(isValidWhatsapp("629999")).toBe(false);
  });
  test("isValidEmail", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
    expect(isValidEmail("semarroba")).toBe(false);
    expect(isValidEmail("@x")).toBe(false);
    expect(isValidEmail("x@")).toBe(false);
  });
});

test.describe("lib/buttonStyle", () => {
  test("resolveButtonStyle aplica defaults para etapa vazia", () => {
    const s = resolveButtonStyle({} as Step);
    expect(JSON.stringify(s, null, 2)).toMatchSnapshot("resolve-defaults.txt");
  });

  test("optionButtonVisual (solid) gera className+style", () => {
    const v = optionButtonVisual({
      button_template: "solid",
      button_color: "#1a1d21",
      button_opacity: 100,
      button_font_color: "#ffffff",
    } as Step);
    expect(JSON.stringify(v, null, 2)).toMatchSnapshot("visual-solid.txt");
  });

  test("optionsContainerClass e buttonTextSizeClass", () => {
    expect(optionsContainerClass("stack")).toMatchSnapshot("container-stack.txt");
    expect(optionsContainerClass("grid")).toMatchSnapshot("container-grid.txt");
    expect(JSON.stringify(buttonTextSizeClass("md"))).toMatchSnapshot(
      "text-size-md.txt"
    );
  });
});

test.describe("lib/productButtons", () => {
  const base = { id: "p", journey_id: "j", name: "P", photo_url: null } as Product;

  test("usa os botões quando existem", () => {
    const btns = [{ kind: "whatsapp", label: "Zap", value: "5562" }] as Product["buttons"];
    expect(productCtaButtons({ ...base, buttons: btns, buy_link: "x" })).toEqual(btns);
  });
  test("cai para 'Ver produto' quando não há botões mas há link", () => {
    expect(
      productCtaButtons({ ...base, buttons: [], buy_link: "https://x" })
    ).toEqual([{ kind: "custom", label: "Ver produto", value: "https://x" }]);
  });
  test("vazio quando não há botões nem link", () => {
    expect(productCtaButtons({ ...base, buttons: [], buy_link: null })).toEqual([]);
  });
});
