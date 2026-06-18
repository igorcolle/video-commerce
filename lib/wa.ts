// =====================================================================
// Monta o link do WhatsApp (wa.me) com uma mensagem pré-preenchida.
// Usado no CTA final da jornada — espelha o exemplo da seção 7.7 do PRD.
// =====================================================================

// Deixa só os dígitos do número (wa.me não aceita espaços/símbolos).
function onlyDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

// Monta a mensagem-resumo do lead a partir das respostas + produtos sugeridos.
export function buildLeadMessage(
  journeyName: string,
  answers: Record<string, string>,
  recommendedProducts: string[]
): string {
  const linhas = [`Olá! Vim pela jornada "${journeyName}".`, ""];

  for (const [pergunta, resposta] of Object.entries(answers)) {
    linhas.push(`${pergunta}: ${resposta}`);
  }

  if (recommendedProducts.length > 0) {
    linhas.push("", `Produtos sugeridos: ${recommendedProducts.join(", ")}`);
  }

  return linhas.join("\n");
}

// Gera a URL final do WhatsApp já com a mensagem codificada.
export function buildWaLink(phone: string, message: string): string {
  const num = onlyDigits(phone);
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}
