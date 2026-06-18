"use client";

import { createContext, useContext } from "react";

// =====================================================================
// Contexto para os botões-ícone do card (StepNode) acionarem ações do
// canvas (JourneyFlow) sem precisar passar callbacks por buildNode/data.
// =====================================================================
export type StepActions = {
  onDuplicate: (stepId: string) => void;
  onPreview: (stepId: string) => void;
};

const noop = () => {};

export const StepActionsContext = createContext<StepActions>({
  onDuplicate: noop,
  onPreview: noop,
});

export function useStepActions() {
  return useContext(StepActionsContext);
}
