// Categorias: abas Despesas/Receitas, árvore de 1 nível com expandir/
// recolher, CRUD com cor+ícone. Categoria de sistema tem cadeado (só
// renomear). Excluir é soft — lançamentos antigos preservam o histórico.

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, Loader2, Lock, MoreVertical, Plus, Tags } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { EmptyState } from "@/components/frisby/empty-state";
import { CategoryForm } from "@/components/frisby/category-form";
import { CategoryIcon } from "@/components/frisby/category-icon";
import { ConfirmDialog } from "@/components/frisby/confirm-dialog";
import { PermissionGate } from "@/components/frisby/permission-gate";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCategories, useDeleteCategory } from "@/hooks/api";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { PERMISSIONS } from "@/lib/auth/use-permissions";
import { apiErrorMessage } from "@/lib/api/error-messages";
import type { Category, TxType } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/categorias")({
  component: CategoriasPage,
});

type FormState =
  | { mode: "create" }
  | { mode: "sub"; parent: Category }
  | { mode: "edit"; category: Category }
  | null;

function CategoriasPage() {
  const { entity } = useCurrentEntity();
  const [tab, setTab] = useState<TxType>("EXPENSE");
  const [form, setForm] = useState<FormState>(null);

  const categoriesQ = useCategories(entity?.id);
  const deleteCategory = useDeleteCategory(entity?.id);

  // Reconstrói a árvore a partir da lista flat (ordem pai→filhos preservada).
  const tree = useMemo(() => {
    const all = (categoriesQ.data ?? []).filter((c) => c.type === tab);
    const roots = all.filter((c) => !c.parentId);
    const children = new Map<string, Category[]>();
    for (const c of all) {
      if (c.parentId) {
        const list = children.get(c.parentId) ?? [];
        list.push(c);
        children.set(c.parentId, list);
      }
    }
    return { roots, children };
  }, [categoriesQ.data, tab]);

  async function handleDelete(category: Category) {
    try {
      await deleteCategory.mutateAsync(category.id);
      toast.success(`Categoria "${category.name}" excluída`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
      throw err;
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Categorias"
        subtitle="Organize despesas e receitas em até dois níveis"
        actions={
          <PermissionGate permission={PERMISSIONS.CATEGORY_MANAGE}>
            <Button size="sm" className="gap-1.5" onClick={() => setForm({ mode: "create" })}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nova</span>
            </Button>
          </PermissionGate>
        }
      />

      <div className="mx-4 space-y-4 sm:mx-6 lg:mx-0">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TxType)}>
          <TabsList>
            <TabsTrigger value="EXPENSE">Despesas</TabsTrigger>
            <TabsTrigger value="INCOME">Receitas</TabsTrigger>
          </TabsList>
        </Tabs>

        {categoriesQ.isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : categoriesQ.error ? (
          <div className="rounded-2xl border border-expense/30 bg-expense/5 p-6 text-sm text-expense">
            {apiErrorMessage(categoriesQ.error)}
          </div>
        ) : tree.roots.length === 0 ? (
          <EmptyState
            icon={Tags}
            title={`Nenhuma categoria de ${tab === "EXPENSE" ? "despesa" : "receita"}`}
            description="Crie categorias para organizar seus lançamentos."
            action={
              <PermissionGate permission={PERMISSIONS.CATEGORY_MANAGE}>
                <Button size="sm" className="gap-1.5" onClick={() => setForm({ mode: "create" })}>
                  <Plus className="h-4 w-4" /> Nova categoria
                </Button>
              </PermissionGate>
            }
          />
        ) : (
          <ul className="space-y-2">
            {tree.roots.map((root) => (
              <CategoryNode
                key={root.id}
                category={root}
                subcategories={tree.children.get(root.id) ?? []}
                onEdit={(c) => setForm({ mode: "edit", category: c })}
                onAddSub={(c) => setForm({ mode: "sub", parent: c })}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}
      </div>

      <CategoryForm
        entityId={entity?.id}
        open={!!form}
        onOpenChange={(v) => !v && setForm(null)}
        type={tab}
        parent={form?.mode === "sub" ? form.parent : undefined}
        category={form?.mode === "edit" ? form.category : undefined}
      />
    </AppShell>
  );
}

// ---------------------------------------------------------------------------

function CategoryNode({
  category,
  subcategories,
  onEdit,
  onAddSub,
  onDelete,
}: {
  category: Category;
  subcategories: Category[];
  onEdit: (c: Category) => void;
  onAddSub: (c: Category) => void;
  onDelete: (c: Category) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = subcategories.length > 0;

  return (
    <li className="rounded-2xl border border-border/60 bg-card">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-2 p-3">
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition-transform hover:bg-secondary",
                open && "rotate-90",
                !hasChildren && "invisible",
              )}
              aria-label={open ? "Recolher" : "Expandir"}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </CollapsibleTrigger>
          <CategoryRow
            category={category}
            isRoot
            onEdit={onEdit}
            onAddSub={onAddSub}
            onDelete={onDelete}
          />
        </div>
        {hasChildren && (
          <CollapsibleContent>
            <ul className="space-y-1 border-t border-border/50 py-2 pl-12 pr-3">
              {subcategories.map((sub) => (
                <li key={sub.id} className="flex items-center gap-2 py-1">
                  <CategoryRow
                    category={sub}
                    onEdit={onEdit}
                    onAddSub={onAddSub}
                    onDelete={onDelete}
                  />
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        )}
      </Collapsible>
    </li>
  );
}

function CategoryRow({
  category,
  isRoot,
  onEdit,
  onAddSub,
  onDelete,
}: {
  category: Category;
  isRoot?: boolean;
  onEdit: (c: Category) => void;
  onAddSub: (c: Category) => void;
  onDelete: (c: Category) => Promise<void>;
}) {
  return (
    <>
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white"
        style={{ backgroundColor: category.color }}
      >
        <CategoryIcon slug={category.icon} className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {category.name}
        {category.isSystem && (
          <Lock
            className="ml-1.5 inline h-3 w-3 text-muted-foreground"
            aria-label="Categoria de sistema"
          />
        )}
      </span>
      <PermissionGate permission={PERMISSIONS.CATEGORY_MANAGE}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label={`Ações de ${category.name}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onEdit(category)}>
              {category.isSystem ? "Renomear" : "Editar"}
            </DropdownMenuItem>
            {isRoot && !category.isSystem && (
              <DropdownMenuItem onClick={() => onAddSub(category)}>
                Nova subcategoria
              </DropdownMenuItem>
            )}
            {!category.isSystem && (
              <>
                <DropdownMenuSeparator />
                <ConfirmDialog
                  trigger={
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-expense focus:text-expense"
                    >
                      Excluir
                    </DropdownMenuItem>
                  }
                  title={`Excluir "${category.name}"?`}
                  description="Ela some das novas seleções, mas os lançamentos antigos preservam a categoria no histórico."
                  confirmLabel="Excluir"
                  destructive
                  onConfirm={() => onDelete(category)}
                />
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </PermissionGate>
    </>
  );
}
