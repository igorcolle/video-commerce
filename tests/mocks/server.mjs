// =====================================================================
// Servidor mock local (Node http) — responde no lugar do Supabase nos
// testes: Auth (GoTrue), REST (PostgREST) e Storage. Roda como um processo
// real, então o Next (Server Components E middleware/edge) e o navegador
// alcançam tudo por HTTP de verdade — sem interceptar fetch.
//
// Sobe via Playwright (webServer). Porta padrão 54321 (PORT para mudar).
// =====================================================================
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { makeDB, MOCK_USER, MOCK_SESSION } from "./fixtures.mjs";

const PORT = Number(process.env.MOCK_PORT || 54321);
let DB = makeDB();

const INSERT_DEFAULTS = {
  steps: {
    video_url: null,
    next_step_id: null,
    pos_x: 80,
    pos_y: 80,
    buttons_layout: "stack",
    button_template: "solid",
    button_color: "#1a1d21",
    button_opacity: 100,
    button_font_color: "#ffffff",
    button_font: "inter",
    button_border_color: "",
    button_shadow: "md",
    buttons_reveal_enabled: false,
    buttons_reveal_seconds: 5,
    question_position: "bottom",
    question_font_size: "lg",
    question_font_color: "#ffffff",
    question_bg_enabled: true,
    question_bg_color: "#000000",
    button_text_size: "md",
    result_cta: null,
    question_text: null,
    title: null,
  },
  options: { subtitle: null, icon: null, next_step_id: null, position: 0 },
  step_fields: { required: true, position: 0 },
  products: { photo_url: null, benefits: null, buy_link: null, whatsapp: null, buttons: [] },
  step_products: { position: 0 },
};

function applyFilters(rows, params) {
  let out = [...rows];
  for (const [key, raw] of params.entries()) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    const m = /^([a-z]+)\.([\s\S]*)$/.exec(raw);
    if (!m) continue;
    const [, op, val] = m;
    if (op === "eq") out = out.filter((r) => String(r[key]) === val);
    else if (op === "neq") out = out.filter((r) => String(r[key]) !== val);
    else if (op === "in") {
      const list = val.replace(/^\(/, "").replace(/\)$/, "").split(",").map((s) => s.replace(/^"|"$/g, ""));
      out = out.filter((r) => list.includes(String(r[key])));
    } else if (op === "is") {
      if (val === "null") out = out.filter((r) => r[key] == null);
      if (val === "false") out = out.filter((r) => r[key] === false);
      if (val === "true") out = out.filter((r) => r[key] === true);
    }
  }
  const order = params.get("order");
  if (order) {
    const [col, dir] = order.split(".");
    out.sort((a, b) => {
      if (a[col] < b[col]) return dir === "desc" ? 1 : -1;
      if (a[col] > b[col]) return dir === "desc" ? -1 : 1;
      return 0;
    });
  }
  const limit = params.get("limit");
  if (limit) out = out.slice(0, Number(limit));
  return out;
}

const wantsObject = (h) => (h.accept || "").includes("application/vnd.pgrst.object+json");
const wantsRepr = (h) => (h.prefer || "").includes("return=representation");

function handleRest(table, method, url, headers, rawBody) {
  const rows = DB[table] || (DB[table] = []);
  if (method === "GET") {
    const filtered = applyFilters(rows, url.searchParams);
    return wantsObject(headers)
      ? { status: 200, body: filtered[0] ?? null }
      : { status: 200, body: filtered };
  }
  if (method === "POST") {
    const parsed = rawBody ? JSON.parse(rawBody) : [];
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const defaults = INSERT_DEFAULTS[table] || {};
    const inserted = arr.map((row) => {
      const created = { ...defaults, id: randomUUID(), created_at: new Date().toISOString(), ...row };
      rows.push(created);
      return created;
    });
    if (wantsRepr(headers)) return { status: 201, body: wantsObject(headers) ? inserted[0] : inserted };
    return { status: 201, body: null };
  }
  if (method === "PATCH") {
    const patch = rawBody ? JSON.parse(rawBody) : {};
    const target = applyFilters(rows, url.searchParams);
    target.forEach((r) => Object.assign(r, patch));
    if (wantsRepr(headers)) return { status: 200, body: wantsObject(headers) ? target[0] ?? null : target };
    return { status: 200, body: null };
  }
  if (method === "DELETE") {
    const target = applyFilters(rows, url.searchParams);
    const set = new Set(target);
    DB[table] = rows.filter((r) => !set.has(r));
    return { status: wantsRepr(headers) ? 200 : 204, body: target };
  }
  return { status: 405, body: { message: "method not allowed" } };
}

// PNG 2x2 cinza (placeholder determinístico p/ fotos de produto).
const PNG_GRAY = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGNkYGD4z8DAwMAAAA8AAgEAe2WgUgAAAABJRU5ErkJggg==",
  "base64"
);

function send(res, status, body, contentType = "application/json") {
  res.writeHead(status, {
    "content-type": contentType,
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "*",
  });
  if (body === null || body === undefined) return res.end();
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname;
  const headers = {
    accept: req.headers["accept"],
    prefer: req.headers["prefer"],
  };

  if (req.method === "OPTIONS") return send(res, 204, null);
  if (path === "/health") return send(res, 200, { ok: true });

  // Reset do estado entre testes (chamado pelo Playwright).
  if (path === "/__reset") {
    DB = makeDB();
    return send(res, 200, { reset: true });
  }

  // Imagens de produto (placeholder fixo).
  if (path.startsWith("/img/")) return send(res, 200, PNG_GRAY, "image/png");

  // Auth (GoTrue).
  if (path === "/auth/v1/user") return send(res, 200, MOCK_USER);
  if (path === "/auth/v1/token") return send(res, 200, MOCK_SESSION);
  if (path === "/auth/v1/logout") return send(res, 204, null);
  if (path.startsWith("/auth/v1/")) return send(res, 200, {});

  // Storage (uploads não exercidos).
  if (path.startsWith("/storage/v1/")) return send(res, 200, { Key: "mock" });

  // REST (PostgREST).
  const rest = /^\/rest\/v1\/([^/?]+)/.exec(path);
  if (rest) {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        const { status, body } = handleRest(rest[1], req.method, url, headers, raw);
        send(res, status, body);
      } catch (e) {
        send(res, 500, { message: String(e) });
      }
    });
    return;
  }

  send(res, 200, {});
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock] Supabase mock em http://127.0.0.1:${PORT}`);
});
