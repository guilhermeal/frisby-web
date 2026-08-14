// Card de uma meta: progresso, aporte necessário e prazo restante. Estados
// especiais (atingida/pausada) só mudam aparência — nunca escondem a meta da
// lista. Viabilidade é sempre AGREGADA (GET /goals/feasibility) — o backend
// não calcula um nível de viabilidade por meta individual.

import { Link } from "@tanstack/react-router";
import { PartyPopper, PiggyBank } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoneyText } from "@/components/frisby/money-text";
import { PermissionGate } from "@/components/frisby/permission-gate";
import { PERMISSIONS } from "@/lib/auth/use-permissions";
import { formatDate } from "@/lib/format";
import type { Goal } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const HORIZON_LABEL = {
  SHORT: "Curto prazo",
  MEDIUM: "Médio prazo",
  LONG: "Longo prazo",
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
            <p className="text-xs text-muted-foreground">{HORIZON_LABEL[goal.horizon]}</p>
          </div>
          {isAchieved ? (
            <Badge className="shrink-0 gap-1 bg-income/10 text-income hover:bg-income/10">
              <PartyPopper className="h-3 w-3" /> Alcançada
            </Badge>
          ) : isPaused ? (
            <Badge variant="secondary" className="shrink-0">
              Pausada
            </Badge>
          ) : null}
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
              <MoneyText cents={goal.currentBalance} currency={goal.currency} /> de{" "}
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
                <MoneyText cents={goal.requiredMonthly} currency={goal.currency} />
                /mês
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Prazo</p>
              <p className="font-medium">{formatDate(goal.targetDate)}</p>
            </div>
          </div>
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
