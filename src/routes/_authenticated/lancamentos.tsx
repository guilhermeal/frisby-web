import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Plus, Calendar, Filter } from "lucide-react";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { MoneyText } from "@/components/frisby/money-text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  transactions,
  categoryById,
  accountById,
  memberById,
  monthTotals,
  CURRENT_MONTH,
} from "@/lib/mock-data";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lancamentos")({
  component: Lancamentos,
});

type Filter = "all" | "income" | "expense" | "planned" | "settled";

function Lancamentos() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const totals = monthTotals(CURRENT_MONTH);

  const rows = useMemo(() => {
    return [...transactions]
      .filter((t) => {
        if (filter === "income" && t.type !== "INCOME") return false;
        if (filter === "expense" && t.type !== "EXPENSE") return false;
        if (filter === "planned" && t.status !== "PLANNED") return false;
        if (filter === "settled" && t.status !== "SETTLED") return false;
        if (q && !t.description.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b.competenceDate.localeCompare(a.competenceDate));
  }, [filter, q]);

  return (
    <AppShell>
      <PageHeader
        title="Lançamentos"
        subtitle="Setembro 2026 · realizado × previsto"
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Calendar className="h-4 w-4" /> <span className="hidden sm:inline">Setembro</span>
            </Button>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo</span>
            </Button>
          </>
        }
      />

      {/* Period totals */}
      <div className="mx-4 mb-4 grid grid-cols-3 gap-3 sm:mx-6 lg:mx-0">
        <TotalCard label="Realizado" cents={totals.expense} kind="expense" />
        <TotalCard label="Previsto" cents={totals.plannedExpense} kind="neutral" muted />
        <TotalCard
          label="Líquido"
          cents={totals.net}
          kind={BigInt(totals.net) >= 0n ? "income" : "expense"}
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

      {/* Mobile: cards. Desktop (md+): table via same data source. */}
      <div className="mx-4 rounded-2xl border border-border/60 bg-card sm:mx-6 lg:mx-0">
        {/* Cards (mobile) */}
        <ul className="divide-y divide-border/60 md:hidden">
          {rows.map((t) => {
            const cat = categoryById(t.categoryId);
            const acc = accountById(t.accountId);
            const isOverdue =
              t.status === "PLANNED" && new Date(t.competenceDate) < new Date("2026-09-15");
            return (
              <li key={t.id} className="flex items-start gap-3 p-4">
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[10px] font-bold uppercase text-white"
                  style={{ backgroundColor: cat?.color ?? "#6B7B77" }}
                >
                  {cat?.name.slice(0, 2)}
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
                    {cat?.name} · {acc?.name ?? "sem conta definida"} · {formatDate(t.competenceDate)}
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
                      <Badge variant="outline" className="border-transfer/40 text-transfer text-[10px]">
                        rateio {t.shares?.map((s) => memberById(s.memberId)?.initials).join(" · ")}
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
              const cat = categoryById(t.categoryId);
              const acc = accountById(t.accountId);
              const isOverdue =
                t.status === "PLANNED" && new Date(t.competenceDate) < new Date("2026-09-15");
              return (
                <tr key={t.id} className="border-b border-border/50 last:border-b-0 hover:bg-secondary/40">
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
                        <Badge variant="outline" className="border-transfer/40 text-transfer text-[10px]">
                          rateio
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs"
                      style={{
                        backgroundColor: `${cat?.color}22`,
                        color: cat?.color,
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat?.color }} />
                      {cat?.name}
                    </span>
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

        {rows.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-sm font-medium">Nenhum lançamento encontrado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajuste os filtros ou crie um novo lançamento.
            </p>
          </div>
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
}: {
  label: string;
  cents: string;
  kind: "income" | "expense" | "neutral";
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-3 sm:p-4",
        muted && "bg-secondary/40",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">
        {label}
      </p>
      <p className="mt-1 font-display text-base font-semibold tnum sm:text-xl">
        <MoneyText cents={cents} kind={kind} />
      </p>
    </div>
  );
}

function StatusPill({ status, overdue }: { status: string; overdue?: boolean }) {
  if (overdue) {
    return (
      <Badge className="bg-expense/12 text-expense border-transparent hover:bg-expense/12">
        vencido
      </Badge>
    );
  }
  if (status === "SETTLED") {
    return (
      <Badge className="bg-income/12 text-income border-transparent hover:bg-income/12">
        baixado
      </Badge>
    );
  }
  return (
    <Badge className="bg-warning/15 text-warning border-transparent hover:bg-warning/15">
      previsto
    </Badge>
  );
}

