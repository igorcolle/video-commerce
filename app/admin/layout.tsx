import Link from "next/link";
import { ensureProfile, getCurrentUser } from "@/lib/admin";
import { inter } from "@/lib/fonts";
import LogoutButton from "@/components/admin/LogoutButton";
import ThemeToggle from "@/components/admin/ThemeToggle";

// Script inline que aplica o tema escuro ANTES da pintura (evita o "flash"
// claro ao recarregar). Lê a preferência salva e marca o wrapper #admin-root.
const themeInitScript = `try{if(localStorage.getItem('admin-theme')==='dark'){document.currentScript.parentElement.classList.add('dark')}}catch(e){}`;

// Layout do painel admin (design system "Attio").
// - Na tela de login (sem usuário): renderiza só o conteúdo, sem menu.
// - Logado: garante o profile/empresa e mostra a topbar + botão Sair.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Sem usuário = página de login (o proxy já libera só ela).
  if (!user) {
    return (
      <div
        id="admin-root"
        className={`admin-theme ${inter.variable} flex min-h-screen flex-col`}
      >
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </div>
    );
  }

  // Garante que o usuário esteja ligado a uma empresa.
  await ensureProfile();

  return (
    <div
      id="admin-root"
      className={`admin-theme ${inter.variable} flex min-h-screen flex-col`}
    >
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/90 px-6 py-3 backdrop-blur">
        <nav className="flex items-center gap-6">
          <Link
            href="/admin/jornadas"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--primary)] text-xs font-bold text-white">
              V
            </span>
            Video Commerce
          </Link>
          <Link
            href="/admin/jornadas"
            className="text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            Jornadas
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[var(--text-muted)] sm:inline">
            {user.email}
          </span>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
