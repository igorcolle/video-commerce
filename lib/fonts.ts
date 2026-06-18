// Fonte do painel admin (estilo Attio). Aplicada só no wrapper do admin,
// via a variável CSS --font-inter (ver app/admin/layout.tsx e globals.css).
import { Inter } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
