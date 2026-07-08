import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
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
import { useCashflow, useMonthlyReport } from "@/hooks/api";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { formatMoney } from "@/lib/money";
import { currentMonth } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: Relatorios,
});

function Relatorios() {
  const { entity } = useCurrentEntity();
  const month = currentMonth();
  const cashflowQ = useCashflow(entity?.id, 5);
  const monthlyQ = useMonthlyReport(entity?.id, month);

  const cashflow = (cashflowQ.data ?? []).map((c) => ({
    month: shortMonth(c.month),
    realizado: Number(c.realizado),
    previsto: Number(c.previsto),
  }));

  const byCat = (monthlyQ.data?.byCategory ?? [])
    .filter((c) => BigInt(c.value) > 0n)
    .map((c) => ({ name: c.name, value: Number(c.value), fill: c.color }));

  return (
    <AppShell>
      <PageHeader
        title="Relatórios"
        subtitle="Fluxo de caixa e distribuição por categoria"
      />

      <div className="mx-4 grid gap-6 sm:mx-6 lg:mx-0 xl:grid-cols-2">
        {/* Cashflow */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold">Fluxo de caixa</h3>
            <p className="text-xs text-muted-foreground">
              Realizado vs previsto — últimos 5 meses
            </p>
          </div>
          {cashflowQ.isLoading ? (
            <ChartLoading />
          ) : cashflow.length === 0 ? (
            <ChartEmpty message="Sem dados suficientes para o gráfico." />
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer>
                <AreaChart data={cashflow}>
                  <defs>
                    <linearGradient id="areaR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="areaP" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-muted-foreground)"
                        stopOpacity={0.15}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-muted-foreground)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="4 4"
                    vertical={false}
                  />
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
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
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
        </div>

        {/* By category */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold">Por categoria</h3>
            <p className="text-xs text-muted-foreground">Distribuição das despesas do mês</p>
          </div>
          {monthlyQ.isLoading ? (
            <ChartLoading />
          ) : byCat.length === 0 ? (
            <ChartEmpty message="Sem despesas registradas no mês." />
          ) : (
            <div className="grid gap-6 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
              <div className="h-[220px]">
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
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatMoney(String(v))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {byCat.map((c) => (
                  <li key={c.name} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: c.fill }}
                    />
                    <span className="flex-1 truncate">{c.name}</span>
                    <MoneyText cents={String(c.value)} kind="expense" className="text-xs" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mx-4 mt-6 rounded-2xl border border-dashed border-border/80 bg-background/40 p-8 text-center sm:mx-6 lg:mx-0">
        <p className="text-sm font-medium">
          Por membro · Recorrente vs avulso · Previsto vs realizado · Patrimônio · Forecast
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Painéis adicionais chegam nesta mesma tela conforme os endpoints ficarem prontos.
        </p>
      </div>
    </AppShell>
  );
}

function ChartLoading() {
  return (
    <div className="flex h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
    </div>
  );
}
function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-background/40 px-6 text-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}
function shortMonth(ym: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${ym}-01`));
}
