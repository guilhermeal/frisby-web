// Barra de progresso de orçamento. O status (ok/warning≥80%/exceeded) e o
// percentUsed vêm PRONTOS do backend — aqui só se apresenta. O gasto
// previsto (PLANNED) aparece como segmento hachurado após o realizado.

import { formatMoney, pct } from "@/lib/money";
import type { BudgetReportItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<BudgetReportItem["status"], { bar: string; text: string }> = {
  ok: { bar: "bg-brand", text: "text-muted-foreground" },
  warning: { bar: "bg-warning", text: "text-warning" },
  exceeded: { bar: "bg-expense", text: "text-expense" },
};

export function BudgetProgress({ item }: { item: BudgetReportItem }) {
  const style = STATUS_STYLE[item.status];
  const settledPct = Math.min(100, item.percentUsed);
  const plannedPct = Math.min(100 - settledPct, pct(item.spentPlanned, item.budgetAmount));

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-medium">{item.categoryName}</span>
        <span className={cn("tnum shrink-0 text-xs font-medium", style.text)}>
          {formatMoney(item.spentSettled)} / {formatMoney(item.budgetAmount)}
        </span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-l-full transition-all", style.bar)}
          style={{ width: `${settledPct}%` }}
        />
        {plannedPct > 0 && (
          <div
            className="h-full opacity-40 transition-all"
            style={{
              width: `${plannedPct}%`,
              backgroundImage:
                "repeating-linear-gradient(45deg, currentColor 0 4px, transparent 4px 8px)",
              color: "var(--color-muted-foreground)",
            }}
            title={`Previsto: ${formatMoney(item.spentPlanned)}`}
          />
        )}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {item.status === "exceeded" ? (
          <>
            Estourado em{" "}
            <strong className="text-expense">
              {formatMoney((-BigInt(item.remaining)).toString())}
            </strong>
          </>
        ) : (
          <>
            Restam <strong className="text-foreground">{formatMoney(item.remaining)}</strong> ·{" "}
            {Math.round(item.percentUsed)}% usado
          </>
        )}
        {BigInt(item.spentPlanned) > 0n && <> · previsto {formatMoney(item.spentPlanned)}</>}
      </p>
    </div>
  );
}
