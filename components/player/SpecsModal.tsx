"use client";

import { createPortal } from "react-dom";
import type { Product, ProductSpec } from "@/lib/supabase";

// =====================================================================
// SpecsModal — abre as especificações de um produto no player.
// Mostra o RESUMO no topo e, logo abaixo, a TABELA de atributos (2 colunas).
// Renderiza via portal no <body> para não ser cortado/encoberto por
// containers do player (overflow/contexto de empilhamento).
// =====================================================================

type Props = {
  product: Product;
  specs: ProductSpec[];
  onClose: () => void;
};

export default function SpecsModal({ product, specs, onClose }: Props) {
  // O portal precisa do <body>; este modal só é renderizado por interação do
  // cliente, então o document sempre existe aqui (guarda apenas por segurança).
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-base font-bold text-gray-900">
            Especificações — {product.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Conteúdo rolável: resumo no topo + tabela abaixo.
            Usa max-h própria (não flex-1) para não colapsar a altura quando o
            conteúdo é pequeno num card de altura automática. */}
        <div className="max-h-[calc(85vh-3.5rem)] overflow-y-auto p-4">
          {product.specs_summary && (
            <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-gray-700">
              {product.specs_summary}
            </p>
          )}

          {specs.length > 0 ? (
            <table className="w-full border-collapse overflow-hidden rounded-lg border border-gray-200 text-left text-sm">
              <tbody>
                {specs.map((s, i) => (
                  <tr
                    key={s.id}
                    className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}
                  >
                    <th className="border-b border-gray-200 px-3 py-2 font-semibold text-gray-700">
                      {s.attribute}
                    </th>
                    <td className="border-b border-gray-200 px-3 py-2 text-gray-900">
                      {s.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            !product.specs_summary && (
              <p className="text-sm text-gray-500">
                Sem especificações cadastradas.
              </p>
            )
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
