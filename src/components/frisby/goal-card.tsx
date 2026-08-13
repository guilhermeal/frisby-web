// Card de uma meta: progresso, aporte necessário, projeção e badge de
// viabilidade individual. Estados especiais (atingida/pausada/inviável) só
// mudam aparência — nunca escondem a meta da lista.

import { Link } from "@tanstack/react-router";
import { PartyPopper, PiggyBank } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoneyText } from "@/components/frisby/money-text";
import { PermissionGate } from "@/components/frisby/permission-gate";
import { PERMISSIONS } from "@/lib/auth/use-permissions";
import { formatDate } from "@/lib/format";
import type { Goal, GoalCategory } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<GoalCategory, string> = {
  RESERVE: "Reserva",
  TRIP: "Viagem",
  VEHICLE: "Veículo",
  PROPERTY: "Imóvel",
  EDUCATION: "Educação",
  OTHER: "Outro",
};

const VIABILITY_LABEL = {
  ok: "Viável",
  tight: "Apertado",
  unfeasible: "Inviável",
} as const;

const VIABILITY_CLASS = {
  ok: "bg-income/10 text-income",
  tight: "bg-warning/10 text-warning",
  unfeasible: "bg-expense/10 text-expense",
} as const;

interface GoalCardProps {
  goal: Goal;
  onContribute: (goal: Goal) => void;
}

export function GoalCard({ goal, onContribute }: GoalCardProps) {
  const isAchieved = goal.status === "ACHIEVED";
  const isPaused = goal.status === "PAUSED";
  const progress = Math.min(100, Math.max(0, goal.progressPct));

  return (
    <li
      className={cn(
        "rounded-2xl border bg-card p-4 transition-opacity",
        isAchieved && "border-income/40",
        isPaused && "opacity-60",
        !isAchieved && !isPaused && "border-border/60",
      )}
    >
      <Link
        to="/sonhos-metas/$goalId"
        params={{ goalId: goal.id }}
        className="block space-y-3 focus-visible:outline-none"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{goal.name}</p>
            <p className="text-xs text-muted-foreground">{CATEGORY_LABEL[goal.category]}</p>
          </div>
          {isAchieved ? (
            <Badge className="shrink-0 gap-1 bg-income/10 text-income hover:bg-income/10">
              <PartyPopper className="h-3 w-3" /> Alcançada
            </Badge>
          ) : isPaused ? (
            <Badge variant="secondary" className="shrink-0">
              Pausada
            </Badge>
          ) : (
            <Badge className={cn("shrink-0", VIABILITY_CLASS[goal.viability])}>
              {VIABILITY_LABEL[goal.viability]}
            </Badge>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isAchieved ? "bg-income" : "bg-brand",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <MoneyText cents={goal.currentAmount} currency={goal.currency} /> de{" "}
              <MoneyText cents={goal.targetAmount} currency={goal.currency} />
            </span>
            <span className="tnum font-medium text-foreground">{progress.toFixed(0)}%</span>
          </div>
        </div>

        {!isAchieved && (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Aporte necessário</p>
              <p className="tnum font-medium">
                <MoneyText cents={goal.requiredMonthlyContribution} currency={goal.currency} />
                /mês
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Conclusão prevista</p>
              <p className="font-medium">
                {goal.projectedCompletionDate
                  ? formatDate(goal.projectedCompletionDate)
                  : "Sem histórico ainda"}
              </p>
            </div>
          </div>
        )}

        {goal.viability === "unfeasible" && !isAchieved && !isPaused && (
          <p className="rounded-lg bg-expense/5 px-3 py-2 text-xs text-expense">
            Aumente o prazo ou reduza o valor para viabilizar esta meta.
          </p>
        )}
      </Link>

      {!isAchieved && !isPaused && (
        <PermissionGate permission={PERMISSIONS.TRANSACTION_CREATE}>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 w-full gap-1.5"
            onClick={() => onContribute(goal)}
          >
            <PiggyBank className="h-3.5 w-3.5" /> Aportar
          </Button>
        </PermissionGate>
      )}
    </li>
  );
}
