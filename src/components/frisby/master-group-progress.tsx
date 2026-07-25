// Cartão de progresso de um grupo master: % realizado vs. faixa-alvo (min–max)
// da fase aplicada. Diferente de orçamento (teto único), aqui o alvo é um
// INTERVALO — os dois traços na barra marcam min e max. Sem faixa (grupo
// "Outros" ou grupo sem target na fase), a barra é neutra, sem julgamento.

import { CategoryIcon } from "@/components/frisby/category-icon";
import { MoneyText } from "@/components/frisby/money-text";
import { formatMoney } from "@/lib/money";
import type { SnapshotGroup } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface MasterGroupProgressProps {
  group: SnapshotGroup;
  target: { minPct: number; maxPct: number } | null;
  className?: string;
}

export function MasterGroupProgress({ group, target, className }: MasterGroupProgressProps) {
  const pctDisplay = Math.round(group.pct * 100);

  // Sem faixa (grupo "Outros" ou sem target na fase): a barra usa a cor real
  // do grupo, sem julgamento de status — só o texto muda quando HÁ faixa.
  let barStyle: { backgroundColor: string } = {
    backgroundColor: group.color ?? "var(--color-muted-foreground)",
  };
  let statusLabel: string | null = null;
  let statusColor = "text-muted-foreground";

  if (target) {
    if (group.pct > target.maxPct) {
      barStyle = { backgroundColor: "var(--color-expense)" };
      statusLabel = "Acima da faixa";
      statusColor = "text-expense";
    } else if (group.pct < target.minPct) {
      barStyle = { backgroundColor: "var(--color-warning)" };
      statusLabel = "Abaixo da faixa";
      statusColor = "text-warning";
    } else {
      barStyle = { backgroundColor: "var(--color-brand)" };
      statusLabel = "Dentro da faixa";
      statusColor = "text-brand";
    }
  }

  // Mínimo de 2% de largura visível para valores pequenos não sumirem na barra.
  const fillPct = pctDisplay > 0 ? Math.max(2, Math.min(100, pctDisplay)) : 0;

  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        group.isOthers && group.realized !== "0"
          ? "border-warning/40 bg-warning/5"
          : "border-border/60 bg-card",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white"
            style={{ backgroundColor: group.color ?? "var(--color-muted-foreground)" }}
          >
            <CategoryIcon slug={group.icon ?? "tag"} className="h-3.5 w-3.5" />
          </span>
          <span className="truncate text-sm font-medium">{group.name}</span>
        </div>
        <MoneyText cents={group.realized} kind="expense" className="shrink-0 text-sm" />
      </div>

      <div className="relative h-2.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${fillPct}%`, ...barStyle }}
        />
        {target && (
          <>
            <span
              className="absolute top-0 h-full w-0.5 bg-foreground/40"
              style={{ left: `${Math.min(100, target.minPct * 100)}%` }}
            />
            <span
              className="absolute top-0 h-full w-0.5 bg-foreground/40"
              style={{ left: `${Math.min(100, target.maxPct * 100)}%` }}
            />
          </>
        )}
      </div>

      <p className="mt-1.5 flex items-center justify-between text-[11px]">
        <span className={statusColor}>{statusLabel ?? `${pctDisplay}% da renda`}</span>
        <span className="text-muted-foreground">
          {target
            ? `alvo ${Math.round(target.minPct * 100)}–${Math.round(target.maxPct * 100)}%`
            : `${pctDisplay}%`}
        </span>
      </p>

      {group.isOthers && group.realized !== "0" && (
        <p className="mt-2 text-[11px] text-warning">
          {pctDisplay}% da sua renda está em categorias sem grupo —{" "}
          <span className="font-medium">{formatMoney(group.realized)}</span> escapando da
          classificação.
        </p>
      )}
    </div>
  );
}
