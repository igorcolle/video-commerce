/* =====================================================================
 * widget.js — carregador do widget flutuante de jornadas em vídeo.
 *
 * O cliente cola no HTML do site dele algo como:
 *
 *   <script src="https://SEU-SITE/widget.js"
 *     data-journey="slug-da-jornada"
 *     data-format="rectangle"   (square | rectangle | circle)
 *     data-border="true"        (true | false)
 *     data-position="right"     (right | left)
 *     data-video="https://..."  (vídeo da etapa inicial, p/ preview)
 *     async></script>
 *
 * O script cria uma "bolha" no canto inferior do site com um preview do
 * vídeo. Ao clicar, abre a jornada (/embed/<slug>) num iframe sobreposto.
 * O player dentro do iframe avisa (postMessage "vc-widget-close") quando o
 * visitante fecha — então a bolha reaparece.
 * ===================================================================== */
(function () {
  "use strict";

  // O <script> atual (document.currentScript funciona porque rodamos na hora).
  var script = document.currentScript;
  if (!script) return;

  var slug = script.getAttribute("data-journey");
  if (!slug) return;

  var format = script.getAttribute("data-format") || "rectangle";
  var border = script.getAttribute("data-border") !== "false";
  var borderColor = script.getAttribute("data-border-color") || "#fff";
  var position = script.getAttribute("data-position") === "left" ? "left" : "right";
  var videoUrl = script.getAttribute("data-video") || "";
  // Tamanho em % (50 a 150); padrão 100. Multiplica as dimensões da bolha.
  var sizePct = parseInt(script.getAttribute("data-size"), 10);
  if (isNaN(sizePct)) sizePct = 100;
  var sizeScale = sizePct / 100;

  // Origem do próprio script (para montar a URL do /embed).
  var origin;
  try {
    origin = new URL(script.src).origin;
  } catch {
    origin = "";
  }
  var embedUrl = origin + "/embed/" + encodeURIComponent(slug);

  // Evita injetar duas vezes a mesma jornada.
  var domId = "vc-widget-" + slug;
  if (document.getElementById(domId)) return;

  // ----- Dimensões/forma da bolha conforme o formato escolhido -----
  function bubbleSize() {
    var s;
    if (format === "circle") s = { w: 76, h: 76, radius: "50%" };
    else if (format === "square") s = { w: 76, h: 76, radius: "16px" };
    else s = { w: 116, h: 76, radius: "16px" }; // rectangle
    // Aplica o tamanho (%) escolhido no admin.
    s.w = Math.round(s.w * sizeScale);
    s.h = Math.round(s.h * sizeScale);
    return s;
  }

  var side = position === "left" ? "left" : "right";
  var size = bubbleSize();

  // ----- Bolha (launcher) -----
  var bubble = document.createElement("button");
  bubble.id = domId;
  bubble.type = "button";
  bubble.setAttribute("aria-label", "Abrir vídeo");
  bubble.style.cssText = [
    "position:fixed",
    "bottom:20px",
    side + ":20px",
    "width:" + size.w + "px",
    "height:" + size.h + "px",
    "border-radius:" + size.radius,
    "overflow:hidden",
    "padding:0",
    "margin:0",
    "cursor:pointer",
    "background:#000",
    "border:" + (border ? "3px solid " + borderColor : "none"),
    "box-shadow:0 8px 28px rgba(0,0,0,0.35)",
    "z-index:2147483000",
    "transition:transform .15s ease",
  ].join(";");
  bubble.onmouseenter = function () {
    bubble.style.transform = "scale(1.05)";
  };
  bubble.onmouseleave = function () {
    bubble.style.transform = "scale(1)";
  };

  // Conteúdo da bolha: vídeo mudo em loop (preview) ou um ícone de play.
  if (videoUrl) {
    var preview = document.createElement("video");
    preview.src = videoUrl;
    preview.muted = true;
    preview.autoplay = true;
    preview.loop = true;
    preview.playsInline = true;
    preview.setAttribute("playsinline", "");
    preview.style.cssText =
      "width:100%;height:100%;object-fit:cover;pointer-events:none;";
    bubble.appendChild(preview);
  } else {
    bubble.innerHTML =
      '<span style="color:#fff;font-size:26px;line-height:' +
      size.h +
      'px;">&#9658;</span>';
  }

  // Selinho de "play" sobre o preview, para indicar que é clicável.
  var badge = document.createElement("span");
  badge.style.cssText = [
    "position:absolute",
    "top:50%",
    "left:50%",
    "transform:translate(-50%,-50%)",
    "width:30px",
    "height:30px",
    "border-radius:50%",
    "background:rgba(0,0,0,0.45)",
    "color:#fff",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "font-size:14px",
    "pointer-events:none",
  ].join(";");
  badge.innerHTML = "&#9658;";
  bubble.appendChild(badge);

  // ----- Sobreposição com o iframe da jornada -----
  var overlay = null;

  function openJourney() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "background:rgba(0,0,0,0.75)",
      "z-index:2147483600",
      "display:flex",
      "align-items:center",
      "justify-content:center",
    ].join(";");

    var iframe = document.createElement("iframe");
    iframe.src = embedUrl;
    iframe.allow = "autoplay; fullscreen; clipboard-write";
    iframe.style.cssText = [
      "width:100%",
      "height:100%",
      "max-width:480px",
      "max-height:96vh",
      "border:none",
      "border-radius:14px",
      "background:#000",
      "box-shadow:0 12px 48px rgba(0,0,0,0.5)",
    ].join(";");

    overlay.appendChild(iframe);
    document.body.appendChild(overlay);
    bubble.style.display = "none";
  }

  function closeJourney() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    bubble.style.display = "block";
  }

  bubble.addEventListener("click", openJourney);

  // Clicar no fundo escuro (fora do iframe) também fecha.
  document.addEventListener("click", function (e) {
    if (overlay && e.target === overlay) closeJourney();
  });

  // O player dentro do iframe avisa quando o visitante toca no X.
  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "vc-widget-close") closeJourney();
  });

  // Insere a bolha quando o body estiver pronto.
  function mount() {
    document.body.appendChild(bubble);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
