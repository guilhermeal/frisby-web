// Criação/edição de grupo master. Mesma paleta/grade de ícones de categoria
// (CATEGORY_COLORS/CATEGORY_ICONS) para manter consistência visual.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { CATEGORY_COLORS } from "@/components/frisby/category-form";
import { CATEGORY_ICONS, CategoryIcon } from "@/components/frisby/category-icon";
import { useCreateMasterGroup, useUpdateMasterGroup } from "@/hooks/api/journey";
import { apiErrorMessage } from "@/lib/api/error-messages";
import type { MasterGroup } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface MasterGroupFormProps {
  entityId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: MasterGroup;
}

export function MasterGroupForm({ entityId, open, onOpenChange, group }: MasterGroupFormProps) {
  const isEdit = !!group;
  const createGroup = useCreateMasterGroup(entityId);
  const updateGroup = useUpdateMasterGroup(entityId);

  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState("tag");
  const [includeContributions, setIncludeContributions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (group) {
      setName(group.name);
      setColor(group.color ?? CATEGORY_COLORS[0]);
      setIcon(group.icon ?? "tag");
      setIncludeContributions(group.includeContributions);
    } else {
      setName("");
      setColor(CATEGORY_COLORS[0]);
      setIcon("tag");
      setIncludeContributions(false);
    }
  }, [open, group]);

  const pending = createGroup.isPending || updateGroup.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isEdit && group) {
        await updateGroup.mutateAsync({
          groupId: group.id,
          name,
          color,
          icon,
          includeContributions,
        });
        toast.success("Grupo master atualizado");
      } else {
        await createGroup.mutateAsync({ name, color, icon, includeContributions });
        toast.success("Grupo master criado");
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
      title={isEdit ? "Editar grupo master" : "Novo grupo master"}
      description="Camada acima das categorias-pai — ex.: Necessidades, Desejos, Futuro."
    >
      <form onSubmit={onSubmit} className="space-y-4 pb-1">
        <div className="space-y-1.5">
          <Label htmlFor="group-name">Nome</Label>
          <Input
            id="group-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Necessidades"
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

        <div className="space-y-1.5">
          <Label>Ícone</Label>
          <div className="grid grid-cols-8 gap-1.5">
            {Object.keys(CATEGORY_ICONS).map((slug) => (
              <button
                key={slug}
                type="button"
                aria-label={`Ícone ${slug}`}
                onClick={() => setIcon(slug)}
                className={cn(
                  "grid h-9 w-9 cursor-pointer place-items-center rounded-lg border transition-colors",
                  icon === slug
                    ? "border-ink bg-ink text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary",
                )}
              >
                <CategoryIcon slug={slug} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <div>
            <Label htmlFor="group-contributions">Incluir aportes</Label>
            <p className="text-xs text-muted-foreground">
              Soma transferências de aporte (CONTRIBUTION) do mês ao realizado deste grupo.
            </p>
          </div>
          <Switch
            id="group-contributions"
            checked={includeContributions}
            onCheckedChange={setIncludeContributions}
          />
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
