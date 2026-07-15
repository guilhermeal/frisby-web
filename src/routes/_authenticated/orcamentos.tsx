// Orçamentos: limite de gasto por categoria de DESPESA, com progresso
// ok/warning/exceeded calculado pelo backend. Orçamento informa, nunca
// bloqueia lançamento.

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, MoreVertical, PiggyBank, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { MonthPicker } from "@/components/frisby/month-picker";
import { EmptyState } from "@/components/frisby/empty-state";
import { BudgetProgress } from "@/components/frisby/budget-progress";
import { MoneyInput } from "@/components/frisby/money-input";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { ConfirmDialog } from "@/components/frisby/confirm-dialog";
import { PermissionGate } from "@/components/frisby/permission-gate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useBudgetReport,
  useBudgets,
  useCategories,
  useCreateBudget,
  useDeleteBudget,
  useUpdateBudget,
} from "@/hooks/api";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { PERMISSIONS } from "@/lib/auth/use-permissions";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { currentMonth } from "@/lib/format";
import type { Budget, BudgetPeriod } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/orcamentos")({
  component: OrcamentosPage,
});

function OrcamentosPage() {
  const { entity } = useCurrentEntity();
  const [month, setMonth] = useState(currentMonth());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);

  const budgetsQ = useBudgets(entity?.id);
  const reportQ = useBudgetReport(entity?.id, month);
  const deleteBudget = useDeleteBudget(entity?.id);

  const budgets = budgetsQ.data ?? [];
  const report = reportQ.data ?? [];
  const reportByBudget = useMemo(() => new Map(report.map((r) => [r.budgetId, r])), [report]);

  async function handleDelete(budget: Budget) {
    try {
      await deleteBudget.mutateAsync(budget.id);
      toast.success("Orçamento excluído");
    } catch (err) {
      toast.error(apiErrorMessage(err));
      throw err;
    }
  }

  const isLoading = budgetsQ.isLoading || reportQ.isLoading;

  return (
    <AppShell>
      <PageHeader
        title="Orçamentos"
        subtitle="Limites de gasto por categoria — informam, nunca bloqueiam"
        actions={
          <PermissionGate permission={PERMISSIONS.BUDGET_MANAGE}>
            <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo</span>
            </Button>
          </PermissionGate>
        }
      />

      <div className="mx-4 space-y-4 sm:mx-6 lg:mx-0">
        <MonthPicker value={month} onChange={setMonth} />

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : budgetsQ.error || reportQ.error ? (
          <div className="rounded-2xl border border-expense/30 bg-expense/5 p-6 text-sm text-expense">
            {apiErrorMessage(budgetsQ.error ?? reportQ.error)}
          </div>
        ) : budgets.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="Nenhum orçamento definido"
            description="Defina limites mensais ou anuais para categorias de despesa."
            action={
              <PermissionGate permission={PERMISSIONS.BUDGET_MANAGE}>
                <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4" /> Novo orçamento
                </Button>
              </PermissionGate>
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {budgets.map((budget) => {
              const item = reportByBudget.get(budget.id);
              return (
                <li
                  key={budget.id}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border bg-card p-4",
                    item?.status === "exceeded"
                      ? "border-expense/40"
                      : item?.status === "warning"
                        ? "border-warning/40"
                        : "border-border/60",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    {item ? (
                      <BudgetProgress item={item} />
                    ) : (
                      <div>
                        <p className="text-sm font-medium">{budget.categoryName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Sem gastos neste mês.</p>
                      </div>
                    )}
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {budget.period === "MONTHLY" ? "Mensal" : "Anual"}
                    </p>
                  </div>
                  <PermissionGate permission={PERMISSIONS.BUDGET_MANAGE}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          aria-label={`Ações do orçamento ${budget.categoryName}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setEditing(budget)}>
                          Editar valor
                        </DropdownMenuItem>
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
                          title="Excluir orçamento?"
                          description="Só o limite é removido — os lançamentos não são afetados."
                          confirmLabel="Excluir"
                          destructive
                          onConfirm={() => handleDelete(budget)}
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </PermissionGate>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BudgetFormDialog
        entityId={entity?.id}
        open={creating || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setCreating(false);
            setEditing(null);
          }
        }}
        budget={editing ?? undefined}
        existingCategoryIds={budgets.map((b) => b.categoryId)}
      />
    </AppShell>
  );
}

// ---------------------------------------------------------------------------

function BudgetFormDialog({
  entityId,
  open,
  onOpenChange,
  budget,
  existingCategoryIds,
}: {
  entityId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: Budget;
  existingCategoryIds: string[];
}) {
  const isEdit = !!budget;
  const categoriesQ = useCategories(entityId);
  const createBudget = useCreateBudget(entityId);
  const updateBudget = useUpdateBudget(entityId);

  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("MONTHLY");
  const [error, setError] = useState<string | null>(null);

  // Só categorias EXPENSE raiz que ainda não têm orçamento.
  const available = (categoriesQ.data ?? []).filter(
    (c) => c.type === "EXPENSE" && !existingCategoryIds.includes(c.id),
  );

  const pending = createBudget.isPending || updateBudget.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || BigInt(amount) <= 0n) {
      setError("Informe o valor do limite.");
      return;
    }
    setError(null);
    try {
      if (isEdit && budget) {
        await updateBudget.mutateAsync({ budgetId: budget.id, amount });
        toast.success("Orçamento atualizado");
      } else {
        if (!categoryId) {
          setError("Escolha uma categoria.");
          return;
        }
        await createBudget.mutateAsync({ categoryId, amount, currency: "BRL", period });
        toast.success("Orçamento criado");
      }
      onOpenChange(false);
      setAmount("");
      setCategoryId(undefined);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => !pending && onOpenChange(v)}
      title={isEdit ? `Orçamento de ${budget?.categoryName}` : "Novo orçamento"}
    >
      <form onSubmit={onSubmit} className="space-y-4 pb-1">
        {!isEdit && (
          <>
            <div className="space-y-1.5">
              <Label>Categoria de despesa</Label>
              <Select value={categoryId ?? ""} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {available.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Todas as categorias de despesa já têm orçamento.
                    </div>
                  )}
                  {available.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className={cn("flex items-center gap-2", c.parentId && "pl-4")}>
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Período</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as BudgetPeriod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Mensal</SelectItem>
                  <SelectItem value="YEARLY">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="budget-amount">Limite</Label>
          <MoneyInput id="budget-amount" value={amount} onChange={setAmount} />
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
          {isEdit ? "Salvar" : "Criar orçamento"}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
