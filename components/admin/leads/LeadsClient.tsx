"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LeadModal from "./LeadModal";

// =====================================================================
// LeadsClient — tabela de leads com abas (Novos / Histórico), busca e
// exportação CSV. Clicar numa linha abre o popup do lead (LeadModal).
// "Novos" = ainda não capturados; "Histórico" = já capturados.
// =====================================================================

export type LeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  origin: string;
  dateLabel: string;
  captured: boolean;
  capturedByName: string | null;
  // Data/hora em que o lead foi capturado (mostrada só no Histórico).
  capturedAtLabel: string;
};

type Tab = "novos" | "historico";

export default function LeadsClient({ leads }: { leads: LeadRow[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("novos");
  const [busca, setBusca] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const base = leads.filter((l) =>
      tab === "novos" ? !l.captured : l.captured
    );
    if (!q) return base;
    return base.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        l.origin.toLowerCase().includes(q)
    );
  }, [tab, busca, leads]);

  // Exporta a lista visível para CSV (download no navegador).
  function exportarCSV() {
    const header = ["Nome", "Email", "Telefone", "Origem", "Data"];
    const linhas = filtrados.map((l) =>
      [l.name, l.email, l.phone, l.origin, l.dateLabel]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...linhas].join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="workbench-bg min-h-[calc(100vh-3.5rem)] overflow-y-auto bg-surface p-lg">
      <div className="mx-auto max-w-7xl space-y-lg">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">
              Leads
            </h2>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              Acompanhe as oportunidades geradas pelas suas jornadas de vídeo.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                search
              </span>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar lead..."
                className="w-56 rounded-full border border-outline-variant bg-surface-container-low py-1.5 pl-9 pr-4 text-body-sm text-on-surface outline-none transition-all focus:border-primary"
              />
            </div>
            <button
              onClick={exportarCSV}
              className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 font-label-md text-on-surface transition-colors hover:bg-surface-variant"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Exportar
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-lg border-b border-outline-variant">
          {([
            ["novos", "Novos Leads"],
            ["historico", "Histórico de Leads"],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-3 font-label-md text-label-md uppercase transition-colors ${
                tab === key
                  ? "border-b-2 border-primary text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tabela */}
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          {filtrados.length === 0 ? (
            <p className="px-md py-10 text-center font-body-md text-on-surface-variant">
              Nenhum lead {tab === "novos" ? "novo " : "no histórico "}por aqui ainda.
            </p>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-outline-variant bg-surface-container-low/50">
                <tr>
                  <th className="px-md py-3 font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant">
                    Nome
                  </th>
                  <th className="px-md py-3 font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant">
                    Email
                  </th>
                  <th className="px-md py-3 font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant">
                    Telefone
                  </th>
                  <th className="px-md py-3 font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant">
                    Origem
                  </th>
                  <th className="px-md py-3 font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant">
                    Data
                  </th>
                  {tab === "historico" && (
                    <th className="px-md py-3 font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant">
                      Capturado em
                    </th>
                  )}
                  <th className="px-md py-3 font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant">
                    {tab === "historico" ? "Atendente" : "Status"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {filtrados.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelectedId(l.id)}
                    className="cursor-pointer transition-colors hover:bg-surface-container-low"
                  >
                    <td className="px-md py-3 font-label-md font-bold text-on-surface">
                      {l.name}
                    </td>
                    <td className="px-md py-3 font-body-sm text-on-surface-variant">
                      {l.email}
                    </td>
                    <td className="px-md py-3 font-mono-sm text-on-surface-variant">
                      {l.phone}
                    </td>
                    <td className="px-md py-3 font-body-sm text-on-surface-variant">
                      {l.origin}
                    </td>
                    <td className="px-md py-3 font-body-sm text-on-surface-variant">
                      {l.dateLabel}
                    </td>
                    {tab === "historico" && (
                      <td className="px-md py-3 font-body-sm text-on-surface-variant">
                        {l.capturedAtLabel}
                      </td>
                    )}
                    <td className="px-md py-3">
                      {l.captured ? (
                        <span className="font-body-sm text-on-surface-variant">
                          {l.capturedByName || "Capturado"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded border border-primary/20 bg-primary/10 px-2 py-0.5 font-label-md text-[10px] text-primary">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          NOVO
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="font-label-md text-[11px] text-on-surface-variant/60">
          Exibindo {filtrados.length} de {leads.length} leads.
        </p>
      </div>

      {selectedId && (
        <LeadModal
          leadId={selectedId}
          onClose={() => setSelectedId(null)}
          onCaptured={() => {
            setSelectedId(null);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
