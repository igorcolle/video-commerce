"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserAuthClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";

// Tela de login do admin (apenas e-mail + senha; sem cadastro aberto).
// O usuário é criado no painel do Supabase (Authentication > Users).
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const supabase = createBrowserAuthClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro("E-mail ou senha inválidos.");
      setCarregando(false);
      return;
    }

    router.refresh();
    router.push("/admin/jornadas");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm p-7">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)] text-sm font-bold text-white">
            V
          </span>
          <h1 className="text-xl font-semibold tracking-tight">
            Entrar no painel
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Acesse para gerenciar suas jornadas
          </p>
        </div>

        <form onSubmit={entrar} className="flex flex-col gap-4">
          <Field label="E-mail">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
            />
          </Field>

          <Field label="Senha">
            <Input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {erro && <p className="text-sm text-[var(--danger)]">{erro}</p>}

          <Button type="submit" disabled={carregando} className="w-full">
            {carregando ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
