// =====================================================================
// Helpers do painel admin (server-only).
// =====================================================================

import { createServerSupabase } from "./supabase";
import { createServerAuthClient } from "./supabase-server";

// Retorna o usuário logado (ou null).
export async function getCurrentUser() {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Garante que o usuário logado tenha um "profile" ligado a uma empresa.
// No 1º acesso, liga-o à empresa JÁ existente (a que tem a roçadeira),
// criando uma só se não houver nenhuma. Usa a chave service_role porque
// a tabela profiles não permite o próprio usuário se inserir (RLS).
// Retorna o company_id (ou null se ninguém estiver logado).
export async function ensureProfile(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const admin = createServerSupabase(); // chave service_role (server-only)

  // Já existe profile? Então só devolve a empresa dele.
  const { data: profile } = await admin
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.company_id) return profile.company_id;

  // Procura a 1ª empresa cadastrada.
  let companyId: string;
  const { data: company } = await admin
    .from("companies")
    .select("id")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (company?.id) {
    companyId = company.id;
  } else {
    const { data: novaEmpresa, error } = await admin
      .from("companies")
      .insert({ name: "Minha Empresa" })
      .select("id")
      .single();
    if (error || !novaEmpresa) {
      throw new Error("Não foi possível criar a empresa inicial.");
    }
    companyId = novaEmpresa.id;
  }

  // Liga o usuário logado a essa empresa.
  await admin.from("profiles").upsert({
    id: user.id,
    company_id: companyId,
    full_name: user.email ?? "Admin",
  });

  return companyId;
}
