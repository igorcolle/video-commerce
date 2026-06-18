"use client";

import { useState } from "react";
import type {
  Step,
  Option,
  StepField,
  FieldKind,
  Product,
  StepType,
  ButtonLayout,
  ButtonTemplate,
  ButtonFont,
  ButtonShadow,
  QuestionPosition,
  QuestionFontSize,
  ButtonTextSize,
} from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import OptionIcon from "@/components/ui/OptionIcon";
import VideoUpload from "@/components/admin/VideoUpload";
import {
  LAYOUTS,
  TEMPLATES,
  FONTS,
  SHADOWS,
  QUESTION_POSITIONS,
  QUESTION_FONT_SIZES,
  BUTTON_TEXT_SIZES,
  resolveButtonStyle,
  optionButtonVisual,
  optionsContainerClass,
  buttonTextSizeClass,
  fontFamilyOf,
} from "@/lib/buttonStyle";

// Painel lateral para editar o bloco selecionado.
// É remontado a cada seleção (key=step.id no pai), então pode usar estado
// local inicializado pelas props. O conteúdo é dividido em ABAS para reduzir
// a rolagem e facilitar a edição (UX).
type StylePatch = {
  buttons_layout?: ButtonLayout;
  button_template?: ButtonTemplate;
  button_color?: string;
  button_opacity?: number;
  button_font_color?: string;
  button_font?: ButtonFont;
  button_border_color?: string;
  button_shadow?: ButtonShadow;
  buttons_reveal_enabled?: boolean;
  buttons_reveal_seconds?: number;
  question_position?: QuestionPosition;
  question_font_size?: QuestionFontSize;
  question_font_color?: string;
  question_bg_enabled?: boolean;
  question_bg_color?: string;
  button_text_size?: ButtonTextSize;
};

type Props = {
  journeyId: string;
  step: Step;
  options: Option[];
  fields: StepField[];
  productIds: string[];
  products: Product[];
  isStart: boolean;
  onTitle: (v: string) => void;
  onQuestion: (v: string) => void;
  onType: (t: StepType) => void;
  onAddOption: () => void;
  onOptionFields: (
    optionId: string,
    fields: { label?: string; subtitle?: string | null; icon?: string | null }
  ) => void;
  onDeleteOption: (optionId: string) => void;
  onAddField: (kind: FieldKind) => void;
  onFieldUpdate: (
    fieldId: string,
    updates: { kind?: FieldKind; label?: string; required?: boolean }
  ) => void;
  onDeleteField: (fieldId: string) => void;
  onReorderField: (fieldId: string, direction: "up" | "down") => void;
  onStepStyle: (patch: StylePatch) => void;
  onReplicateStyle: () => void;
  onSetProducts: (ids: string[]) => void;
  onSetStart: () => void;
  onDeleteStep: () => void;
  onVideoUploaded: (url: string) => void;
  onClose: () => void;
};

// Abas disponíveis (variam conforme o tipo da etapa).
type Tab =
  | "pergunta"
  | "botoes"
  | "campos"
  | "comportamento"
  | "resultado"
  | "produtos";

