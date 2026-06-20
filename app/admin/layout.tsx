import Link from "next/link";
import { ensureProfile, getCurrentUser } from "@/lib/admin";
import { inter } from "@/lib/fonts";
import AdminNav from "@/components/admin/AdminNav";
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
        suppressHydrationWarning
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
      suppressHydrationWarning
      className={`admin-theme ${inter.variable} flex min-h-screen flex-col`}
    >
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-lg">
        <div className="flex shrink-0 items-center gap-xl">
          {/* Marca */}
          <Link href="/admin/jornadas" className="flex flex-col leading-none">
            <span className="font-headline-md text-headline-md font-black uppercase tracking-tight text-primary">
              quantio video
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant/60">
              digital experience
            </span>
          </Link>
          <AdminNav />
        </div>

        <div className="flex items-center gap-md">
          <span className="hidden text-label-md text-on-surface-variant lg:inline">
            {user.email}
          </span>
          <div className="h-6 w-px bg-outline-variant/30" />
          <ThemeToggle />
          <div className="flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container-high/50 p-1 pr-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-variant text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </span>
            <span className="font-label-md text-label-md font-bold text-on-surface-variant">
              ADM
            </span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
