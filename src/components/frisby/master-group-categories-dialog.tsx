// Vincula categorias-pai de despesa a um grupo master — checkbox-list, sem
// drag-and-drop. Categorias já vinculadas a OUTRO grupo aparecem desabilitadas
// com o dono ao lado. Salvar substitui o conjunto completo (PUT idempotente).

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { useCategories } from "@/hooks/api";
import { useMasterGroups, useSetGroupCategories } from "@/hooks/api/journey";
import { apiErrorMessage } from "@/lib/api/error-messages";
import type { MasterGroup } from "@/lib/api/types";

interface MasterGroupCategoriesDialogProps {
  entityId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: MasterGroup | null;
}

export function MasterGroupCategoriesDialog({
  entityId,
  open,
  onOpenChange,
  group,
}: MasterGroupCategoriesDialogProps) {
  const catsQ = useCategories(entityId);
  const groupsQ = useMasterGroups(entityId);
  const setCategories = useSetGroupCategories(entityId);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !group) return;
    setSelected(new Set(group.categories.map((c) => c.id)));
    setError(null);
  }, [open, group]);

  const parentExpenseCats = useMemo(
    () => (catsQ.data ?? []).filter((c) => c.type === "EXPENSE" && c.parentId === null),
    [catsQ.data],
  );

  const ownerByCategory = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groupsQ.data ?? []) {
      if (g.id === group?.id) continue;
      for (const c of g.categories) map.set(c.id, g.name);
    }
    return map;
  }, [groupsQ.data, group]);

  function toggle(categoryId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  async function handleSave() {
    if (!group) return;
    setError(null);
    try {
      await setCategories.mutateAsync({ groupId: group.id, categoryIds: [...selected] });
      toast.success("Categorias atualizadas");
      onOpenChange(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => !setCategories.isPending && onOpenChange(v)}
      title={group ? `Categorias de "${group.name}"` : "Categorias"}
      description="Só categorias-pai de despesa podem ser vinculadas — subcategorias seguem o pai."
    >
      <div className="space-y-4 pb-1">
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {parentExpenseCats.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Nenhuma categoria de despesa cadastrada ainda.
            </p>
          ) : (
            parentExpenseCats.map((cat) => {
              const otherOwner = ownerByCategory.get(cat.id);
              const disabled = !!otherOwner;
              return (
                <label
                  key={cat.id}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm ${
                    disabled ? "opacity-50" : "cursor-pointer hover:bg-secondary/60"
                  }`}
                >
                  <Checkbox
                    checked={selected.has(cat.id)}
                    disabled={disabled}
                    onCheckedChange={() => toggle(cat.id)}
                  />
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="flex-1 truncate">{cat.name}</span>
                  {otherOwner && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      já em "{otherOwner}"
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>

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
          disabled={setCategories.isPending || !group}
        >
          {setCategories.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
