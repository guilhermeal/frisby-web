// Gráfico de evolução da jornada: série mensal de % por grupo master (área
// empilhada) + marcadores de fase por mês. Mesmo padrão visual de
// relatorios.tsx (Panel/ChartLoading/ChartEmpty/ChartError, tooltip com CSS
// vars do tema, legenda customizada em vez do Legend do recharts).

import { Loader2, CheckCircle2 } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useJourneyHistory } from "@/hooks/api/journey";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { shortMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

const PIE_COLORS = [
  "var(--color-brand)",
  "var(--color-transfer)",
  "var(--color-warning)",
  "var(--color-expense)",
  "var(--color-income)",
];

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--color-foreground)",
};

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
    <div className="flex h-70 items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
    </div>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-70 items-center justify-center rounded-xl border border-dashed border-border/70 bg-background/40 px-6 text-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}

function ChartError({ error }: { error: unknown }) {
  return (
    <div className="flex h-70 items-center justify-center rounded-xl border border-expense/30 bg-expense/5 px-6 text-center text-xs text-expense">
      {apiErrorMessage(error)}
    </div>
  );
}

export function JourneyEvolutionChart({ entityId }: { entityId: string | undefined }) {
  const q = useJourneyHistory(entityId, 12);
  const snapshots = q.data?.snapshots ?? [];

  const groupNames = [
    ...new Set(snapshots.flatMap((s) => s.groups.filter((g) => !g.isOthers).map((g) => g.name))),
  ];
  const colorByName = new Map<string, string>();
  snapshots.forEach((s) =>
    s.groups.forEach((g) => {
      if (!g.isOthers && g.color) colorByName.set(g.name, g.color);
    }),
  );

  const chartData = snapshots.map((s) => {
    const row: Record<string, string | number | boolean> = {
      month: s.month,
      onTarget: s.onTarget,
      stageName: s.appliedStage?.name ?? "",
      stageColor: s.appliedStage?.color ?? "var(--color-muted-foreground)",
    };
    for (const g of s.groups) {
      if (!g.isOthers) row[g.name] = Math.round(g.pct * 100);
    }
    return row;
  });

  return (
    <Panel title="Evolução" subtitle="% da renda por grupo master, mês a mês">
      {q.isLoading ? (
        <ChartLoading />
      ) : q.error ? (
        <ChartError error={q.error} />
      ) : snapshots.length < 2 ? (
        <ChartEmpty message="A evolução aparece depois de dois meses de histórico." />
      ) : (
        <div className="space-y-3">
          <div className="h-70">
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="month"
                  tickFormatter={(v: string) => shortMonth(v)}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <YAxis
                  tickFormatter={(v: number) => `${v}%`}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={36}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(v: string) => shortMonth(v)}
                  formatter={(v: number, name: string) => [`${v}%`, name]}
                />
                {groupNames.map((name, i) => (
                  <Area
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stackId="1"
                    stroke={colorByName.get(name) ?? PIE_COLORS[i % PIE_COLORS.length]}
                    fill={colorByName.get(name) ?? PIE_COLORS[i % PIE_COLORS.length]}
                    fillOpacity={0.35}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <ul className="flex flex-wrap gap-3 text-xs">
            {groupNames.map((name, i) => (
              <li key={name} className="flex items-center gap-1.5 text-foreground">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: colorByName.get(name) ?? PIE_COLORS[i % PIE_COLORS.length],
                  }}
                />
                {name}
              </li>
            ))}
          </ul>

          <div className="-mx-1 flex flex-wrap gap-1.5 overflow-x-auto pb-1">
            {chartData.map((row) => (
              <div
                key={String(row.month)}
                title={`${shortMonth(String(row.month))} — ${row.stageName || "sem fase"}`}
                className="flex shrink-0 flex-col items-center gap-0.5"
              >
                <span
                  className={cn(
                    "grid h-4 w-4 place-items-center rounded-full",
                    row.onTarget && "ring-2 ring-income ring-offset-1 ring-offset-background",
                  )}
                  style={{ backgroundColor: String(row.stageColor) }}
                >
                  {row.onTarget && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {shortMonth(String(row.month))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
