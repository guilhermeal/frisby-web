// Editor de faixas (min–max, em pontos percentuais) por grupo master de uma
// fase. min > max bloqueia salvar (erro inline); soma dos máximos > 100% só
// avisa (o backend confirma o warning — aqui replicamos pra feedback ao vivo).

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { useMasterGroups, useSetStageTargets } from "@/hooks/api/journey";
import { apiErrorMessage } from "@/lib/api/error-messages";
import type { FlowStage } from "@/lib/api/types";

interface StageTargetsEditorProps {
  entityId: string | undefined;
  flowId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: FlowStage | null;
}

export function StageTargetsEditor({
  entityId,
  flowId,
  open,
  onOpenChange,
  stage,
}: StageTargetsEditorProps) {
  const groupsQ = useMasterGroups(entityId);
  const setTargets = useSetStageTargets(entityId);

  // valores em pontos percentuais (0-100), string pra permitir campo vazio
  const [values, setValues] = useState<Record<string, { min: string; max: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [serverWarnings, setServerWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !stage) return;
    setError(null);
    setServerWarnings([]);
    const next: Record<string, { min: string; max: string }> = {};
    for (const t of stage.targets) {
      next[t.masterGroupId] = {
        min: String(Math.round(t.minPct * 100)),
        max: String(Math.round(t.maxPct * 100)),
      };
    }
    setValues(next);
  }, [open, stage]);

  function setValue(groupId: string, field: "min" | "max", raw: string) {
    const digits = raw.replace(/[^\d]/g, "").slice(0, 3);
    setValues((prev) => ({
      ...prev,
      [groupId]: { min: prev[groupId]?.min ?? "", max: prev[groupId]?.max ?? "", [field]: digits },
    }));
  }

  const groups = groupsQ.data ?? [];
  const hasMinMaxError = groups.some((g) => {
    const v = values[g.id];
    if (!v || v.min === "" || v.max === "") return false;
    return Number(v.min) > Number(v.max);
  });
  const sumMax = groups.reduce((sum, g) => {
    const v = values[g.id];
    return sum + (v?.max ? Number(v.max) : 0);
  }, 0);
  const localWarning = sumMax > 100;

  async function handleSave() {
    if (!stage || !flowId || hasMinMaxError) return;
    setError(null);
    try {
      const targets = groups
        .filter((g) => {
          const v = values[g.id];
          return v && v.min !== "" && v.max !== "";
        })
        .map((g) => ({
          masterGroupId: g.id,
          minPct: Number(values[g.id]!.min) / 100,
          maxPct: Number(values[g.id]!.max) / 100,
        }));

      const res = await setTargets.mutateAsync({ flowId, stageId: stage.id, targets });
      setServerWarnings(res.warnings);
      if (res.warnings.length === 0) {
        toast.success("Faixas salvas");
        onOpenChange(false);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => !setTargets.isPending && onOpenChange(v)}
      title={stage ? `Faixas de "${stage.name}"` : "Faixas"}
      description="Percentual da renda (min–max) que caracteriza a fase, por grupo master."
    >
      <div className="space-y-4 pb-1">
        <div className="space-y-3">
          {groups.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Crie grupos master primeiro para definir faixas.
            </p>
          ) : (
            groups.map((g) => {
              const v = values[g.id] ?? { min: "", max: "" };
              const rowError = v.min !== "" && v.max !== "" && Number(v.min) > Number(v.max);
              return (
                <div key={g.id} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: g.color ?? "var(--color-muted-foreground)" }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{g.name}</span>
                  <Input
                    value={v.min}
                    onChange={(e) => setValue(g.id, "min", e.target.value)}
                    placeholder="min"
                    inputMode="numeric"
                    className={`h-8 w-16 text-right text-xs ${rowError ? "border-expense" : ""}`}
                  />
                  <span className="text-xs text-muted-foreground">a</span>
                  <Input
                    value={v.max}
                    onChange={(e) => setValue(g.id, "max", e.target.value)}
                    placeholder="max"
                    inputMode="numeric"
                    className={`h-8 w-16 text-right text-xs ${rowError ? "border-expense" : ""}`}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              );
            })
          )}
        </div>

        {hasMinMaxError && (
          <p className="text-xs text-expense">O mínimo não pode ser maior que o máximo.</p>
        )}
        {!hasMinMaxError && localWarning && (
          <p className="text-xs text-warning">
            A soma dos limites máximos passa de 100% da renda. Isso é permitido, mas revise se é o
            que você quer.
          </p>
        )}
        {serverWarnings.map((w) => (
          <p key={w} className="text-xs text-warning">
            {w}
          </p>
        ))}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-expense/40 bg-expense/5 px-3 py-2 text-xs text-expense"
          >
            {error}
          </div>
        )}

        <Button
          type="button"
          className="w-full"
          onClick={handleSave}
          disabled={setTargets.isPending || hasMinMaxError || !stage}
        >
          {setTargets.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar faixas
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
