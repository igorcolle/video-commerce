// =====================================================================
// Cliente Supabase para o SERVIDOR (Server Components / Server Actions)
// com sessão por cookie. Sabe QUEM está logado, então a RLS do banco
// (auth_company_id()) garante que o admin só mexe na própria empresa.
// =====================================================================

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado de um Server Component (sem permissão de escrever
            // cookie). Tudo bem: o proxy/middleware renova a sessão.
          }
        },
      },
    }
  );
}
