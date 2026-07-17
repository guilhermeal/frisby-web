// Criação/edição de categoria. Paleta fixa de cores (tokens visuais do
// produto) + grade curada de ícones lucide (slug persistido no backend).
// Subcategoria herda o tipo do pai (campo nem aparece); isSystem só renomeia.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { CATEGORY_ICONS, CategoryIcon } from "@/components/frisby/category-icon";
import { useCreateCategory, useUpdateCategory } from "@/hooks/api";
import { apiErrorMessage } from "@/lib/api/error-messages";
import type { Category, TxType } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const CATEGORY_COLORS = [
  // ── Originais (mantidas) ──────────────────────────────────────────────
  "#FF8A65", // laranja claro
  "#FFD54F", // amarelo pastel
  "#AED581", // verde claro
  "#4DB6AC", // teal claro
  "#4FC3F7", // azul claro
  "#7986CB", // índigo claro
  "#BA68C8", // roxo claro
  "#F06292", // rosa
  "#A1887F", // marrom claro
  "#90A4AE", // azul-acinzentado claro
  "#2E9E6B", // verde (marca)
  "#D2445A", // vermelho (marca)
  "#E53935", // vermelho vivo
  "#EF6C00", // laranja queimado
  "#F9A825", // mostarda/dourado
  "#C0CA33", // verde-oliva / lima
  "#2E7D32", // verde floresta
  "#00796B", // teal escuro
  "#006064", // ciano profundo
  "#0288D1", // azul céu escuro
  "#1565C0", // azul royal
  "#283593", // índigo profundo
  "#5E35B1", // violeta
  "#8E24AA", // roxo magenta
  "#AD1457", // framboesa
  "#C2185B", // rosa escuro
  "#6D4C41", // marrom café
  "#455A64", // azul-acinzentado escuro (slate)
  "#FFB300", // âmbar
  "#37474F", // grafite
];

interface CategoryFormProps {
  entityId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tipo do lançamento (aba ativa) — ignorado em subcategoria/edição. */
  type: TxType;
  /** Presente = criar SUBcategoria deste pai. */
  parent?: Category;
  /** Presente = edição. */
  category?: Category;
}

export function CategoryForm({
  entityId,
  open,
  onOpenChange,
  type,
  parent,
  category,
}: CategoryFormProps) {
  const isEdit = !!category;
  const isSystem = category?.isSystem ?? false;
  const createCategory = useCreateCategory(entityId);
  const updateCategory = useUpdateCategory(entityId);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState("tag");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (category) {
      setName(category.name);
      setCode(category.code ?? "");
      setColor(category.color);
      setIcon(category.icon);
    } else {
      setName("");
      setCode("");
      setColor(parent?.color ?? CATEGORY_COLORS[0]);
      setIcon(parent?.icon ?? "tag");
    }
  }, [open, category, parent]);

  const pending = createCategory.isPending || updateCategory.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isEdit && category) {
        await updateCategory.mutateAsync({
          categoryId: category.id,
          name,
          code: code || undefined,
          ...(isSystem ? {} : { color, icon }),
        });
        toast.success("Categoria atualizada");
      } else {
        await createCategory.mutateAsync({
          name,
          type: parent?.type ?? type,
          parentId: parent?.id,
          code: code || undefined,
          color,
          icon,
        });
        toast.success(parent ? "Subcategoria criada" : "Categoria criada");
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
      title={
        isEdit ? "Editar categoria" : parent ? `Subcategoria de ${parent.name}` : "Nova categoria"
      }
      description={
        isSystem
          ? "Categoria de sistema — apenas o nome pode ser alterado."
          : parent
            ? `Herda o tipo ${parent.type === "EXPENSE" ? "despesa" : "receita"} do pai.`
            : undefined
      }
    >
      <form onSubmit={onSubmit} className="space-y-4 pb-1">
        <div className="space-y-1.5">
          <Label htmlFor="category-name">Nome</Label>
          <Input
            id="category-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Alimentação"
          />
        </div>

        {!isSystem && (
          <div className="space-y-1.5">
            <Label htmlFor="category-code">Código (opcional)</Label>
            <Input
              id="category-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex.: 1.2"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Atalho de busca (ex. "1.2"). Único por tipo nesta entidade.
            </p>
          </div>
        )}

        {!isSystem && (
          <>
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
                      "h-7 w-7 rounded-full transition-transform",
                      color === c &&
                        "scale-110 ring-2 ring-ink ring-offset-2 ring-offset-background",
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
                      "grid h-9 w-9 place-items-center rounded-lg border transition-colors",
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
          </>
        )}

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
