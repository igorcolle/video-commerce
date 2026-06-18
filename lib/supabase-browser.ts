// =====================================================================
// Cliente Supabase para o NAVEGADOR (componentes "use client") com
// sessão por cookie. Usado na tela de login, no logout e no upload.
// Não importa nada de servidor (por isso fica em arquivo separado).
// =====================================================================

import { createBrowserClient } from "@supabase/ssr";

export function createBrowserAuthClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
