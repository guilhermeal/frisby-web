// Sonhos & Metas (Sprint 6.1): objetivos com valor-alvo e prazo, cada um com
// uma conta de investimento dedicada por trás (transparente ao usuário).
// Painel de viabilidade agregada no topo + cards por meta com progresso,
// aporte necessário e projeção. Aportar é uma transferência comum para a
// conta da meta (kind CONTRIBUTION, formulário já existente).

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { EmptyState } from "@/components/frisby/empty-state";
import { GoalCard } from "@/components/frisby/goal-card";
import { GoalFormDialog } from "@/components/frisby/goal-form-dialog";
import { GoalViabilityPanel } from "@/components/frisby/goal-viability-panel";
import { PermissionGate } from "@/components/frisby/permission-gate";
import { TransferForm } from "@/components/frisby/transfer-form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoals } from "@/hooks/api";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { PERMISSIONS } from "@/lib/auth/use-permissions";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { addMonths, todayISO } from "@/lib/format";
import type { Goal } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/sonhos-metas")({
  component: SonhosMetasPage,
});

type Horizon = "all" | "short" | "medium" | "long";

const HORIZON_LABEL: Record<Horizon, string> = {
  all: "Todos os prazos",
  short: "Curto prazo (até 1 ano)",
  medium: "Médio prazo (1 a 5 anos)",
  long: "Longo prazo (5+ anos)",
};

function horizonOf(targetDate: string): Exclude<Horizon, "all"> {
  const oneYear = addMonths(todayISO().slice(0, 7), 12);
  const fiveYears = addMonths(todayISO().slice(0, 7), 60);
  const ym = targetDate.slice(0, 7);
  if (ym <= oneYear) return "short";
  if (ym <= fiveYears) return "medium";
  return "long";
}

function SonhosMetasPage() {
  const { entity } = useCurrentEntity();
  const [horizon, setHorizon] = useState<Horizon>("all");
  const [creating, setCreating] = useState(false);
  const [contributingTo, setContributingTo] = useState<Goal | null>(null);

  const goalsQ = useGoals(entity?.id);
  const goals = goalsQ.data ?? [];

  const filtered = useMemo(
    () => (horizon === "all" ? goals : goals.filter((g) => horizonOf(g.targetDate) === horizon)),
    [goals, horizon],
  );

  // Ordem visual: ativas primeiro (mais inviáveis no topo, chamam atenção),
  // depois pausadas, depois alcançadas por último (já não pedem ação).
  const sorted = useMemo(() => {
    const rank = { ACTIVE: 0, PAUSED: 1, ACHIEVED: 2, ABANDONED: 3 } as const;
    const viabilityRank = { unfeasible: 0, tight: 1, ok: 2 } as const;
    return [...filtered].sort((a, b) => {
      if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
      return viabilityRank[a.viability] - viabilityRank[b.viability];
    });
  }, [filtered]);

  return (
    <AppShell>
      <PageHeader
        title="Sonhos & Metas"
        subtitle="Seus objetivos financeiros, com aporte necessário calculado"
        actions={
          <PermissionGate permission={PERMISSIONS.TRANSACTION_CREATE}>
            <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nova meta</span>
            </Button>
          </PermissionGate>
        }
      />

      <div className="mx-4 space-y-4 sm:mx-6 lg:mx-0">
        {goals.length > 0 && <GoalViabilityPanel entityId={entity?.id} />}

        {goals.length > 0 && (
          <Select value={horizon} onValueChange={(v) => setHorizon(v as Horizon)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(HORIZON_LABEL) as Horizon[]).map((h) => (
                <SelectItem key={h} value={h}>
                  {HORIZON_LABEL[h]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {goalsQ.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : goalsQ.error ? (
          <div className="rounded-2xl border border-expense/30 bg-expense/5 p-6 text-sm text-expense">
            {apiErrorMessage(goalsQ.error)}
          </div>
        ) : goals.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Nenhuma meta ainda — que tal começar?"
            description="Defina um objetivo com valor e prazo e a gente calcula quanto guardar por mês."
            action={
              <PermissionGate permission={PERMISSIONS.TRANSACTION_CREATE}>
                <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4" /> Nova meta
                </Button>
              </PermissionGate>
            }
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Nenhuma meta neste horizonte"
            description="Ajuste o filtro de prazo ou crie uma nova meta."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onContribute={setContributingTo} />
            ))}
          </ul>
        )}
      </div>

      <GoalFormDialog entityId={entity?.id} open={creating} onOpenChange={setCreating} />

      {contributingTo && (
        <TransferForm
          entityId={entity?.id}
          open={!!contributingTo}
          onOpenChange={(v) => !v && setContributingTo(null)}
          kind="CONTRIBUTION"
          defaultToId={contributingTo.accountId}
        />
      )}
    </AppShell>
  );
}
