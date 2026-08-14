// Detalhe da meta: histórico de aportes (transferências para a conta
// dedicada, kind CONTRIBUTION/WITHDRAWAL), gráfico simples de evolução do
// saldo, e ações de status (pausar/retomar/abandonar/marcar como alcançada).

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  MoreVertical,
  PartyPopper,
  Pause,
  PiggyBank,
  Play,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/frisby/empty-state";
import { MoneyText } from "@/components/frisby/money-text";
import { StatusPill } from "@/components/frisby/status-pill";
import { ConfirmDialog } from "@/components/frisby/confirm-dialog";
import { PermissionGate } from "@/components/frisby/permission-gate";
import { TransferForm } from "@/components/frisby/transfer-form";
import { GoalFormDialog } from "@/components/frisby/goal-form-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGoal, useSetGoalStatus, useTransfers } from "@/hooks/api";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { PERMISSIONS } from "@/lib/auth/use-permissions";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { formatDate } from "@/lib/format";
import { addCents } from "@/lib/money";
import type { GoalHorizon } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sonhos-metas_/$goalId")({
  component: GoalDetailPage,
});

const HORIZON_LABEL: Record<GoalHorizon, string> = {
  SHORT: "Curto prazo",
  MEDIUM: "Médio prazo",
  LONG: "Longo prazo",
};

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--color-foreground)",
};

