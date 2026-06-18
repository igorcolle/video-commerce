// =====================================================================
// session_id — identifica UMA visita do cliente.
// É gerado no navegador e guardado no sessionStorage, então todos os
// eventos da mesma visita ficam ligados (start, cliques, complete...).
// =====================================================================

const KEY = "vc_session_id";

// Retorna o session_id da visita atual; cria um novo se ainda não existir.
export function getSessionId(): string {
  // Em SSR não há sessionStorage; só usamos isto no client.
  if (typeof window === "undefined") return "";

  let id = window.sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.sessionStorage.setItem(KEY, id);
  }
  return id;
}
