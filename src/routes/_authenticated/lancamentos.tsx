// Lançamentos — tela principal. Filtros de mês/tipo/status vivem na URL
// (deep-link) e vão para o servidor; a busca textual é client-side (o
// backend não tem busca). Ações por item: baixar, estornar, editar, excluir.

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Loader2, MoreVertical, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { MoneyText } from "@/components/frisby/money-text";
import { MonthPicker } from "@/components/frisby/month-picker";
import { StatusPill } from "@/components/frisby/status-pill";
import { EmptyState } from "@/components/frisby/empty-state";
import { TransactionForm } from "@/components/frisby/transaction-form";
import { SettleDialog } from "@/components/frisby/settle-dialog";
import { ConfirmDialog } from "@/components/frisby/confirm-dialog";
import { PermissionGate } from "@/components/frisby/permission-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { PERMISSIONS } from "@/lib/auth/use-permissions";
import {
  useAccounts,
  useCategories,
  useMembers,
  useMonthlyReport,
  useTransactions,
  useDeleteTransaction,
  useUnsettleTransaction,
} from "@/hooks/api";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { formatDate, currentMonth, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Account, Category, Member, Transaction, TxStatus, TxType } from "@/lib/api/types";

const searchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  status: z.enum(["PLANNED", "SETTLED"]).optional(),
});

export const Route = createFileRoute("/_authenticated/lancamentos")({
  validateSearch: searchSchema,
  component: Lancamentos,
});

type FilterKind = "all" | "income" | "expense" | "planned" | "settled";

const FILTERS: Array<[FilterKind, string, { type?: TxType; status?: TxStatus }]> = [
  ["all", "Todos", {}],
  ["expense", "Despesas", { type: "EXPENSE" }],
  ["income", "Receitas", { type: "INCOME" }],
  ["planned", "Previstos", { status: "PLANNED" }],
  ["settled", "Baixados", { status: "SETTLED" }],
];

