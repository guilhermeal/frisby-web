import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Plus, Calendar, Filter, Loader2 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { MoneyText } from "@/components/frisby/money-text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import {
  useAccounts,
  useCategories,
  useMembers,
  useMonthlyReport,
  useTransactions,
} from "@/hooks/api";
import { formatDate, currentMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Account, Category, Member, TxStatus } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/lancamentos")({
  component: Lancamentos,
});

type FilterKind = "all" | "income" | "expense" | "planned" | "settled";

function Lancamentos() {
  const [filter, setFilter] = useState<FilterKind>("all");
  const [q, setQ] = useState("");
  const { entity } = useCurrentEntity();
  const month = currentMonth();

  const txQ = useTransactions({ entityId: entity?.id, month });
  const reportQ = useMonthlyReport(entity?.id, month);
  const catsQ = useCategories(entity?.id);
  const accountsQ = useAccounts(entity?.id);
  const membersQ = useMembers(entity?.id);

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

  const rows = useMemo(() => {
    const source = txQ.data ?? [];
    return [...source]
      .filter((t) => {
        if (filter === "income" && t.type !== "INCOME") return false;
        if (filter === "expense" && t.type !== "EXPENSE") return false;
        if (filter === "planned" && t.status !== "PLANNED") return false;
        if (filter === "settled" && t.status !== "SETTLED") return false;
        if (q && !t.description.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b.competenceDate.localeCompare(a.competenceDate));
  }, [txQ.data, filter, q]);

  const report = reportQ.data;
  const isLoading = txQ.isLoading;

  return (
    <AppShell>
      <PageHeader
        title="Lançamentos"
        subtitle={`${monthLabel(month)} · realizado × previsto`}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Calendar className="h-4 w-4" />{" "}
              <span className="hidden sm:inline">{shortMonth(month)}</span>
            </Button>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo</span>
            </Button>
          </>
        }
      />

      {/* Period totals */}
      <div className="mx-4 mb-4 grid grid-cols-3 gap-3 sm:mx-6 lg:mx-0">
        <TotalCard label="Realizado" cents={report?.expense ?? "0"} kind="expense" loading={reportQ.isLoading} />
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

      {/* Search + chips */}
      <div className="mx-4 mb-4 flex flex-col gap-3 sm:mx-6 lg:mx-0">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar descrição, categoria, membro…"
            className="pl-9"
          />
        </div>
        <div className="-mx-1 flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          {(
            [
              ["all", "Todos"],
              ["expense", "Despesas"],
              ["income", "Receitas"],
              ["planned", "Previstos"],
              ["settled", "Baixados"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === id
                  ? "border-ink bg-ink text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
          <Button variant="ghost" size="sm" className="ml-auto gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5" /> Mais filtros
          </Button>
        </div>
      </div>

      {/* Data */}
      <div className="mx-4 rounded-2xl border border-border/60 bg-card sm:mx-6 lg:mx-0">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando lançamentos…
          </div>
        ) : txQ.error ? (
          <div className="p-6 text-center text-sm text-expense">
            Falha ao carregar lançamentos: {(txQ.error as Error).message}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium">Nada por aqui ainda</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Registre a primeira entrada ou despesa do mês.
            </p>
            <Button size="sm" className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" /> Novo lançamento
            </Button>
          </div>
        ) : (
          <>
            {/* Cards (mobile) */}
            <ul className="divide-y divide-border/60 md:hidden">
              {rows.map((t) => {
                const cat = categoryMap.get(t.categoryId);
                const acc = t.accountId ? accountMap.get(t.accountId) : undefined;
                const isOverdue = t.status === "PLANNED" && isPast(t.competenceDate);
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
                        {cat?.name ?? "sem categoria"} · {acc?.name ?? "sem conta"} ·{" "}
                        {formatDate(t.competenceDate)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <StatusPill status={t.status} overdue={isOverdue} />
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
                          <Badge
                            variant="outline"
                            className="border-transfer/40 text-transfer text-[10px]"
                          >
                            rateio{" "}
                            {t.shares
                              ?.map((s) => memberMap.get(s.memberId)?.initials)
                              .filter(Boolean)
                              .join(" · ")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Table (desktop) */}
            <table className="hidden w-full text-sm md:table">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="px-5 py-3 font-medium">Descrição</th>
                  <th className="px-5 py-3 font-medium">Categoria</th>
                  <th className="px-5 py-3 font-medium">Conta</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const cat = categoryMap.get(t.categoryId);
                  const acc = t.accountId ? accountMap.get(t.accountId) : undefined;
                  const isOverdue = t.status === "PLANNED" && isPast(t.competenceDate);
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-border/50 last:border-b-0 hover:bg-secondary/40"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium">{t.description}</div>
                        <div className="mt-0.5 flex flex-wrap gap-1.5">
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
                            <Badge
                              variant="outline"
                              className="border-transfer/40 text-transfer text-[10px]"
                            >
                              rateio
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {cat && (
                          <span
                            className="inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs"
                            style={{
                              backgroundColor: `${cat.color}22`,
                              color: cat.color,
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {acc?.name ?? "sem conta definida"}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground tnum">
                        {formatDate(t.competenceDate)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusPill status={t.status} overdue={isOverdue} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <MoneyText
                          cents={t.amount}
                          kind={t.type === "INCOME" ? "income" : "expense"}
                          sign
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
    </AppShell>
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
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-3",
        muted && "bg-background/40",
      )}
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

function StatusPill({ status, overdue }: { status: TxStatus; overdue: boolean }) {
  const label = overdue ? "Atrasado" : status === "SETTLED" ? "Baixado" : "Previsto";
  const cls = overdue
    ? "bg-expense/10 text-expense"
    : status === "SETTLED"
      ? "bg-income/10 text-income"
      : "bg-secondary text-muted-foreground";
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", cls)}>{label}</span>
  );
}

function isPast(iso: string) {
  const today = new Date();
  const todayUtc = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
  return iso < todayUtc;
}

function monthLabel(ym: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${ym}-01`));
}
function shortMonth(ym: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${ym}-01`));
}
