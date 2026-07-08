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
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { MoneyText } from "@/components/frisby/money-text";
import { categories, transactions } from "@/lib/mock-data";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: Relatorios,
});

const cashflow = [
  { month: "Mai", realizado: 780000, previsto: 810000 },
  { month: "Jun", realizado: 820000, previsto: 850000 },
  { month: "Jul", realizado: 910000, previsto: 900000 },
  { month: "Ago", realizado: 870000, previsto: 900000 },
  { month: "Set", realizado: 663690, previsto: 740000 },
];

function Relatorios() {
  const byCat = categories
    .filter((c) => c.type === "EXPENSE")
    .map((c) => {
      const total = transactions
        .filter((t) => t.categoryId === c.id && t.status === "SETTLED")
        .reduce((acc, t) => acc + Number(t.amount), 0);
      return { name: c.name, value: total, fill: c.color };
    })
    .filter((c) => c.value > 0);

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
          <div className="h-[280px] w-full">
            <ResponsiveContainer>
              <AreaChart data={cashflow}>
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
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
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
        </div>

        {/* By category */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold">Por categoria</h3>
            <p className="text-xs text-muted-foreground">Distribuição das despesas em setembro</p>
          </div>
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
        </div>
      </div>

      <div className="mx-4 mt-6 rounded-2xl border border-dashed border-border/80 bg-background/40 p-8 text-center sm:mx-6 lg:mx-0">
        <p className="text-sm font-medium">
          Por membro · Recorrente vs avulso · Previsto vs realizado · Patrimônio · Forecast
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Painéis adicionais chegam nesta mesma tela, com o mesmo seletor de período.
        </p>
      </div>
    </AppShell>
  );
}
