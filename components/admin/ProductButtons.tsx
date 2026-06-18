"use client";

import { useState } from "react";
import type { ProductButton } from "@/lib/supabase";
import ButtonsEditor from "./ButtonsEditor";

// =====================================================================
// ProductButtons — wrapper de FORMULÁRIO do ButtonsEditor (até 2 botões).
// Mantém o estado e expõe um <input hidden> "buttons_json" que viaja com
// o <form action={updateProduct}> da seção de produtos.
// =====================================================================
export default function ProductButtons({
  initial,
}: {
  initial: ProductButton[];
}) {
  const [buttons, setButtons] = useState<ProductButton[]>(initial ?? []);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="ds-label">Botões de ação (até 2)</span>
      <ButtonsEditor value={buttons} onChange={setButtons} max={2} />
      <input type="hidden" name="buttons_json" value={JSON.stringify(buttons)} />
    </div>
  );
}
