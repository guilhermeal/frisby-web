// Relatórios: 8 painéis independentes (cada um com loading/empty/error
// isolados — um painel quebrado não derruba a página) + Forecast.
// Transferências ficam FORA (não são despesa/receita); rendimentos DENTRO.

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { MoneyText } from "@/components/frisby/money-text";
import { PermissionGate } from "@/components/frisby/permission-gate";
import {
  useBalancesReport,
  useByMemberReport,
  useCashflow,
  useForecast,
  useMonthlyReport,
  useNetWorthReport,
  usePlannedVsActualReport,
  useRecurringVsOneoffReport,
} from "@/hooks/api";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { PERMISSIONS } from "@/lib/auth/use-permissions";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { formatMoney } from "@/lib/money";
import { currentMonth } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: Relatorios,
});

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  WALLET: "Carteiras",
  BANK: "Contas bancárias",
  INVESTMENT: "Investimentos",
  CREDIT_CARD: "Cartões de crédito",
};

function Relatorios() {
  const { entity } = useCurrentEntity();

  return (
    <AppShell>
      <PageHeader title="Relatórios" subtitle="Visão completa das finanças da entidade" />

      <PermissionGate permission={PERMISSIONS.REPORT_VIEW}>
        <div className="mx-4 grid gap-6 sm:mx-6 lg:mx-0 xl:grid-cols-2">
          <CashflowPanel entityId={entity?.id} />
          <ByCategoryPanel entityId={entity?.id} />
          <ByMemberPanel entityId={entity?.id} />
          <RecurringVsOneoffPanel entityId={entity?.id} />
          <PlannedVsActualPanel entityId={entity?.id} />
          <BalancesPanel entityId={entity?.id} />
          <NetWorthPanel entityId={entity?.id} />
          <ForecastPanel entityId={entity?.id} />
        </div>
      </PermissionGate>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Painel wrapper — título + subtítulo + estados isolados
// ---------------------------------------------------------------------------

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <div className="mb-4">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function ChartLoading() {
  return (
    <div className="flex h-60 items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
    </div>
  );
}
function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-60 items-center justify-center rounded-xl border border-dashed border-border/70 bg-background/40 px-6 text-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}
function ChartError({ error }: { error: unknown }) {
  return (
    <div className="flex h-60 items-center justify-center rounded-xl border border-expense/30 bg-expense/5 px-6 text-center text-xs text-expense">
      {apiErrorMessage(error)}
    </div>
  );
}

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
};

function shortMonth(ym: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(
    new Date(`${ym}-01`),
  );
}

// ---------------------------------------------------------------------------
// 1. Fluxo de caixa
// ---------------------------------------------------------------------------

