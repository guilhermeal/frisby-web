// Categorias: abas Despesas/Receitas, árvore de 1 nível com expandir/
// recolher, CRUD com cor+ícone. Categoria de sistema tem cadeado (só
// renomear). Excluir é soft — lançamentos antigos preservam o histórico.

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, Loader2, Lock, MoreVertical, Plus, Tags, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { EmptyState } from "@/components/frisby/empty-state";
import { CategoryForm } from "@/components/frisby/category-form";
import { CategoryImportDialog } from "@/components/frisby/category-import-dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type SortBy = "name" | "code";

function sortCategories(list: Category[], sortBy: SortBy): Category[] {
  return [...list].sort((a, b) => {
    if (sortBy === "code") {
      const ac = a.code ?? "";
      const bc = b.code ?? "";
      if (!ac && !bc) return a.name.localeCompare(b.name, "pt-BR");
      if (!ac) return 1;
      if (!bc) return -1;
      return ac.localeCompare(bc, "pt-BR", { numeric: true });
    }
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

function CategoriasPage() {
  const { entity } = useCurrentEntity();
  const [tab, setTab] = useState<TxType>("EXPENSE");
  const [form, setForm] = useState<FormState>(null);
  const [importing, setImporting] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("name");

  const categoriesQ = useCategories(entity?.id);
  const deleteCategory = useDeleteCategory(entity?.id);

  // Reconstrói a árvore a partir da lista flat, ordenando pais e filhos pelo mesmo critério.
  const tree = useMemo(() => {
    const all = (categoriesQ.data ?? []).filter((c) => c.type === tab);
    const roots = sortCategories(
      all.filter((c) => !c.parentId),
      sortBy,
    );
    const children = new Map<string, Category[]>();
    for (const c of all) {
      if (c.parentId) {
        const list = children.get(c.parentId) ?? [];
        list.push(c);
        children.set(c.parentId, list);
      }
    }
    for (const [key, list] of children) {
      children.set(key, sortCategories(list, sortBy));
    }
    return { roots, children };
  }, [categoriesQ.data, tab, sortBy]);

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
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setImporting(true)}
            >
              <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Importar</span>
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setForm({ mode: "create" })}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nova</span>
            </Button>
          </PermissionGate>
        }
      />

      <div className="mx-4 space-y-4 sm:mx-6 lg:mx-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TxType)}>
            <TabsList>
              <TabsTrigger value="EXPENSE">Despesas</TabsTrigger>
              <TabsTrigger value="INCOME">Receitas</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Ordenar por nome</SelectItem>
              <SelectItem value="code">Ordenar por código</SelectItem>
            </SelectContent>
          </Select>
        </div>

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

      <CategoryImportDialog entityId={entity?.id} open={importing} onOpenChange={setImporting} />
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
                "grid h-6 w-6 cursor-pointer place-items-center rounded-md text-muted-foreground transition-transform hover:bg-secondary",
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
      <span className="min-w-0 flex-1 truncate text-sm font-medium" title={category.name}>
        {category.name}
        {category.code && (
          <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">
            {category.code}
          </span>
        )}
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
