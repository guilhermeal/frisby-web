import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ArrowDownRight, AlertCircle, ChevronRight, CircleDot } from "lucide-react";
import { AppShell, PageHeader, Section } from "@/components/frisby/app-shell";
import { ReturnArc } from "@/components/frisby/return-arc";
import { MoneyText } from "@/components/frisby/money-text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  totalNetWorth,
  monthTotals,
  monthlyBudget,
  transactions,
  accounts,
  categoryById,
  accountById,
  CURRENT_MONTH,
} from "@/lib/mock-data";
import { pct, formatMoney, subCents } from "@/lib/money";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const nw = totalNetWorth();
  const totals = monthTotals(CURRENT_MONTH);
  const budgetPct = pct(monthlyBudget.used, monthlyBudget.amount);
  const remaining = subCents(monthlyBudget.amount, monthlyBudget.used);

  const upcoming = transactions
    .filter((t) => t.status === "PLANNED" && t.competenceDate.startsWith(CURRENT_MONTH))
    .slice(0, 4);

  const recent = [...transactions]
    .filter((t) => t.status === "SETTLED")
    .sort((a, b) => b.competenceDate.localeCompare(a.competenceDate))
    .slice(0, 5);

  return (
    <AppShell>
      <PageHeader
        title="Bom dia, Marina"
        subtitle="Setembro 2026 · Villa Bella 606"
      />

      {/* Hero + return arc */}
      <Section>
        <div className="mx-4 rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-soft)] sm:mx-6 sm:p-8 lg:mx-0 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
            <ReturnArc
              netWorthCents={nw}
              arcPct={budgetPct}
              label="Patrimônio líquido"
              sublabel={`${formatMoney(monthlyBudget.used)} de ${formatMoney(
                monthlyBudget.amount,
              )} usados no mês`}
            />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                label="Entradas"
                value={<MoneyText cents={totals.income} kind="income" />}
                icon={<ArrowUpRight className="h-4 w-4 text-income" />}
                hint={`Previsto ${formatMoney(totals.plannedIncome)}`}
              />
              <MetricCard
                label="Saídas"
                value={<MoneyText cents={totals.expense} kind="expense" />}
                icon={<ArrowDownRight className="h-4 w-4 text-expense" />}
                hint={`Previsto ${formatMoney(totals.plannedExpense)}`}
              />
              <MetricCard
                label="Líquido do mês"
                value={
                  <MoneyText
                    cents={totals.net}
                    kind={BigInt(totals.net) >= 0n ? "income" : "expense"}
                  />
                }
                icon={<CircleDot className="h-4 w-4 text-brand" />}
                hint={`Restam ${formatMoney(remaining)} do orçamento`}
              />
            </div>
          </div>
        </div>
      </Section>

      <div className="grid gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-0 2xl:grid-cols-3">
        {/* Upcoming */}
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">Contas a vencer</h3>
              <p className="text-xs text-muted-foreground">Próximos 30 dias</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/lancamentos">
                Ver todas <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <ul className="divide-y divide-border/60">
            {upcoming.map((t) => {
              const cat = categoryById(t.categoryId);
              return (
                <li key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: cat?.color ?? "#6B7B77" }}
                  >
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {cat?.name} · vence {formatDate(t.competenceDate)}
                    </p>
                  </div>
                  <MoneyText
                    cents={t.amount}
                    kind={t.type === "INCOME" ? "income" : "expense"}
                    className="text-sm"
                  />
                </li>
              );
            })}
            {upcoming.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                Nada previsto — respirar fundo.
              </li>
            )}
          </ul>
        </div>

        {/* Accounts glance */}
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">Suas contas</h3>
              <p className="text-xs text-muted-foreground">Saldos ao vivo</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/contas">
                Gerenciar <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <ul className="space-y-2.5">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-xl bg-secondary/60 px-3 py-2.5"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-background text-[10px] font-bold uppercase text-muted-foreground">
                  {a.type === "CREDIT_CARD" ? "CC" : a.type[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {accountTypeLabel(a.type)}
                    {a.type === "CREDIT_CARD" && a.creditLimit && (
                      <>
                        {" · limite "}
                        {formatMoney(a.creditLimit)}
                      </>
                    )}
                  </p>
                </div>
                {a.type === "CREDIT_CARD" ? (
                  <MoneyText cents={a.usedAmount ?? "0"} kind="expense" className="text-sm" />
                ) : (
                  <MoneyText cents={a.balance} className="text-sm" />
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Recent */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 lg:col-span-2 2xl:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">Últimos lançamentos</h3>
              <p className="text-xs text-muted-foreground">Baixados recentemente</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/lancamentos">
                Ver tudo <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <ul className="divide-y divide-border/60">
            {recent.map((t) => {
              const cat = categoryById(t.categoryId);
              const acc = accountById(t.accountId);
              return (
                <li key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[10px] font-bold uppercase text-white"
                    style={{ backgroundColor: cat?.color ?? "#6B7B77" }}
                  >
                    {cat?.name.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.description}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {acc?.name ?? "sem conta definida"} · {formatDate(t.competenceDate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <MoneyText
                      cents={t.amount}
                      kind={t.type === "INCOME" ? "income" : "expense"}
                      className="text-sm"
                      sign
                    />
                    {t.installment && (
                      <Badge variant="secondary" className="text-[10px]">
                        {t.installment.number}/{t.installment.total}
                      </Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="font-display text-xl font-semibold tnum sm:text-2xl">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function accountTypeLabel(t: string) {
  return (
    {
      WALLET: "Carteira",
      BANK: "Banco",
      INVESTMENT: "Investimento",
      CREDIT_CARD: "Cartão de crédito",
    } as Record<string, string>
  )[t] ?? t;
}