function CashflowPanel({ entityId }: { entityId: string | undefined }) {
  const q = useCashflow(entityId, 5);
  const data = (q.data ?? []).map((c) => ({
    month: shortMonth(c.month),
    realizado: Number(c.realizado),
    previsto: Number(c.previsto),
  }));

  return (
    <Panel title="Fluxo de caixa" subtitle="Realizado vs previsto — últimos 5 meses">
      {q.isLoading ? (
        <ChartLoading />
      ) : q.error ? (
        <ChartError error={q.error} />
      ) : data.length === 0 ? (
        <ChartEmpty message="Sem dados suficientes para o gráfico." />
      ) : (
        <div className="h-70 w-full">
          <ResponsiveContainer>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="areaR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-muted-foreground)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--color-muted-foreground)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="var(--color-muted-foreground)"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="var(--color-muted-foreground)"
                tickFormatter={(v) => `${(v / 100000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => formatMoney(String(v))}
              />
              <Area
                dataKey="previsto"
                stroke="var(--color-muted-foreground)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                fill="url(#areaP)"
              />
              <Area
                dataKey="realizado"
                stroke="var(--color-brand)"
                strokeWidth={2}
                fill="url(#areaR)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 2. Por categoria
// ---------------------------------------------------------------------------

function ByCategoryPanel({ entityId }: { entityId: string | undefined }) {
  const month = currentMonth();
  const q = useMonthlyReport(entityId, month);
  const byCat = (q.data?.byCategory ?? [])
    .filter((c) => BigInt(c.value) > 0n)
    .map((c) => ({ name: c.name, value: Number(c.value), fill: c.color }));

  return (
    <Panel title="Por categoria" subtitle="Distribuição das despesas do mês">
      {q.isLoading ? (
        <ChartLoading />
      ) : q.error ? (
        <ChartError error={q.error} />
      ) : byCat.length === 0 ? (
        <ChartEmpty message="Sem despesas registradas no mês." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
          <div className="h-55">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={byCat}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="none"
                >
                  {byCat.map((c) => (
                    <Cell key={c.name} fill={c.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => formatMoney(String(v))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-2">
            {byCat.map((c) => (
              <li key={c.name} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.fill }} />
                <span className="flex-1 truncate" title={c.name}>
                  {c.name}
                </span>
                <MoneyText cents={String(c.value)} kind="expense" className="text-xs" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 3. Por membro
// ---------------------------------------------------------------------------

function ByMemberPanel({ entityId }: { entityId: string | undefined }) {
  const q = useByMemberReport(entityId);
  const members = q.data?.members ?? [];
  const entityTotals = q.data?.entity;

  const rows = [
    ...(entityTotals && (BigInt(entityTotals.income) > 0n || BigInt(entityTotals.expense) > 0n)
      ? [{ membershipId: "_entity", name: "Casa (comum)", ...entityTotals }]
      : []),
    ...members,
  ];

  return (
    <Panel title="Por membro" subtitle="Quanto cada pessoa gastou vs. a casa">
      {q.isLoading ? (
        <ChartLoading />
      ) : q.error ? (
        <ChartError error={q.error} />
      ) : rows.length === 0 ? (
        <ChartEmpty message="Sem lançamentos rateados neste período." />
      ) : (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li key={m.membershipId} className="flex items-center justify-between text-sm">
              <span className="truncate" title={m.name}>
                {m.name}
              </span>
              <div className="flex items-center gap-3 text-xs">
                <MoneyText cents={m.income} kind="income" />
                <MoneyText cents={m.expense} kind="expense" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 4. Recorrente vs avulso
// ---------------------------------------------------------------------------

function RecurringVsOneoffPanel({ entityId }: { entityId: string | undefined }) {
  const q = useRecurringVsOneoffReport(entityId);
  const recurring = q.data?.recurring.total ?? "0";
  const oneoff = q.data?.oneoff.total ?? "0";
  const hasData = BigInt(recurring) > 0n || BigInt(oneoff) > 0n;

  const data = [
    { name: "Recorrente/parcelado", value: Number(recurring), fill: "var(--color-brand)" },
    { name: "Avulso", value: Number(oneoff), fill: "var(--color-muted-foreground)" },
  ];

  return (
    <Panel title="Recorrente vs avulso" subtitle="Compromissos fixos vs. gastos pontuais">
      {q.isLoading ? (
        <ChartLoading />
      ) : q.error ? (
        <ChartError error={q.error} />
      ) : !hasData ? (
        <ChartEmpty message="Sem lançamentos no período." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
          <div className="h-55">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => formatMoney(String(v))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-2">
            {data.map((d) => (
              <li key={d.name} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                <span className="flex-1 truncate" title={d.name}>
                  {d.name}
                </span>
                <MoneyText cents={String(d.value)} className="text-xs" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 5. Previsto vs realizado
// ---------------------------------------------------------------------------

function PlannedVsActualPanel({ entityId }: { entityId: string | undefined }) {
  const q = usePlannedVsActualReport(entityId);
  const data = (q.data ?? []).map((p) => ({
    period: shortMonth(p.period),
    planejado: Number(p.planned),
    realizado: Number(p.actual),
  }));

  return (
    <Panel title="Previsto vs realizado" subtitle="Comparativo mensal">
      {q.isLoading ? (
        <ChartLoading />
      ) : q.error ? (
        <ChartError error={q.error} />
      ) : data.length === 0 ? (
        <ChartEmpty message="Sem dados suficientes." />
      ) : (
        <div className="h-65 w-full">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12 }}
                stroke="var(--color-muted-foreground)"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="var(--color-muted-foreground)"
                tickFormatter={(v) => `${(v / 100000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => formatMoney(String(v))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="planejado" fill="var(--color-muted-foreground)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="realizado" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 6. Saldos
// ---------------------------------------------------------------------------

function BalancesPanel({ entityId }: { entityId: string | undefined }) {
  const q = useBalancesReport(entityId);
  const groups = q.data?.byType ?? [];

  return (
    <Panel title="Saldos" subtitle="Por tipo de conta — cartão aparece como devedor">
      {q.isLoading ? (
        <ChartLoading />
      ) : q.error ? (
        <ChartError error={q.error} />
      ) : groups.length === 0 ? (
        <ChartEmpty message="Nenhuma conta cadastrada." />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.type}>
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span>{ACCOUNT_TYPE_LABEL[g.type] ?? g.type}</span>
                <MoneyText
                  cents={g.subtotal}
                  className="text-sm normal-case tracking-normal text-foreground"
                />
              </div>
              <ul className="space-y-1">
                {g.accounts.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className="truncate" title={a.name}>
                      {a.name}
                    </span>
                    <MoneyText
                      cents={a.balanceBase}
                      kind={g.type === "CREDIT_CARD" ? "expense" : "neutral"}
                      className="text-xs"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border/60 pt-3 text-sm font-semibold">
            <span>Total</span>
            <MoneyText cents={q.data?.total ?? "0"} />
          </div>
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 7. Patrimônio
// ---------------------------------------------------------------------------

function NetWorthPanel({ entityId }: { entityId: string | undefined }) {
  const q = useNetWorthReport(entityId);

  return (
    <Panel title="Patrimônio" subtitle="Ativos menos dívida de cartão">
      {q.isLoading ? (
        <ChartLoading />
      ) : q.error ? (
        <ChartError error={q.error} />
      ) : !q.data ? (
        <ChartEmpty message="Sem dados." />
      ) : (
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Ativos</p>
            <MoneyText cents={q.data.assets} kind="income" className="text-lg font-semibold" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dívidas</p>
            <MoneyText
              cents={q.data.liabilities}
              kind="expense"
              className="text-lg font-semibold"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Patrimônio líquido</p>
            <MoneyText cents={q.data.netWorth} className="text-lg font-semibold" />
          </div>
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 8. Forecast — barra empilhada sólido(committed)+hachurado(estimated)
// ---------------------------------------------------------------------------

function ForecastPanel({ entityId }: { entityId: string | undefined }) {
  const [horizon] = useState(6);
  const [lookback] = useState(3);
  const q = useForecast(entityId, { horizon, lookback, type: "EXPENSE" });

  const data = (q.data?.months ?? []).map((m) => ({
    month: shortMonth(m.month),
    comprometido: Number(m.categories.reduce((s, c) => s + BigInt(c.committed), 0n)),
    estimado: Number(m.categories.reduce((s, c) => s + BigInt(c.estimated), 0n)),
  }));

  return (
    <Panel
      title="Previsão de gastos"
      subtitle={`Próximos ${horizon} meses — sólido = compromissos certos, hachurado = estimativa`}
    >
      {q.isLoading ? (
        <ChartLoading />
      ) : q.error ? (
        <ChartError error={q.error} />
      ) : data.length === 0 ? (
        <ChartEmpty message="Sem histórico suficiente para estimar." />
      ) : (
        <div className="h-65 w-full">
          <ResponsiveContainer>
            <BarChart data={data}>
              <defs>
                <pattern
                  id="hatchEstimated"
                  patternUnits="userSpaceOnUse"
                  width={6}
                  height={6}
                  patternTransform="rotate(45)"
                >
                  <rect width={6} height={6} fill="var(--color-warning)" fillOpacity={0.25} />
                  <line x1={0} y1={0} x2={0} y2={6} stroke="var(--color-warning)" strokeWidth={2} />
                </pattern>
              </defs>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="var(--color-muted-foreground)"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="var(--color-muted-foreground)"
                tickFormatter={(v) => `${(v / 100000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => formatMoney(String(v))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="comprometido"
                stackId="a"
                fill="var(--color-brand)"
                name="Comprometido"
              />
              <Bar
                dataKey="estimado"
                stackId="a"
                fill="url(#hatchEstimated)"
                name="Estimado"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
