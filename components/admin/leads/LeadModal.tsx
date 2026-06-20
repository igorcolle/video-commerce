"use client";

import { useEffect, useState } from "react";
import {
  loadLeadDetail,
  captureLead,
  type LeadDetail,
} from "@/app/admin/leads/actions";

// =====================================================================
// LeadModal — popup com TODAS as informações de um lead + a jornada de
// cliques (timeline). Permite "Capturar lead" (vai para o histórico),
// registrando quem capturou e como entrou em contato.
// =====================================================================

type Props = {
  leadId: string;
  onClose: () => void;
  onCaptured: () => void;
};

export default function LeadModal({ leadId, onClose, onCaptured }: Props) {
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactMethod, setContactMethod] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadLeadDetail(leadId)
      .then((d) => {
        if (alive) setDetail(d);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [leadId]);

  async function capturar() {
    if (!contactMethod.trim()) {
      setErro("Informe como você entrou em contato com o lead.");
      return;
    }
    setErro(null);
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("id", leadId);
      fd.set("contact_method", contactMethod.trim());
      await captureLead(fd);
      onCaptured();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao capturar lead.");
      setSaving(false);
    }
  }

  const answers = detail ? detail.answers : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-high px-lg py-3">
          <span className="font-label-md font-bold text-primary">
            {loading ? "Carregando lead..." : `LEAD: ${detail?.name ?? "—"}`}
          </span>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="custom-scrollbar overflow-y-auto p-lg" style={{ maxHeight: "70vh" }}>
          {loading || !detail ? (
            <p className="py-8 text-center font-body-md text-on-surface-variant">
              Carregando...
            </p>
          ) : (
            <div className="space-y-lg">
              {/* Dados de contato */}
              <div className="grid grid-cols-2 gap-md">
                <Info label="Nome" value={detail.name} />
                <Info label="Origem" value={detail.origin} />
                <Info label="Email" value={detail.email} />
                <Info label="Telefone" value={detail.whatsapp} />
                <Info label="Data" value={detail.dateLabel} />
                {detail.ctaClicked && (
                  <Info label="CTA clicado" value={detail.ctaClicked} />
                )}
              </div>

              {/* Respostas dadas na jornada */}
              {answers.length > 0 && (
                <div>
                  <h4 className="mb-2 font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                    Respostas
                  </h4>
                  <div className="space-y-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
                    {answers.map((a, i) => (
                      <div
                        key={`${a.label}-${i}`}
                        className="flex justify-between gap-3 text-body-sm"
                      >
                        <span className="text-on-surface-variant">{a.label}</span>
                        <span className="text-right font-medium text-on-surface">
                          {a.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Produtos recomendados */}
              {detail.recommendedProducts.length > 0 && (
                <div>
                  <h4 className="mb-2 font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                    Produtos recomendados
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {detail.recommendedProducts.map((p, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-body-sm text-on-surface"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Jornada de cliques (timeline) */}
              <div>
                <h4 className="mb-2 font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                  Jornada de cliques
                </h4>
                {detail.timeline.length === 0 ? (
                  <p className="font-body-sm text-on-surface-variant">
                    Sem eventos registrados para esta sessão.
                  </p>
                ) : (
                  <ol className="space-y-2 border-l border-outline-variant pl-4">
                    {detail.timeline.map((t, i) => (
                      <li key={i} className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                        <div className="flex justify-between gap-3 text-body-sm">
                          <span className="text-on-surface">{t.label}</span>
                          <span className="shrink-0 font-mono-sm text-on-surface-variant">
                            {t.at}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Captura */}
              <div className="border-t border-outline-variant/30 pt-4">
                {detail.captured ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="font-label-md text-label-md text-primary">
                      Lead capturado
                    </p>
                    <p className="mt-1 font-body-sm text-on-surface-variant">
                      Por <strong className="text-on-surface">{detail.capturedByName}</strong>
                      {detail.capturedDateLabel && ` em ${detail.capturedDateLabel}`}.
                    </p>
                    {detail.contactMethod && (
                      <p className="mt-1 font-body-sm text-on-surface-variant">
                        Contato: {detail.contactMethod}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block font-label-md text-label-md text-on-surface-variant">
                      Como você entrou em contato com o lead?
                    </label>
                    <textarea
                      value={contactMethod}
                      onChange={(e) => setContactMethod(e.target.value)}
                      rows={2}
                      placeholder="Ex.: Liguei no WhatsApp e agendei uma visita."
                      className="w-full resize-none rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 font-body-md text-on-surface outline-none transition-colors focus:border-primary"
                    />
                    {erro && <p className="font-body-sm text-error">{erro}</p>}
                    <button
                      onClick={capturar}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 font-bold text-on-primary transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        check_circle
                      </span>
                      {saving ? "Capturando..." : "Capturar lead"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant">
        {label}
      </p>
      <p className="font-body-md text-on-surface">{value}</p>
    </div>
  );
}
