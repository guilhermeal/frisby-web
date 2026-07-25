// Criação/edição de fase de um fluxo (nome, descrição, cor). Faixas por
// grupo master são editadas à parte, em StageTargetsEditor.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { CATEGORY_COLORS } from "@/components/frisby/category-form";
import { useCreateStage, useUpdateStage } from "@/hooks/api/journey";
import { apiErrorMessage } from "@/lib/api/error-messages";
import type { FlowStage } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface FlowStageFormProps {
  entityId: string | undefined;
  flowId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage?: FlowStage;
}

export function FlowStageForm({ entityId, flowId, open, onOpenChange, stage }: FlowStageFormProps) {
  const isEdit = !!stage;
  const createStage = useCreateStage(entityId);
  const updateStage = useUpdateStage(entityId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (stage) {
      setName(stage.name);
      setDescription(stage.description ?? "");
      setColor(stage.color ?? CATEGORY_COLORS[0]);
    } else {
      setName("");
      setDescription("");
      setColor(CATEGORY_COLORS[0]);
    }
  }, [open, stage]);

  const pending = createStage.isPending || updateStage.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!flowId) return;
    try {
      if (isEdit && stage) {
        await updateStage.mutateAsync({
          flowId,
          stageId: stage.id,
          name,
          description: description || null,
          color,
        });
        toast.success("Fase atualizada");
      } else {
        await createStage.mutateAsync({
          flowId,
          name,
          description: description || undefined,
          color,
        });
        toast.success("Fase criada");
      }
      onOpenChange(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => !pending && onOpenChange(v)}
      title={isEdit ? "Editar fase" : "Nova fase"}
      description="Fases vão da pior à melhor — a ordem é ajustada depois com os botões subir/descer."
    >
      <form onSubmit={onSubmit} className="space-y-4 pb-1">
        <div className="space-y-1.5">
          <Label htmlFor="stage-name">Nome</Label>
          <Input
            id="stage-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Organizando"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="stage-description">Descrição (opcional)</Label>
          <Textarea
            id="stage-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="O que caracteriza essa fase da jornada…"
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Cor</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Cor ${c}`}
                onClick={() => setColor(c)}
                className={cn(
                  "h-7 w-7 cursor-pointer rounded-full transition-transform",
                  color === c && "scale-110 ring-2 ring-ink ring-offset-2 ring-offset-background",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-expense/40 bg-expense/5 px-3 py-2 text-xs text-expense"
          >
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Salvar" : "Criar"}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
