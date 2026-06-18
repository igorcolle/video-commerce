"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import StepNode, { type StepNodeData } from "./StepNode";
import Inspector from "./Inspector";
import { Button } from "@/components/ui/Button";
import type {
  Journey,
  Step,
  Option,
  Product,
  StepProduct,
  StepType,
  ButtonLayout,
  ButtonTemplate,
  ButtonFont,
  ButtonShadow,
  QuestionPosition,
  QuestionFontSize,
  ButtonTextSize,
} from "@/lib/supabase";

// Campos de estilo dos botões que podem ser atualizados de uma vez.
type StepStylePatch = {
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
import * as flow from "@/app/admin/jornadas/[id]/flow-actions";

type Props = {
  journey: Journey;
  steps: Step[];
  options: Option[];
  products: Product[];
  stepProducts: StepProduct[];
};

// Monta o objeto "node" do React Flow a partir de uma etapa.
function buildNode(
  step: Step,
  options: Option[],
  isStart: boolean,
  productIds: string[],
  fallbackIndex: number
): Node {
  return {
    id: step.id,
    type: "step",
    position: {
      x: step.pos_x ?? 80 + (fallbackIndex % 4) * 300,
      y: step.pos_y ?? 80 + Math.floor(fallbackIndex / 4) * 240,
    },
    data: {
      step,
      options,
      isStart,
      productIds,
      productCount: productIds.length,
    } satisfies StepNodeData as unknown as Record<string, unknown>,
  };
}

export default function JourneyFlow({
  journey,
  steps,
  options,
  products,
  stepProducts,
}: Props) {
  const nodeTypes = useMemo(() => ({ step: StepNode }), []);

  // Estado inicial dos nós e arestas.
  const initialNodes = useMemo<Node[]>(
    () =>
      steps.map((s, i) =>
        buildNode(
          s,
          options.filter((o) => o.step_id === s.id),
          journey.start_step_id === s.id,
          stepProducts
            .filter((sp) => sp.step_id === s.id)
            .sort((a, b) => a.position - b.position)
            .map((sp) => sp.product_id),
          i
        )
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const initialEdges = useMemo<Edge[]>(
    () =>
      options
        .filter((o) => o.next_step_id)
        .map((o) => ({
          id: o.id,
          source: o.step_id,
          sourceHandle: o.id,
          target: o.next_step_id as string,
          markerEnd: { type: MarkerType.ArrowClosed },
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ---- Helpers de estado local ----
  const dataOf = (n: Node) => n.data as unknown as StepNodeData;

  const patchData = useCallback(
    (id: string, patch: Partial<StepNodeData>) =>
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
        )
      ),
    [setNodes]
  );

  const patchStep = useCallback(
    (id: string, patch: Partial<Step>) =>
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: { ...n.data, step: { ...dataOf(n).step, ...patch } },
              }
            : n
        )
      ),
    [setNodes]
  );

  // ---- Conexões (ramificação) ----
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.sourceHandle || !params.target) return;
      if (params.source === params.target) return; // evita ligar a si mesma
      const optionId = params.sourceHandle;
      setEdges((eds) =>
        addEdge(
          { ...params, id: optionId, markerEnd: { type: MarkerType.ArrowClosed } },
          eds.filter((e) => e.id !== optionId) // 1 botão = 1 destino
        )
      );
      flow.setOptionTarget(optionId, params.target);
    },
    [setEdges]
  );

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    deleted.forEach((e) => flow.setOptionTarget(e.id, null));
  }, []);

  const onNodeDragStop = useCallback(
    (_e: unknown, node: Node) => {
      flow.saveStepPosition(node.id, node.position.x, node.position.y);
    },
    []
  );

  // ---- Toolbar: adicionar etapa ----
  const addStep = useCallback(
    async (type: StepType) => {
      const pos = { x: 120 + nodes.length * 30, y: 120 + nodes.length * 30 };
      const step = await flow.addStepReturning(journey.id, type, pos.x, pos.y);
      setNodes((nds) => [...nds, buildNode(step, [], false, [], nds.length)]);
    },
    [journey.id, nodes.length, setNodes]
  );

  // ---- Handlers do Inspector ----
  const onType = useCallback(
    async (id: string, t: StepType) => {
      if (t === "result") {
        // Resultado não tem botões: remove os existentes e suas conexões.
        const node = nodes.find((n) => n.id === id);
        const opts = node ? dataOf(node).options : [];
        await Promise.all(opts.map((o) => flow.deleteOptionQuiet(o.id)));
        const optIds = new Set(opts.map((o) => o.id));
        setEdges((eds) => eds.filter((e) => !optIds.has(e.id)));
        patchData(id, { options: [] });
      }
      patchStep(id, { type: t });
      flow.updateStepQuiet(id, { type: t });
    },
    [nodes, patchData, patchStep, setEdges]
  );

  const onAddOption = useCallback(
    async (stepId: string) => {
      const opt = await flow.addOptionReturning(stepId);
      const node = nodes.find((n) => n.id === stepId);
      if (node) patchData(stepId, { options: [...dataOf(node).options, opt] });
    },
    [nodes, patchData]
  );

  const onOptionFields = useCallback(
    (
      stepId: string,
      optionId: string,
      fields: { label?: string; subtitle?: string | null; icon?: string | null }
    ) => {
      const node = nodes.find((n) => n.id === stepId);
      if (node) {
        patchData(stepId, {
          options: dataOf(node).options.map((o) =>
            o.id === optionId ? { ...o, ...fields } : o
          ),
        });
      }
      flow.updateOptionFieldsQuiet(optionId, fields);
    },
    [nodes, patchData]
  );

  // Estilo uniforme dos botões da etapa (layout, template, cores, fonte, etc.).
  const onStepStyle = useCallback(
    (stepId: string, patch: StepStylePatch) => {
      patchStep(stepId, patch);
      flow.updateStepStyleQuiet(stepId, patch);
    },
    [patchStep]
  );

  // "Replicar estilo": copia o visual da etapa para TODAS as demais etapas de
  // pergunta da jornada, e reflete a mudança no estado local do canvas.
  const onReplicateStyle = useCallback(
    async (sourceStepId: string) => {
      const patch = await flow.copyStepStyleToJourneyQuiet(
        journey.id,
        sourceStepId
      );
      setNodes((nds) =>
        nds.map((n) => {
          const data = n.data as unknown as StepNodeData;
          if (n.id === sourceStepId || data.step.type !== "question") return n;
          return {
            ...n,
            data: { ...n.data, step: { ...data.step, ...patch } },
          };
        })
      );
    },
    [journey.id, setNodes]
  );

  const onDeleteOption = useCallback(
    (stepId: string, optionId: string) => {
      flow.deleteOptionQuiet(optionId);
      const node = nodes.find((n) => n.id === stepId);
      if (node) {
        patchData(stepId, {
          options: dataOf(node).options.filter((o) => o.id !== optionId),
        });
      }
      setEdges((eds) => eds.filter((e) => e.id !== optionId));
    },
    [nodes, patchData, setEdges]
  );

  const onSetProducts = useCallback(
    (stepId: string, ids: string[]) => {
      flow.setStepProductsQuiet(stepId, ids);
      patchData(stepId, { productIds: ids, productCount: ids.length });
    },
    [patchData]
  );

  const onSetStart = useCallback(
    (stepId: string) => {
      flow.setStartStepQuiet(journey.id, stepId);
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, isStart: n.id === stepId },
        }))
      );
    },
    [journey.id, setNodes]
  );

  const onDeleteStep = useCallback(
    (stepId: string) => {
      flow.deleteStepQuiet(stepId);
      setNodes((nds) => nds.filter((n) => n.id !== stepId));
      // Remove conexões de/para essa etapa (o banco zera os next_step_id).
      setEdges((eds) =>
        eds.filter((e) => e.source !== stepId && e.target !== stepId)
      );
      setSelectedId(null);
    },
    [setNodes, setEdges]
  );

  const onVideoUploaded = useCallback(
    (stepId: string, url: string) => patchStep(stepId, { video_url: url }),
    [patchStep]
  );

  // Nó selecionado (para o Inspector).
  const selectedNode = nodes.find((n) => n.id === selectedId);
  const selData = selectedNode ? dataOf(selectedNode) : null;

  return (
    <div className="flex h-[calc(100vh-12rem)] w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
      <div className="relative flex-1">
        {/* Toolbar */}
        <div className="absolute left-3 top-3 z-10 flex gap-2">
          <Button variant="primary" size="sm" onClick={() => addStep("question")}>
            + Etapa de pergunta
          </Button>
          <Button variant="secondary" size="sm" onClick={() => addStep("result")}>
            + Etapa de resultado
          </Button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={(_e, n) => setSelectedId(n.id)}
          onPaneClick={() => setSelectedId(null)}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>

      {selData && selectedNode && (
        <Inspector
          key={selectedNode.id}
          journeyId={journey.id}
          step={selData.step}
          options={selData.options}
          productIds={selData.productIds}
          products={products}
          isStart={selData.isStart}
          onTitle={(v) => {
            patchStep(selectedNode.id, { title: v });
            flow.updateStepQuiet(selectedNode.id, { title: v });
          }}
          onQuestion={(v) => {
            patchStep(selectedNode.id, { question_text: v });
            flow.updateStepQuiet(selectedNode.id, { question_text: v });
          }}
          onType={(t) => onType(selectedNode.id, t)}
          onAddOption={() => onAddOption(selectedNode.id)}
          onOptionFields={(optId, fields) =>
            onOptionFields(selectedNode.id, optId, fields)
          }
          onDeleteOption={(optId) => onDeleteOption(selectedNode.id, optId)}
          onStepStyle={(patch) => onStepStyle(selectedNode.id, patch)}
          onReplicateStyle={() => onReplicateStyle(selectedNode.id)}
          onSetProducts={(ids) => onSetProducts(selectedNode.id, ids)}
          onSetStart={() => onSetStart(selectedNode.id)}
          onDeleteStep={() => onDeleteStep(selectedNode.id)}
          onVideoUploaded={(url) => onVideoUploaded(selectedNode.id, url)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
