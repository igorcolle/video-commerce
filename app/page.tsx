import Link from "next/link";

// Página inicial ("olá mundo" da Fase 1).
// Serve só para confirmar que o projeto roda e para dar um atalho até a
// jornada de demonstração (roçadeira). As telas reais virão nas próximas fases.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
        Projeto no ar ✅
      </span>

      <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl">
        Plataforma de Jornadas Interativas em Vídeo
      </h1>

      <p className="max-w-xl text-lg text-gray-600">
        Transforme vídeos em jornadas de decisão. Crie consultores virtuais em
        vídeo que guiam o cliente até a compra, orçamento ou atendimento ideal.
      </p>

      <Link
        href="/j/rocadeira"
        className="rounded-lg bg-green-600 px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-green-700"
      >
        Ver jornada de demonstração (roçadeira) →
      </Link>

      <p className="text-sm text-gray-400">
        Dica: a demonstração só funciona depois de configurar o Supabase (veja
        SETUP_SUPABASE.md).
      </p>
    </main>
  );
}
