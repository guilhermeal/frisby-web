// Jornada Financeira (Sprint 5.0): fase atual, progresso por grupo master no
// mês corrente, sugestão pendente de mudança de fase, e evolução histórica.
// O Frisby não recomenda método — só avalia contra o que o usuário configurou.

import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Route as RouteIcon, Settings2 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { EmptyState } from "@/components/frisby/empty-state";
import { PermissionGate } from "@/components/frisby/permission-gate";
import { StageTimeline } from "@/components/frisby/stage-timeline";
import { MasterGroupProgress } from "@/components/frisby/master-group-progress";
import { StageSuggestionBanner } from "@/components/frisby/stage-suggestion-banner";
import { JourneyEvolutionChart } from "@/components/frisby/journey-evolution-chart";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useFlows, useJourneySnapshot, useJourneyStatus } from "@/hooks/api/journey";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { PERMISSIONS } from "@/lib/auth/use-permissions";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { currentMonth, formatMonth } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/jornada")({
  component: JornadaPage,
});

function JornadaPage() {
  const { entity } = useCurrentEntity();
  const month = currentMonth();

  const statusQ = useJourneyStatus(entity?.id);
  const snapshotQ = useJourneySnapshot(entity?.id, month);
  const flowsQ = useFlows(entity?.id);

  const status = statusQ.data;
  const snapshot = snapshotQ.data;
  const isLoading = statusQ.isLoading || snapshotQ.isLoading;

  const activeFlow = flowsQ.data?.find((f) => f.id === status?.flow?.id);
  const currentStageTargets =
    activeFlow?.stages.find((s) => s.id === status?.currentStage?.id)?.targets ?? [];
  const targetByGroup = new Map(currentStageTargets.map((t) => [t.masterGroupId, t]));

  return (
    <AppShell>
      <PageHeader
        title="Jornada"
        subtitle="Fases, grupos master e evolução da sua renda"
        actions={
          <PermissionGate permission={PERMISSIONS.JOURNEY_MANAGE}>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to="/jornada/configuracao">
                <Settings2 className="h-4 w-4" /> Configurar
              </Link>
            </Button>
          </PermissionGate>
        }
      />

      <PermissionGate permission={PERMISSIONS.REPORT_VIEW}>
        <div className="mx-4 space-y-4 sm:mx-6 lg:mx-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando jornada…
            </div>
          ) : statusQ.error ? (
            <p className="rounded-2xl border border-expense/30 bg-expense/5 p-6 text-sm text-expense">
              {apiErrorMessage(statusQ.error)}
            </p>
          ) : !status?.flow ? (
            <EmptyState
              icon={RouteIcon}
              title="Monte sua jornada"
              description="Crie um fluxo de fases e grupos master para acompanhar quanto da sua renda vai para cada grande objetivo."
              action={
                <PermissionGate permission={PERMISSIONS.JOURNEY_MANAGE}>
                  <Button asChild size="sm" className="gap-1.5">
                    <Link to="/jornada/configuracao">
                      <Settings2 className="h-4 w-4" /> Começar
                    </Link>
                  </Button>
                </PermissionGate>
              }
            />
          ) : (
            <>
              <div className="rounded-2xl border border-border/60 bg-card p-5">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Fase atual
                </p>
                {status.currentStage ? (
                  <>
                    <h2
                      className="font-display text-xl font-semibold"
                      style={{ color: status.currentStage.color ?? undefined }}
                    >
                      {status.currentStage.name}
                    </h2>
                    {status.currentStage.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {status.currentStage.description}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma fase definida ainda.</p>
                )}
                <div className="mt-4">
                  <StageTimeline
                    stages={status.stages}
                    currentStageId={status.currentStage?.id ?? null}
                  />
                </div>
              </div>

              {status.pendingSuggestion && (
                <StageSuggestionBanner
                  entityId={entity?.id}
                  suggestion={status.pendingSuggestion}
                />
              )}

              <Tabs defaultValue="month">
                <TabsList>
                  <TabsTrigger value="month">Este mês</TabsTrigger>
                  <TabsTrigger value="evolution">Evolução</TabsTrigger>
                </TabsList>

                <TabsContent value="month" className="mt-4 space-y-4">
                  {snapshotQ.isLoading ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-28 rounded-2xl" />
                      ))}
                    </div>
                  ) : snapshotQ.error ? (
                    <p className="rounded-2xl border border-expense/30 bg-expense/5 p-6 text-sm text-expense">
                      {apiErrorMessage(snapshotQ.error)}
                    </p>
                  ) : snapshot?.reason === "no_income" ? (
                    <EmptyState
                      title="Sem renda baixada neste mês"
                      description="Os percentuais são calculados sobre a renda SETTLED (baixada). Baixe seus lançamentos de receita para ver a jornada deste mês."
                    />
                  ) : snapshot && snapshot.groups.filter((g) => !g.isOthers).length === 0 ? (
                    <EmptyState
                      title="Organize suas categorias em grupos"
                      description="Ainda não há grupos master vinculados a categorias — tudo está caindo em 'Outros'."
                      action={
                        <PermissionGate permission={PERMISSIONS.JOURNEY_MANAGE}>
                          <Button asChild size="sm" className="gap-1.5">
                            <Link to="/jornada/configuracao">
                              <Settings2 className="h-4 w-4" /> Organizar categorias
                            </Link>
                          </Button>
                        </PermissionGate>
                      }
                    />
                  ) : snapshot ? (
                    <>
                      {snapshot.reason === "no_match" && (
                        <p className="rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                          Seus números de {formatMonth(`${snapshot.month}-01`)} não se encaixam em
                          nenhuma fase do fluxo — você continua em{" "}
                          <strong>{status.currentStage?.name ?? "fase atual"}</strong>.
                        </p>
                      )}
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {snapshot.groups.map((g) => (
                          <MasterGroupProgress
                            key={g.masterGroupId}
                            group={g}
                            target={targetByGroup.get(g.masterGroupId) ?? null}
                          />
                        ))}
                      </div>
                    </>
                  ) : null}
                </TabsContent>

                <TabsContent value="evolution" className="mt-4">
                  <JourneyEvolutionChart entityId={entity?.id} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </PermissionGate>
    </AppShell>
  );
}
