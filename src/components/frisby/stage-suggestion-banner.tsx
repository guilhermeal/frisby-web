// Sugestão pendente de mudança de fase — aceitar/recusar. Só renderiza
// quando há PendingSuggestion (checado pelo chamador).

import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/frisby/permission-gate";
import { PERMISSIONS } from "@/lib/auth/use-permissions";
import { useAcceptSuggestion, useDismissSuggestion } from "@/hooks/api/journey";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { formatMonth } from "@/lib/format";
import type { PendingSuggestion } from "@/lib/api/types";

export function StageSuggestionBanner({
  entityId,
  suggestion,
}: {
  entityId: string | undefined;
  suggestion: PendingSuggestion;
}) {
  const accept = useAcceptSuggestion(entityId);
  const dismiss = useDismissSuggestion(entityId);

  async function handleAccept() {
    try {
      await accept.mutateAsync(suggestion.snapshotMonth);
      toast.success(`Fase atualizada para ${suggestion.suggestedStage?.name}`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function handleDismiss() {
    try {
      await dismiss.mutateAsync(suggestion.snapshotMonth);
      toast.success("Sugestão recusada");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/40 bg-brand-soft/40 p-4">
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <p className="text-sm">
          Pelos números de {formatMonth(`${suggestion.snapshotMonth}-01`)}, você se encaixa em{" "}
          <strong>{suggestion.suggestedStage?.name ?? "outra fase"}</strong>.
        </p>
      </div>
      <PermissionGate permission={PERMISSIONS.JOURNEY_MANAGE} mode="disable">
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={handleDismiss} disabled={dismiss.isPending}>
            Agora não
          </Button>
          <Button size="sm" onClick={handleAccept} disabled={accept.isPending}>
            Aceitar
          </Button>
        </div>
      </PermissionGate>
    </div>
  );
}