function GoalDetailPage() {
  const { goalId } = Route.useParams();
  const { entity } = useCurrentEntity();

  const goalQ = useGoal(entity?.id, goalId);
  const transfersQ = useTransfers(entity?.id);
  const setStatus = useSetGoalStatus(entity?.id);

  const [contributing, setContributing] = useState(false);
  const [editing, setEditing] = useState(false);

  const goal = goalQ.data;

  // Histórico de aportes/resgates desta meta: pernas de transferência que
  // tocam a conta dedicada, mais recentes primeiro.
  const history = useMemo(() => {
    if (!goal) return [];
    return (transfersQ.data ?? [])
      .filter((t) => t.fromAccountId === goal.accountId || t.toAccountId === goal.accountId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transfersQ.data, goal]);

  // Evolução do saldo: soma acumulada dos aportes (entrada) menos resgates
  // (saída) em ordem cronológica — gráfico simples, sem pretensão de refletir
  // rendimento (que é lançado à parte como receita).
  const chartData = useMemo(() => {
    const chronological = [...history].sort((a, b) => a.date.localeCompare(b.date));
    let running = "0";
    return chronological.map((t) => {
      const isInflow = t.toAccountId === goal?.accountId;
      running = isInflow ? addCents(running, t.fromAmount) : addCents(running, `-${t.fromAmount}`);
      return { date: t.date, balance: running };
    });
  }, [history, goal?.accountId]);

  const isLoading = goalQ.isLoading;

  async function handleStatus(next: "PAUSED" | "ACTIVE" | "ABANDONED" | "ACHIEVED") {
    if (!goal) return;
    try {
      await setStatus.mutateAsync({ goalId: goal.id, status: next });
      const labels = {
        PAUSED: "Meta pausada",
        ACTIVE: "Meta retomada",
        ABANDONED: "Meta abandonada",
        ACHIEVED: "Meta marcada como alcançada 🎉",
      };
      toast.success(labels[next]);
    } catch (err) {
      toast.error(apiErrorMessage(err));
      throw err;
    }
  }

  return (
    <AppShell>
      <PageHeader
        title={goal?.name ?? "Meta"}
        subtitle={goal ? HORIZON_LABEL[goal.horizon] : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <Link to="/sonhos-metas">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            {goal && (
              <PermissionGate permission={PERMISSIONS.TRANSACTION_CREATE}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Ações da meta"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(true)}>Editar</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {goal.status === "ACTIVE" && (
                      <>
                        <DropdownMenuItem onClick={() => handleStatus("PAUSED")}>
                          <Pause className="mr-2 h-4 w-4" /> Pausar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatus("ACHIEVED")}>
                          <PartyPopper className="mr-2 h-4 w-4" /> Marcar como alcançada
                        </DropdownMenuItem>
                      </>
                    )}
                    {goal.status === "PAUSED" && (
                      <DropdownMenuItem onClick={() => handleStatus("ACTIVE")}>
                        <Play className="mr-2 h-4 w-4" /> Retomar
                      </DropdownMenuItem>
                    )}
                    {(goal.status === "ACTIVE" || goal.status === "PAUSED") && (
                      <ConfirmDialog
                        trigger={
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="text-expense focus:text-expense"
                          >
                            <XCircle className="mr-2 h-4 w-4" /> Abandonar
                          </DropdownMenuItem>
                        }
                        title="Abandonar esta meta?"
                        description="A meta deixa de contar na viabilidade agregada. A conta dedicada e o histórico de aportes continuam intactos."
                        confirmLabel="Abandonar"
                        destructive
                        onConfirm={() => handleStatus("ABANDONED")}
                      />
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </PermissionGate>
            )}
          </div>
        }
      />

      <div className="mx-4 space-y-4 sm:mx-6 lg:mx-0">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : goalQ.error || !goal ? (
          <div className="rounded-2xl border border-expense/30 bg-expense/5 p-6 text-sm text-expense">
            {apiErrorMessage(goalQ.error, "Meta não encontrada.")}
          </div>
        ) : (
          <>
            <div
              className={cn(
                "rounded-2xl border bg-card p-5",
                goal.status === "ACHIEVED" && "border-income/40",
                goal.status === "PAUSED" && "opacity-70",
                goal.status !== "ACHIEVED" && goal.status !== "PAUSED" && "border-border/60",
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Progresso</p>
                  <p className="tnum text-2xl font-semibold">{goal.progressPct.toFixed(0)}%</p>
                </div>
                {goal.status === "ACHIEVED" && (
                  <Badge className="gap-1 bg-income/10 text-income hover:bg-income/10">
                    <PartyPopper className="h-3 w-3" /> Alcançada
                  </Badge>
                )}
                {goal.status === "PAUSED" && <Badge variant="secondary">Pausada</Badge>}
                {goal.status === "ABANDONED" && <Badge variant="secondary">Abandonada</Badge>}
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full",
                    goal.status === "ACHIEVED" ? "bg-income" : "bg-brand",
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, goal.progressPct))}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Atual</p>
                  <p className="tnum font-medium">
                    <MoneyText cents={goal.currentBalance} currency={goal.currency} />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Alvo</p>
                  <p className="tnum font-medium">
                    <MoneyText cents={goal.targetAmount} currency={goal.currency} />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Aporte/mês</p>
                  <p className="tnum font-medium">
                    <MoneyText cents={goal.requiredMonthly} currency={goal.currency} />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prazo</p>
                  <p className="font-medium">{formatDate(goal.targetDate)}</p>
                </div>
              </div>

              {goal.status === "ACTIVE" && (
                <PermissionGate permission={PERMISSIONS.TRANSACTION_CREATE}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 gap-1.5"
                    onClick={() => setContributing(true)}
                  >
                    <PiggyBank className="h-3.5 w-3.5" /> Aportar
                  </Button>
                </PermissionGate>
              )}
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
              <div className="mb-4">
                <h3 className="font-display text-base font-semibold">Evolução do saldo</h3>
                <p className="text-xs text-muted-foreground">Acumulado de aportes e resgates</p>
              </div>
              {chartData.length < 2 ? (
                <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border/70 bg-background/40 px-6 text-center text-xs text-muted-foreground">
                  A evolução aparece depois do segundo aporte.
                </div>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer>
                    <AreaChart data={chartData}>
                      <CartesianGrid vertical={false} stroke="var(--color-border)" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v: string) => formatDate(v)}
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                      />
                      <YAxis
                        tickFormatter={(v: number) => (v / 100).toLocaleString("pt-BR")}
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        width={44}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(v: string) => formatDate(v)}
                        formatter={(v: number) => [
                          <MoneyText key="v" cents={String(v)} currency={goal.currency} />,
                          "Saldo",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="var(--color-brand)"
                        fill="var(--color-brand)"
                        fillOpacity={0.25}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
              <h3 className="mb-3 font-display text-base font-semibold">Histórico de aportes</h3>
              {transfersQ.isLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
                </div>
              ) : history.length === 0 ? (
                <EmptyState
                  icon={PiggyBank}
                  title="Nenhum aporte ainda"
                  description="Registre o primeiro aporte para começar a evoluir esta meta."
                />
              ) : (
                <ul className="space-y-2">
                  {history.map((t) => {
                    const isInflow = t.toAccountId === goal.accountId;
                    return (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {isInflow ? "Aporte" : "Resgate"}
                            {t.description ? ` · ${t.description}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                        </div>
                        <StatusPill status={t.status} />
                        <MoneyText
                          cents={t.fromAmount}
                          currency={t.fromCurrency}
                          kind={isInflow ? "income" : "expense"}
                          sign
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {goal && (
        <>
          <TransferForm
            entityId={entity?.id}
            open={contributing}
            onOpenChange={setContributing}
            kind="CONTRIBUTION"
            defaultToId={goal.accountId}
          />
          <GoalFormDialog
            entityId={entity?.id}
            open={editing}
            onOpenChange={setEditing}
            goal={goal}
          />
        </>
      )}
    </AppShell>
  );
}
