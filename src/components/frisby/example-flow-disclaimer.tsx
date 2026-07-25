// Aviso reutilizável: o fluxo de exemplo é ilustrativo, não recomendação
// financeira. O Frisby não recomenda método nenhum — dá a ferramenta.

import { Info } from "lucide-react";

export function ExampleFlowDisclaimer() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-secondary/40 px-3 py-2.5 text-xs text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p>
        Este é um exemplo ilustrativo para você começar a editar. O Frisby não recomenda nenhum
        método de orçamento — as faixas e grupos são seus, ajuste como fizer sentido.
      </p>
    </div>
  );
}
