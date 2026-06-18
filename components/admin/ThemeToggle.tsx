"use client";

import { useEffect, useState } from "react";

// Botão sol/lua que alterna o tema do admin. Adiciona/remove a classe "dark"
// no wrapper ".admin-theme" (id="admin-root") e lembra a preferência no
// localStorage. O wrapper já pode vir com "dark" (script inline no layout que
// evita o "flash" claro); aqui só sincronizamos o estado inicial.
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Sincroniza o ícone com o tema que o script inline já aplicou (pré-hidratação).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(
      document.getElementById("admin-root")?.classList.contains("dark") ?? false
    );
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    try {
      localStorage.setItem("admin-theme", next ? "dark" : "light");
    } catch {
      /* localStorage indisponível — ignora */
    }
    document.getElementById("admin-root")?.classList.toggle("dark", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="ds-btn ds-btn-sm ds-btn-ghost"
      aria-label={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
    >
      {dark ? (
        // Sol
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // Lua
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
