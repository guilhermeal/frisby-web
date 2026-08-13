// Painel de viabilidade agregada: sobra mensal real da entidade vs. soma do
// aporte necessário de todas as metas ATIVAS (pausadas não entram). Quando
// não fecha, mostra o ranking das metas que mais pesam no orçamento.

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MoneyText } from "@/components/frisby/money-text";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { useGoalsViability } from "@/hooks/api";
import { cn } from "@/lib/utils";

const LEVEL_LABEL = {
  ok: "Tudo cabe no orçamento",
  tight: "Está apertado",
  unfeasible: "Não cabe no orçamento",
} as const;

const LEVEL_CLASS = {
  ok: "bg-income/10 text-income",
  tight: "bg-warning/10 text-warning",
  unfeasible: "bg-expense/10 text-expense",
} as const;

export function GoalViabilityPanel({ entityId }: { entityId: string | undefined }) {
  const q = useGoalsViability(entityId);

  if (q.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Calculando viabilidade…
      </div>
    );
  }

  if (q.error) {
    return (
      <div className="rounded-2xl border border-expense/30 bg-expense/5 p-4 text-sm text-expense">
        {apiErrorMessage(q.error)}
      </div>
    );
  }

  const data = q.data;
  if (!data) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5",
        data.level === "unfeasible"
          ? "border-expense/30"
          : data.level === "tight"
            ? "border-warning/30"
            : "border-border/60",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-semibold">Viabilidade das metas</h3>
          <p className="text-xs text-muted-foreground">Sobra mensal vs. aporte total necessário</p>
        </div>
        <Badge className={cn("shrink-0", LEVEL_CLASS[data.level])}>{LEVEL_LABEL[data.level]}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Sobra mensal disponível</p>
          <p className="tnum font-semibold">
            <MoneyText cents={data.monthlySurplus} currency={data.currency} />
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Aporte total necessário</p>
          <p className="tnum font-semibold">
            <MoneyText cents={data.totalRequiredContribution} currency={data.currency} />
          </p>
        </div>
      </div>

      {data.level !== "ok" && data.ranking.length > 0 && (
        <div className="mt-4 border-t border-border/60 pt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Metas que mais pesam no orçamento
          </p>
          <ul className="space-y-1.5">
            {data.ranking.map((r, i) => (
              <li key={r.goalId} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 truncate">
                  <span className="text-xs text-muted-foreground">{i + 1}.</span>
                  {r.goalName}
                </span>
                <span className="tnum shrink-0 text-xs font-medium">
                  <MoneyText cents={r.requiredMonthlyContribution} currency={data.currency} />
                  /mês
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
