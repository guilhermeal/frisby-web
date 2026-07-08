import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ArrowDownRight, AlertCircle, ChevronRight, CircleDot } from "lucide-react";
import { AppShell, PageHeader, Section } from "@/components/frisby/app-shell";
import { ReturnArc } from "@/components/frisby/return-arc";
import { MoneyText } from "@/components/frisby/money-text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/context";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { useAccounts, useCategories, useMonthlyReport, useTransactions } from "@/hooks/api";
import { pct, formatMoney, subCents, addCents } from "@/lib/money";
import { formatDate, currentMonth } from "@/lib/format";
import type { Category, Account } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

// Orçamento mensal ainda não vem da API; mantemos um placeholder até o
// endpoint /budgets estar disponível (documentado em API-CONTRACT.md).
const MONTHLY_BUDGET_CENTS = "0";

function Dashboard() {
  const { user } = useAuth();
  const { entity } = useCurrentEntity();
  const month = currentMonth();

  const accountsQ = useAccounts(entity?.id);
  const categoriesQ = useCategories(entity?.id);
  const reportQ = useMonthlyReport(entity?.id, month);
  const txQ = useTransactions({ entityId: entity?.id, month });

  const categoryMap = new Map<string, Category>();
  for (const c of categoriesQ.data ?? []) categoryMap.set(c.id, c);
  const accountMap = new Map<string, Account>();
  for (const a of accountsQ.data ?? []) accountMap.set(a.id, a);

  const nw = (accountsQ.data ?? [])
    .filter((a) => a.type !== "CREDIT_CARD")
    .reduce((acc, a) => addCents(acc, a.balance), "0");

  const report = reportQ.data;
  const budgetUsed = report?.expense ?? "0";
  const budgetPct = MONTHLY_BUDGET_CENTS === "0" ? 0 : pct(budgetUsed, MONTHLY_BUDGET_CENTS);
  const remaining =
    MONTHLY_BUDGET_CENTS === "0" ? "0" : subCents(MONTHLY_BUDGET_CENTS, budgetUsed);

  const transactions = txQ.data ?? [];
  const upcoming = transactions.filter((t) => t.status === "PLANNED").slice(0, 4);
  const recent = [...transactions]
    .filter((t) => t.status === "SETTLED")
    .sort((a, b) => b.competenceDate.localeCompare(a.competenceDate))
    .slice(0, 5);

  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <AppShell>
      <PageHeader
        title={firstName ? `Bom dia, ${firstName}` : "Bom dia"}
        subtitle={entity ? `${monthLabel(month)} · ${entity.name}` : monthLabel(month)}
      />

      {/* Hero + return arc */}
      <Section>
        <div className="mx-4 rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-soft)] sm:mx-6 sm:p-8 lg:mx-0 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
            {reportQ.isLoading || accountsQ.isLoading ? (
              <Skeleton className="h-48 w-48 rounded-full justify-self-center" />
            ) : (
              <ReturnArc
                netWorthCents={nw}
                arcPct={budgetPct}
                label="Patrimônio líquido"
                sublabel={
                  MONTHLY_BUDGET_CENTS === "0"
                    ? "Defina um orçamento em Configurações"
                    : `${formatMoney(budgetUsed)} de ${formatMoney(MONTHLY_BUDGET_CENTS)} usados no mês`
                }
              />
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                label="Entradas"
                loading={reportQ.isLoading}
                value={<MoneyText cents={report?.income ?? "0"} kind="income" />}
                icon={<ArrowUpRight className="h-4 w-4 text-income" />}
                hint={report ? `Previsto ${formatMoney(report.plannedIncome)}` : undefined}
              />
              <MetricCard
                label="Saídas"
                loading={reportQ.isLoading}
                value={<MoneyText cents={report?.expense ?? "0"} kind="expense" />}
                icon={<ArrowDownRight className="h-4 w-4 text-expense" />}
                hint={report ? `Previsto ${formatMoney(report.plannedExpense)}` : undefined}
              />
              <MetricCard
                label="Líquido do mês"
                loading={reportQ.isLoading}
                value={
                  <MoneyText
                    cents={report?.net ?? "0"}
                    kind={BigInt(report?.net ?? "0") >= 0n ? "income" : "expense"}
                  />
                }
                icon={<CircleDot className="h-4 w-4 text-brand" />}
                hint={
                  MONTHLY_BUDGET_CENTS === "0"
                    ? "Sem orçamento definido"
                    : `Restam ${formatMoney(remaining)} do orçamento`
                }
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
              <p className="text-xs text-muted-foreground">Este mês, em aberto</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/lancamentos">
                Ver todas <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <ul className="divide-y divide-border/60">
            {txQ.isLoading ? (
              <SkeletonRows count={3} />
            ) : upcoming.length === 0 ? (
              <li className="py-6 text-center text-sm text-muted-foreground">
                Nada previsto — respirar fundo.
              </li>
            ) : (
              upcoming.map((t) => {
                const cat = categoryMap.get(t.categoryId);
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
                        {cat?.name ?? "sem categoria"} · vence {formatDate(t.competenceDate)}
                      </p>
                    </div>
                    <MoneyText
                      cents={t.amount}
                      kind={t.type === "INCOME" ? "income" : "expense"}
                      className="text-sm"
                    />
                  </li>
                );
              })
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
          {accountsQ.isLoading ? (
            <SkeletonRows count={3} />
          ) : (accountsQ.data ?? []).length === 0 ? (
            <EmptyState
              title="Nenhuma conta ainda"
              hint="Cadastre carteiras, contas bancárias e cartões."
              cta={
                <Button size="sm" asChild>
                  <Link to="/contas">Adicionar conta</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2.5">
              {(accountsQ.data ?? []).map((a) => (
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
          )}
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
          {txQ.isLoading ? (
            <SkeletonRows count={4} />
          ) : recent.length === 0 ? (
            <EmptyState
              title="Sem lançamentos ainda"
              hint="Comece registrando entradas e saídas."
              cta={
                <Button size="sm" asChild>
                  <Link to="/lancamentos">Novo lançamento</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {recent.map((t) => {
                const cat = categoryMap.get(t.categoryId);
                const acc = t.accountId ? accountMap.get(t.accountId) : undefined;
                return (
                  <li key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[10px] font-bold uppercase text-white"
                      style={{ backgroundColor: cat?.color ?? "#6B7B77" }}
                    >
                      {(cat?.name ?? "??").slice(0, 2)}
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
          )}
        </div>
      </div>

      {(accountsQ.error || reportQ.error || txQ.error) && (
        <div className="mx-4 mt-6 rounded-2xl border border-expense/30 bg-expense/5 p-4 text-sm text-expense sm:mx-6 lg:mx-0">
          Não foi possível carregar todos os dados. Verifique se a API está acessível.
        </div>
      )}
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  icon,
  hint,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <div className="font-display text-lg font-semibold">{value}</div>
      )}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-16" />
        </li>
      ))}
    </>
  );
}

function EmptyState({
  title,
  hint,
  cta,
}: {
  title: string;
  hint: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      {cta && <div className="mt-3">{cta}</div>}
    </div>
  );
}

function accountTypeLabel(t: Account["type"]) {
  switch (t) {
    case "WALLET":
      return "Carteira";
    case "BANK":
      return "Conta bancária";
    case "INVESTMENT":
      return "Investimento";
    case "CREDIT_CARD":
      return "Cartão de crédito";
  }
}

function monthLabel(ym: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${ym}-01`));
}
