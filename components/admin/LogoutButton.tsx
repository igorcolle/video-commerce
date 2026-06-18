"use client";

import { useRouter } from "next/navigation";
import { createBrowserAuthClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/Button";

// Botão "Sair" — encerra a sessão e volta para o login.
export default function LogoutButton() {
  const router = useRouter();

  async function sair() {
    const supabase = createBrowserAuthClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/admin/login");
  }

  return (
    <Button variant="secondary" size="sm" onClick={sair}>
      Sair
    </Button>
  );
}
