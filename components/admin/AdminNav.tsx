"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Itens do menu superior (novo design system). Cada um aponta para uma
// área do admin; o ícone usa a fonte Material Symbols.
const ITEMS = [
  { href: "/admin/jornadas", label: "Jornadas", icon: "account_tree" },
  { href: "/admin/produtos", label: "Produtos", icon: "inventory_2" },
  { href: "/admin/leads", label: "Leads", icon: "group" },
  { href: "/admin/analytics", label: "Analytics", icon: "monitoring" },
  { href: "/admin/ajustes", label: "Ajustes", icon: "settings" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 lg:flex">
      {ITEMS.map((item) => {
        // Ativo quando a rota atual começa pelo href do item.
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all ${
              active
                ? "border border-primary/20 bg-primary-container/20 text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {item.icon}
            </span>
            <span
              className={`font-label-md text-label-md uppercase ${
                active ? "font-bold" : ""
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