export default function Inspector(props: Props) {
  const { step, options, fields, products, productIds, isStart } = props;
  const isResult = step.type === "result";
  const isCollect = step.type === "collect";

  const [tab, setTab] = useState<Tab>(isResult ? "resultado" : "pergunta");

  const [title, setTitle] = useState(step.title ?? "");
  const [question, setQuestion] = useState(step.question_text ?? "");
  const [selProducts, setSelProducts] = useState<string[]>(productIds);

  // Estilo dos botões + pergunta (uniforme na etapa). Inicializa pela etapa.
  const init = resolveButtonStyle(step);
  const [layout, setLayout] = useState<ButtonLayout>(init.layout);
  const [template, setTemplate] = useState<ButtonTemplate>(init.template);
  const [color, setColor] = useState(init.color);
  const [opacity, setOpacity] = useState(init.opacity);
  const [fontColor, setFontColor] = useState(init.fontColor);
  const [font, setFont] = useState<ButtonFont>(init.font);
  const [borderColor, setBorderColor] = useState(init.borderColor);
  const [shadow, setShadow] = useState<ButtonShadow>(init.shadow);
  const [buttonTextSize, setButtonTextSize] = useState<ButtonTextSize>(
    init.buttonTextSize
  );
  const [questionPosition, setQuestionPosition] = useState<QuestionPosition>(
    init.questionPosition
  );
  const [questionFontSize, setQuestionFontSize] = useState<QuestionFontSize>(
    init.questionFontSize
  );
  const [questionFontColor, setQuestionFontColor] = useState(
    init.questionFontColor
  );
  const [questionBgEnabled, setQuestionBgEnabled] = useState(
    init.questionBgEnabled
  );
  const [questionBgColor, setQuestionBgColor] = useState(init.questionBgColor);
  const [revealEnabled, setRevealEnabled] = useState(init.revealEnabled);
  const [revealSeconds, setRevealSeconds] = useState(init.revealSeconds);

  function toggleProduct(id: string) {
    const next = selProducts.includes(id)
      ? selProducts.filter((p) => p !== id)
      : [...selProducts, id];
    setSelProducts(next);
    props.onSetProducts(next);
  }

  // Estilo atual (para a pré-visualização ao vivo).
  const previewVisual = optionButtonVisual({
    layout,
    template,
    color,
    opacity,
    fontColor,
    font,
    borderColor,
    shadow,
  });
  const previewText = buttonTextSizeClass(buttonTextSize);

  // Abas conforme o tipo.
  const tabs: { id: Tab; name: string }[] = isResult
    ? [
        { id: "resultado", name: "Conteúdo" },
        { id: "produtos", name: "Produtos" },
      ]
    : isCollect
    ? [
        { id: "pergunta", name: "Pergunta" },
        { id: "campos", name: "Campos" },
      ]
    : [
        { id: "pergunta", name: "Pergunta" },
        { id: "botoes", name: "Botões" },
        { id: "comportamento", name: "Comportamento" },
      ];

  return (
    <aside className="flex h-full w-96 shrink-0 flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--bg)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h3 className="text-sm font-semibold">Editar etapa</h3>
        <button
          onClick={props.onClose}
          className="text-[var(--text-subtle)] hover:text-[var(--text)]"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>

      {/* Barra de abas */}
      <div className="flex flex-wrap gap-1 border-b border-[var(--border)] px-2 py-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
              tab === t.id
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Conteúdo rolável da aba ativa */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* ---------------- Aba: PERGUNTA (etapa de pergunta) -------------- */}
        {tab === "pergunta" && (
          <>
            <Field label="Tipo">
              <Select
                value={step.type}
                onChange={(e) => props.onType(e.target.value as StepType)}
              >
                <option value="question">Pergunta</option>
                <option value="collect">Coleta de dados</option>
                <option value="result">Resultado</option>
              </Select>
            </Field>

            <Field label="Título (interno)">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => props.onTitle(title)}
              />
            </Field>

            <Field label="Pergunta (aparece no player)">
              <Textarea
                rows={2}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onBlur={() => props.onQuestion(question)}
              />
            </Field>

            <div>
              <span className="ds-label mb-1.5 block">Vídeo</span>
              <VideoUpload
                stepId={step.id}
                journeyId={props.journeyId}
                currentUrl={step.video_url}
                onUploaded={props.onVideoUploaded}
              />
            </div>

            {/* Estilo da pergunta */}
            <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4">
              <span className="ds-label block">Estilo da pergunta</span>

              <Field label="Tamanho do texto">
                <Select
                  value={questionFontSize}
                  onChange={(e) => {
                    const v = e.target.value as QuestionFontSize;
                    setQuestionFontSize(v);
                    props.onStepStyle({ question_font_size: v });
                  }}
                >
                  {QUESTION_FONT_SIZES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <div>
                <span className="ds-label mb-1.5 block">Cor da fonte</span>
                <ColorPicker
                  value={questionFontColor}
                  onChange={(hex) => {
                    setQuestionFontColor(hex);
                    props.onStepStyle({ question_font_color: hex });
                  }}
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={questionBgEnabled}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setQuestionBgEnabled(v);
                    props.onStepStyle({ question_bg_enabled: v });
                  }}
                />
                Mostrar fundo atrás da pergunta
              </label>

              {questionBgEnabled && (
                <div>
                  <span className="ds-label mb-1.5 block">Cor do fundo</span>
                  <ColorPicker
                    value={questionBgColor}
                    onChange={(hex) => {
                      setQuestionBgColor(hex);
                      props.onStepStyle({ question_bg_color: hex });
                    }}
                  />
                </div>
              )}

              <Field label="Posição da pergunta">
                <Select
                  value={questionPosition}
                  onChange={(e) => {
                    const v = e.target.value as QuestionPosition;
                    setQuestionPosition(v);
                    props.onStepStyle({ question_position: v });
                  }}
                >
                  {QUESTION_POSITIONS.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </>
        )}

        {/* ---------------- Aba: BOTÕES (etapa de pergunta) --------------- */}
        {tab === "botoes" && (
          <>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="ds-label">Botões de decisão</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={props.onAddOption}
                >
                  + Botão
                </Button>
              </div>
              <p className="mb-2 text-xs text-[var(--text-subtle)]">
                Arraste o ponto à direita de cada botão (no canvas) até outra
                etapa para criar o caminho.
              </p>
              <div className="flex flex-col gap-3">
                {options.map((opt) => (
                  <OptionRow
                    key={opt.id}
                    option={opt}
                    journeyId={props.journeyId}
                    onFields={(fields) => props.onOptionFields(opt.id, fields)}
                    onDelete={() => props.onDeleteOption(opt.id)}
                    onReplicateStyle={props.onReplicateStyle}
                  />
                ))}
                {options.length === 0 && (
                  <p className="text-xs italic text-[var(--text-subtle)]">
                    Nenhum botão ainda.
                  </p>
                )}
              </div>
            </div>

            {/* Estilo dos botões */}
            <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4">
              <span className="ds-label block">Estilo dos botões</span>

              <Field label="Disposição">
                <Select
                  value={layout}
                  onChange={(e) => {
                    const v = e.target.value as ButtonLayout;
                    setLayout(v);
                    props.onStepStyle({ buttons_layout: v });
                  }}
                >
                  {LAYOUTS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Template">
                <Select
                  value={template}
                  onChange={(e) => {
                    const v = e.target.value as ButtonTemplate;
                    setTemplate(v);
                    props.onStepStyle({ button_template: v });
                  }}
                >
                  {TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <div>
                <span className="ds-label mb-1.5 block">Cor do botão</span>
                <ColorPicker
                  value={color}
                  onChange={(hex) => {
                    setColor(hex);
                    props.onStepStyle({ button_color: hex });
                  }}
                />
              </div>

              <div>
                <span className="ds-label mb-1.5 block">
                  Opacidade ({opacity}%)
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  onMouseUp={() => props.onStepStyle({ button_opacity: opacity })}
                  onTouchEnd={() =>
                    props.onStepStyle({ button_opacity: opacity })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <span className="ds-label mb-1.5 block">Cor da fonte</span>
                <ColorPicker
                  value={fontColor}
                  onChange={(hex) => {
                    setFontColor(hex);
                    props.onStepStyle({ button_font_color: hex });
                  }}
                />
              </div>

              <Field label="Fonte">
                <Select
                  value={font}
                  onChange={(e) => {
                    const v = e.target.value as ButtonFont;
                    setFont(v);
                    props.onStepStyle({ button_font: v });
                  }}
                >
                  {FONTS.map((f) => (
                    <option
                      key={f.id}
                      value={f.id}
                      style={{ fontFamily: fontFamilyOf(f.id) }}
                    >
                      {f.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Tamanho do texto">
                <Select
                  value={buttonTextSize}
                  onChange={(e) => {
                    const v = e.target.value as ButtonTextSize;
                    setButtonTextSize(v);
                    props.onStepStyle({ button_text_size: v });
                  }}
                >
                  {BUTTON_TEXT_SIZES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <div>
                <span className="ds-label mb-1.5 block">Cor da borda</span>
                <ColorPicker
                  value={borderColor}
                  onChange={(hex) => {
                    setBorderColor(hex);
                    props.onStepStyle({ button_border_color: hex });
                  }}
                />
                {borderColor && (
                  <button
                    type="button"
                    onClick={() => {
                      setBorderColor("");
                      props.onStepStyle({ button_border_color: "" });
                    }}
                    className="mt-1 text-xs text-[var(--text-muted)] underline hover:text-[var(--text)]"
                  >
                    Remover borda
                  </button>
                )}
              </div>

              <Field label="Sombra">
                <Select
                  value={shadow}
                  onChange={(e) => {
                    const v = e.target.value as ButtonShadow;
                    setShadow(v);
                    props.onStepStyle({ button_shadow: v });
                  }}
                >
                  {SHADOWS.map((sh) => (
                    <option key={sh.id} value={sh.id}>
                      {sh.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* Pré-visualização ao vivo (mesmo visual do player) */}
              <div>
                <span className="ds-label mb-1.5 block">Pré-visualização</span>
                <div className="rounded-lg bg-gradient-to-b from-gray-700 to-gray-900 p-3">
                  <div className={`${optionsContainerClass(layout)} gap-2`}>
                    {(options.length > 0
                      ? options
                      : [
                          {
                            id: "demo",
                            label: "Exemplo",
                            subtitle: "Texto secundário",
                            icon: "🏠",
                          } as Option,
                        ]
                    ).map((opt) => (
                      <div
                        key={opt.id}
                        className={previewVisual.className}
                        style={previewVisual.style}
                      >
                        <span className="flex items-center gap-2">
                          {opt.icon && (
                            <OptionIcon
                              value={opt.icon}
                              size={20}
                              className="shrink-0 text-xl leading-none"
                            />
                          )}
                          <span className="min-w-0">
                            <span
                              className={`block truncate font-bold leading-tight ${previewText.label}`}
                            >
                              {opt.label || "Texto em destaque"}
                            </span>
                            {opt.subtitle && (
                              <span
                                className={`block truncate leading-tight opacity-80 ${previewText.subtitle}`}
                              >
                                {opt.subtitle}
                              </span>
                            )}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ---------------- Aba: CAMPOS (etapa de coleta de dados) -------- */}
        {tab === "campos" && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="ds-label">Campos do formulário</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => props.onAddField("full_name")}
              >
                + Campo
              </Button>
            </div>
            <p className="mb-3 text-xs text-[var(--text-subtle)]">
              O visitante preencherá estes campos. Use as setas para reordenar e
              marque os obrigatórios.
            </p>

            {fields.length === 0 ? (
              <p className="text-sm italic text-[var(--text-subtle)]">
                Nenhum campo ainda. Clique em “+ Campo”.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {[...fields]
                  .sort((a, b) => a.position - b.position)
                  .map((f, i, arr) => (
                    <FieldRow
                      key={f.id}
                      field={f}
                      isFirst={i === 0}
                      isLast={i === arr.length - 1}
                      onUpdate={(updates) => props.onFieldUpdate(f.id, updates)}
                      onDelete={() => props.onDeleteField(f.id)}
                      onReorder={(dir) => props.onReorderField(f.id, dir)}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------- Aba: COMPORTAMENTO (etapa de pergunta) -------- */}
        {tab === "comportamento" && (
          <div className="rounded-lg border border-[var(--border)] p-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={revealEnabled}
                onChange={(e) => {
                  const v = e.target.checked;
                  setRevealEnabled(v);
                  props.onStepStyle({ buttons_reveal_enabled: v });
                }}
              />
              Começar minimizado e revelar perto do fim
            </label>
            <p className="mt-1.5 text-xs text-[var(--text-subtle)]">
              A pergunta e os botões ficam ocultos e surgem juntos quando faltar
              o tempo indicado (ou ao toque do cliente).
            </p>
            {revealEnabled && (
              <div className="mt-2">
                <span className="ds-label mb-1.5 block">
                  Expandir quando faltar (segundos)
                </span>
                <Input
                  type="number"
                  min={0}
                  value={revealSeconds}
                  onChange={(e) => setRevealSeconds(Number(e.target.value))}
                  onBlur={() =>
                    props.onStepStyle({
                      buttons_reveal_seconds: revealSeconds,
                    })
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* ---------------- Aba: RESULTADO (conteúdo) --------------------- */}
        {tab === "resultado" && (
          <>
            <Field label="Tipo">
              <Select
                value={step.type}
                onChange={(e) => props.onType(e.target.value as StepType)}
              >
                <option value="question">Pergunta</option>
                <option value="collect">Coleta de dados</option>
                <option value="result">Resultado</option>
              </Select>
            </Field>

            <Field label="Título (interno)">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => props.onTitle(title)}
              />
            </Field>

            <div>
              <span className="ds-label mb-1.5 block">Vídeo</span>
              <VideoUpload
                stepId={step.id}
                journeyId={props.journeyId}
                currentUrl={step.video_url}
                onUploaded={props.onVideoUploaded}
              />
            </div>
          </>
        )}

        {/* ---------------- Aba: PRODUTOS (etapa de resultado) ------------ */}
        {tab === "produtos" && (
          <div>
            <span className="ds-label mb-2 block">
              Produtos que aparecem aqui
            </span>
            {products.length === 0 ? (
              <p className="text-xs text-[var(--text-subtle)]">
                Cadastre produtos na seção abaixo do canvas para marcá-los aqui.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selProducts.includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rodapé fixo: ações da etapa (sempre visível) */}
      <div className="flex flex-col gap-2 border-t border-[var(--border)] p-4">
        {!isStart && (
          <Button variant="secondary" size="sm" onClick={props.onSetStart}>
            Definir como etapa inicial
          </Button>
        )}
        {isStart && (
          <span className="text-xs text-[var(--success-fg)]">
            ✓ Esta é a etapa inicial da jornada
          </span>
        )}
        <Button variant="danger" size="sm" onClick={props.onDeleteStep}>
          Excluir etapa
        </Button>
      </div>
    </aside>
  );
}

// Tipos de campo disponíveis na etapa de coleta de dados.
const FIELD_KINDS: { id: FieldKind; name: string }[] = [
  { id: "full_name", name: "Nome completo" },
  { id: "email", name: "E-mail" },
  { id: "whatsapp", name: "WhatsApp" },
  { id: "custom", name: "Personalizado" },
];

// Linha de edição de um campo do formulário de coleta.
// O rótulo salva ao sair do campo; tipo/obrigatório salvam na hora.
function FieldRow({
  field,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onReorder,
}: {
  field: StepField;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (updates: {
    kind?: FieldKind;
    label?: string;
    required?: boolean;
  }) => void;
  onDelete: () => void;
  onReorder: (direction: "up" | "down") => void;
}) {
  const [label, setLabel] = useState(field.label);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] p-2.5">
      <div className="flex items-center gap-1">
        <div className="flex flex-col">
          <button
            type="button"
            aria-label="Mover para cima"
            disabled={isFirst}
            onClick={() => onReorder("up")}
            className="px-1 text-xs leading-none text-[var(--text-subtle)] hover:text-[var(--text)] disabled:opacity-30"
          >
            ▲
          </button>
          <button
            type="button"
            aria-label="Mover para baixo"
            disabled={isLast}
            onClick={() => onReorder("down")}
            className="px-1 text-xs leading-none text-[var(--text-subtle)] hover:text-[var(--text)] disabled:opacity-30"
          >
            ▼
          </button>
        </div>

        <Select
          value={field.kind}
          onChange={(e) => onUpdate({ kind: e.target.value as FieldKind })}
          className="flex-1"
        >
          {FIELD_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </Select>

        <button
          type="button"
          aria-label="Excluir campo"
          onClick={onDelete}
          className="px-1.5 text-[var(--danger)] hover:opacity-70"
        >
          ✕
        </button>
      </div>

      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => onUpdate({ label })}
        placeholder={
          field.kind === "custom" ? "Pergunta ao visitante" : "Rótulo do campo"
        }
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onUpdate({ required: e.target.checked })}
        />
        Obrigatório
      </label>
    </div>
  );
}

// Linha de edição de um botão: ícone + texto em destaque + texto secundário.
// Textos salvam ao sair do campo; o ícone salva ao escolher.
function OptionRow({
  option,
  journeyId,
  onFields,
  onDelete,
  onReplicateStyle,
}: {
  option: Option;
  journeyId: string;
  onFields: (fields: {
    label?: string;
    subtitle?: string | null;
    icon?: string | null;
  }) => void;
  onDelete: () => void;
  onReplicateStyle: () => void;
}) {
  const [label, setLabel] = useState(option.label);
  const [subtitle, setSubtitle] = useState(option.subtitle ?? "");
  const [replicated, setReplicated] = useState(false);

  function handleReplicate() {
    if (
      !confirm(
        "Aplicar o visual desta etapa (cores, fonte, template, etc.) a todas as outras etapas de pergunta da jornada?"
      )
    )
      return;
    onReplicateStyle();
    setReplicated(true);
    setTimeout(() => setReplicated(false), 2500);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)]">
          Botão
        </span>
        <Button variant="danger" size="sm" onClick={onDelete}>
          ✕
        </Button>
      </div>

      <Field label="Texto em destaque">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => onFields({ label })}
        />
      </Field>

      <Field label="Texto secundário">
        <Input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          onBlur={() => onFields({ subtitle: subtitle || null })}
          placeholder="Opcional"
        />
      </Field>

      <div>
        <span className="ds-label mb-1.5 block">Ícone</span>
        <EmojiPicker
          value={option.icon}
          onChange={(icon) => onFields({ icon })}
          journeyId={journeyId}
          optionId={option.id}
        />
      </div>

      {/* Replicar o estilo da etapa para as demais etapas da jornada. */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleReplicate}>
          Replicar estilo
        </Button>
        {replicated && (
          <span className="text-xs text-[var(--success-fg)]">
            ✓ Aplicado às demais etapas
          </span>
        )}
      </div>
    </div>
  );
}