function Lancamentos() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { entity } = useCurrentEntity();

  const month = search.month ?? currentMonth();
  const [q, setQ] = useState("");

  const activeFilter: FilterKind =
    search.type === "EXPENSE"
      ? "expense"
      : search.type === "INCOME"
        ? "income"
        : search.status === "PLANNED"
          ? "planned"
          : search.status === "SETTLED"
            ? "settled"
            : "all";

  // Filtros server-side; `q` é refinado no client pelo adapter.
  const txQ = useTransactions({
    entityId: entity?.id,
    month,
    type: search.type,
    status: search.status,
    q,
  });
  const reportQ = useMonthlyReport(entity?.id, month);
  const catsQ = useCategories(entity?.id);
  const accountsQ = useAccounts(entity?.id);
  const membersQ = useMembers(entity?.id);

  const deleteTx = useDeleteTransaction(entity?.id);
  const unsettleTx = useUnsettleTransaction(entity?.id);

  // Diálogos
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [settling, setSettling] = useState<Transaction | null>(null);

  const categoryMap = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of catsQ.data ?? []) m.set(c.id, c);
    return m;
  }, [catsQ.data]);
  const accountMap = useMemo(() => {
    const m = new Map<string, Account>();
    for (const a of accountsQ.data ?? []) m.set(a.id, a);
    return m;
  }, [accountsQ.data]);
  const memberMap = useMemo(() => {
    const m = new Map<string, Member>();
    for (const mem of membersQ.data ?? []) m.set(mem.id, mem);
    return m;
  }, [membersQ.data]);

  const rows = useMemo(
    () => [...(txQ.data ?? [])].sort((a, b) => b.competenceDate.localeCompare(a.competenceDate)),
    [txQ.data],
  );

  function setFilter(kind: FilterKind) {
    const found = FILTERS.find(([id]) => id === kind)!;
    void navigate({
      search: (prev) => ({ month: prev.month, ...found[2] }),
      replace: true,
    });
  }

  function setMonth(next: string) {
    void navigate({ search: (prev) => ({ ...prev, month: next }), replace: true });
  }

  async function handleUnsettle(t: Transaction) {
    try {
      await unsettleTx.mutateAsync(t.id);
      toast.success("Lançamento estornado — voltou a previsto");
    } catch (err) {
      toast.error(apiErrorMessage(err));
      throw err;
    }
  }

  async function handleDelete(t: Transaction) {
    try {
      await deleteTx.mutateAsync(t.id);
      toast.success("Lançamento excluído");
    } catch (err) {
      toast.error(apiErrorMessage(err));
      throw err; // mantém o ConfirmDialog aberto
    }
  }

  const report = reportQ.data;
  const isLoading = txQ.isLoading;

  return (
    <AppShell>
      <PageHeader
        title="Lançamentos"
        subtitle="Realizado × previsto no período"
        actions={
          <>
            <MonthPicker value={month} onChange={setMonth} className="hidden sm:inline-flex" />
            <PermissionGate permission={PERMISSIONS.TRANSACTION_CREATE}>
              <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo</span>
              </Button>
            </PermissionGate>
          </>
        }
      />

      {/* MonthPicker mobile */}
      <div className="mx-4 mb-4 sm:hidden">
        <MonthPicker value={month} onChange={setMonth} className="flex w-full justify-between" />
      </div>

      {/* Totais do período */}
      <div className="mx-4 mb-4 grid grid-cols-3 gap-3 sm:mx-6 lg:mx-0">
        <TotalCard
          label="Realizado"
          cents={report?.expense ?? "0"}
          kind="expense"
          loading={reportQ.isLoading}
        />
        <TotalCard
          label="Previsto"
          cents={report?.plannedExpense ?? "0"}
          kind="neutral"
          muted
          loading={reportQ.isLoading}
        />
        <TotalCard
          label="Líquido"
          cents={report?.net ?? "0"}
          kind={BigInt(report?.net ?? "0") >= 0n ? "income" : "expense"}
          loading={reportQ.isLoading}
        />
      </div>

      {/* Busca + chips */}
      <div className="mx-4 mb-4 flex flex-col gap-3 sm:mx-6 lg:mx-0">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar descrição…"
            className="pl-9"
          />
        </div>
        <div className="-mx-1 flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                activeFilter === id
                  ? "border-ink bg-ink text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="mx-4 rounded-2xl border border-border/60 bg-card sm:mx-6 lg:mx-0">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando lançamentos…
          </div>
        ) : txQ.error ? (
          <div className="p-6 text-center text-sm text-expense">
            Falha ao carregar lançamentos: {apiErrorMessage(txQ.error)}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Nada por aqui ainda"
              description="Registre a primeira entrada ou despesa do período."
              action={
                <PermissionGate permission={PERMISSIONS.TRANSACTION_CREATE}>
                  <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
                    <Plus className="h-4 w-4" /> Novo lançamento
                  </Button>
                </PermissionGate>
              }
              className="border-none bg-transparent"
            />
          </div>
        ) : (
          <>
            {/* Cards (mobile) */}
            <ul className="divide-y divide-border/60 md:hidden">
              {rows.map((t) => {
                const cat = categoryMap.get(t.categoryId);
                const acc = t.accountId ? accountMap.get(t.accountId) : undefined;
                const overdue = t.status === "PLANNED" && t.competenceDate < todayISO();
                return (
                  <li key={t.id} className="flex items-start gap-3 p-4">
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[10px] font-bold uppercase text-white"
                      style={{ backgroundColor: cat?.color ?? "#6B7B77" }}
                    >
                      {(cat?.name ?? "??").slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate text-sm font-medium">{t.description}</p>
                        <MoneyText
                          cents={t.amount}
                          kind={t.type === "INCOME" ? "income" : "expense"}
                          className="text-sm"
                          sign
                        />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {cat?.name ?? "sem categoria"}
                        {cat?.code && <span className="font-mono"> {cat.code}</span>} ·{" "}
                        {acc?.name ?? "sem conta"} · {formatDate(t.competenceDate)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <StatusPill status={t.status} overdue={overdue} />
                        <TxBadges t={t} memberMap={memberMap} />
                      </div>
                    </div>
                    <RowActions
                      t={t}
                      onSettle={() => setSettling(t)}
                      onUnsettle={() => handleUnsettle(t)}
                      onEdit={() => setEditing(t)}
                      onDelete={() => handleDelete(t)}
                    />
                  </li>
                );
              })}
            </ul>

            {/* Tabela (desktop) */}
            <table className="hidden w-full text-sm md:table">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="px-5 py-3 font-medium">Descrição</th>
                  <th className="px-5 py-3 font-medium">Categoria</th>
                  <th className="px-5 py-3 font-medium">Conta</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Valor</th>
                  <th className="w-12 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const cat = categoryMap.get(t.categoryId);
                  const acc = t.accountId ? accountMap.get(t.accountId) : undefined;
                  const overdue = t.status === "PLANNED" && t.competenceDate < todayISO();
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-border/50 last:border-b-0 hover:bg-secondary/40"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium">{t.description}</div>
                        <div className="mt-0.5 flex flex-wrap gap-1.5">
                          <TxBadges t={t} memberMap={memberMap} />
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {cat && (
                          <span
                            className="inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs"
                            style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                            {cat.code && <span className="font-mono opacity-70">{cat.code}</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {acc?.name ?? "sem conta definida"}
                      </td>
                      <td className="tnum px-5 py-3.5 text-muted-foreground">
                        {formatDate(t.competenceDate)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusPill status={t.status} overdue={overdue} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <MoneyText
                          cents={t.amount}
                          kind={t.type === "INCOME" ? "income" : "expense"}
                          sign
                        />
                      </td>
                      <td className="px-2 py-3.5">
                        <RowActions
                          t={t}
                          onSettle={() => setSettling(t)}
                          onUnsettle={() => handleUnsettle(t)}
                          onEdit={() => setEditing(t)}
                          onDelete={() => handleDelete(t)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Diálogos */}
      <TransactionForm entityId={entity?.id} open={creating} onOpenChange={setCreating} />
      <TransactionForm
        entityId={entity?.id}
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        transaction={editing ?? undefined}
      />
      <SettleDialog
        entityId={entity?.id}
        transaction={settling}
        onClose={() => setSettling(null)}
      />
    </AppShell>
  );
}

// ---------------------------------------------------------------------------

function TxBadges({ t, memberMap }: { t: Transaction; memberMap: Map<string, Member> }) {
  return (
    <>
      {t.installment && (
        <Badge variant="secondary" className="text-[10px]">
          {t.installment.number}/{t.installment.total}
        </Badge>
      )}
      {t.recurrence && (
        <Badge variant="outline" className="text-[10px]">
          recorrente
        </Badge>
      )}
      {t.scope === "MEMBERS" && (
        <Badge variant="outline" className="border-transfer/40 text-[10px] text-transfer">
          rateio{" "}
          {t.shares
            ?.map((s) => memberMap.get(s.memberId)?.initials)
            .filter(Boolean)
            .join(" · ")}
        </Badge>
      )}
    </>
  );
}

function RowActions({
  t,
  onSettle,
  onUnsettle,
  onEdit,
  onDelete,
}: {
  t: Transaction;
  onSettle: () => void;
  onUnsettle: () => Promise<void>;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  return (
    <PermissionGate permission={PERMISSIONS.TRANSACTION_MANAGE}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações do lançamento">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {t.status === "PLANNED" ? (
            <DropdownMenuItem onClick={onSettle}>Dar baixa</DropdownMenuItem>
          ) : (
            <ConfirmDialog
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Estornar</DropdownMenuItem>
              }
              title="Estornar lançamento?"
              description="Ele volta a previsto e o saldo da conta é revertido."
              confirmLabel="Estornar"
              onConfirm={onUnsettle}
            />
          )}
          <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
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
            title="Excluir lançamento?"
            description={
              t.status === "SETTLED"
                ? "Este lançamento está baixado — excluir também reverte o saldo da conta."
                : "Esta ação não pode ser desfeita."
            }
            confirmLabel="Excluir"
            destructive
            onConfirm={onDelete}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </PermissionGate>
  );
}

function TotalCard({
  label,
  cents,
  kind,
  muted,
  loading,
}: {
  label: string;
  cents: string;
  kind: "income" | "expense" | "neutral";
  muted?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={cn("rounded-2xl border border-border/60 bg-card p-3", muted && "bg-background/40")}
    >
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-1 h-6 w-20" />
      ) : (
        <MoneyText cents={cents} kind={kind} className="mt-1 block font-display text-lg" />
      )}
    </div>
  );
}
