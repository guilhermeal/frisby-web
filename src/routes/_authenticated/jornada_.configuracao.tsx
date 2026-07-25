// Configuração da Jornada Financeira: Grupos Master (criar, vincular
// categorias, flag de aportes) e Fluxos/Fases (ordenar com subir/descer,
// definir faixas por grupo), com botão "criar exemplo" + disclaimer.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Layers,
  Loader2,
  MoreVertical,
  Plus,
  Route as RouteIcon,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { EmptyState } from "@/components/frisby/empty-state";
import { ConfirmDialog } from "@/components/frisby/confirm-dialog";
import { PermissionGate } from "@/components/frisby/permission-gate";
import { CategoryIcon } from "@/components/frisby/category-icon";
import { ExampleFlowDisclaimer } from "@/components/frisby/example-flow-disclaimer";
import { MasterGroupForm } from "@/components/frisby/master-group-form";
import { MasterGroupCategoriesDialog } from "@/components/frisby/master-group-categories-dialog";
import { FlowStageForm } from "@/components/frisby/flow-stage-form";
import { StageTargetsEditor } from "@/components/frisby/stage-targets-editor";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCreateExampleFlow,
  useDeleteFlow,
  useDeleteMasterGroup,
  useDeleteStage,
  useFlows,
  useMasterGroups,
  useMoveStage,
  useUnlinkedCategories,
  useUpdateMasterGroup,
  useActivateFlow,
} from "@/hooks/api/journey";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { PERMISSIONS } from "@/lib/auth/use-permissions";
import { apiErrorMessage } from "@/lib/api/error-messages";
import type { Flow, FlowStage, MasterGroup } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/jornada_/configuracao")({
  component: JornadaConfigPage,
});

function JornadaConfigPage() {
  return (
    <AppShell>
      <PageHeader
        title="Configurar jornada"
        subtitle="Grupos master e fluxos de fases"
        actions={
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/jornada">
              <ArrowLeft className="h-4 w-4" /> Jornada
            </Link>
          </Button>
        }
      />
      <PermissionGate permission={PERMISSIONS.JOURNEY_MANAGE}>
        <div className="mx-4 sm:mx-6 lg:mx-0">
          <Tabs defaultValue="groups">
            <TabsList>
              <TabsTrigger value="groups">Grupos master</TabsTrigger>
              <TabsTrigger value="flows">Fluxos e fases</TabsTrigger>
            </TabsList>
            <TabsContent value="groups" className="mt-4">
              <MasterGroupsPanel />
            </TabsContent>
            <TabsContent value="flows" className="mt-4">
              <FlowsPanel />
            </TabsContent>
          </Tabs>
        </div>
      </PermissionGate>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Grupos Master
// ---------------------------------------------------------------------------

function MasterGroupsPanel() {
  const { entity } = useCurrentEntity();
  const groupsQ = useMasterGroups(entity?.id);
  const unlinkedQ = useUnlinkedCategories(entity?.id);
  const updateGroup = useUpdateMasterGroup(entity?.id);
  const deleteGroup = useDeleteMasterGroup(entity?.id);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<MasterGroup | null>(null);
  const [linkingCategories, setLinkingCategories] = useState<MasterGroup | null>(null);

  async function toggleContributions(group: MasterGroup) {
    try {
      await updateGroup.mutateAsync({
        groupId: group.id,
        includeContributions: !group.includeContributions,
      });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function handleDelete(group: MasterGroup) {
    try {
      await deleteGroup.mutateAsync(group.id);
      toast.success("Grupo excluído");
    } catch (err) {
      toast.error(apiErrorMessage(err));
      throw err;
    }
  }

  const groups = groupsQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Novo grupo
        </Button>
      </div>

      {groupsQ.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nenhum grupo master"
          description="Grupos master reúnem categorias-pai em grandes blocos (ex.: Necessidades, Desejos, Futuro) para acompanhar o % da sua renda."
          action={
            <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Criar grupo
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {groups.map((g) => (
            <li key={g.id} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white"
                  style={{ backgroundColor: g.color ?? "var(--color-muted-foreground)" }}
                >
                  <CategoryIcon slug={g.icon ?? "tag"} className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{g.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.categories.length} {g.categories.length === 1 ? "categoria" : "categorias"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(g)}>Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLinkingCategories(g)}>
                      Vincular categorias
                    </DropdownMenuItem>
                    <ConfirmDialog
                      trigger={
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          className="text-expense focus:text-expense"
                        >
                          Excluir
                        </DropdownMenuItem>
                      }
                      title="Excluir grupo master?"
                      description="As categorias vinculadas ficam sem grupo (caem em Outros) e as faixas que o referenciam são removidas."
                      confirmLabel="Excluir"
                      destructive
                      onConfirm={() => handleDelete(g)}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
                <span className="text-xs text-muted-foreground">Incluir aportes</span>
                <Switch
                  checked={g.includeContributions}
                  onCheckedChange={() => toggleContributions(g)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Fora dos grupos
        </p>
        {unlinkedQ.isLoading ? (
          <Skeleton className="h-6 w-full" />
        ) : (unlinkedQ.data ?? []).length === 0 ? (
          <p className="text-xs text-income">Todas as categorias estão organizadas.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(unlinkedQ.data ?? []).map((c) => (
              <span
                key={c.id}
                className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground"
              >
                {c.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <MasterGroupForm entityId={entity?.id} open={creating} onOpenChange={setCreating} />
      <MasterGroupForm
        entityId={entity?.id}
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        group={editing ?? undefined}
      />
      <MasterGroupCategoriesDialog
        entityId={entity?.id}
        open={!!linkingCategories}
        onOpenChange={(v) => !v && setLinkingCategories(null)}
        group={linkingCategories}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fluxos e Fases
// ---------------------------------------------------------------------------

function FlowsPanel() {
  const { entity } = useCurrentEntity();
  const flowsQ = useFlows(entity?.id);
  const activateFlow = useActivateFlow(entity?.id);
  const deleteFlow = useDeleteFlow(entity?.id);
  const deleteStage = useDeleteStage(entity?.id);
  const moveStage = useMoveStage(entity?.id);
  const createExample = useCreateExampleFlow(entity?.id);

  const [creatingStageFor, setCreatingStageFor] = useState<Flow | null>(null);
  const [editingStage, setEditingStage] = useState<{ flow: Flow; stage: FlowStage } | null>(null);
  const [targetsFor, setTargetsFor] = useState<{ flow: Flow; stage: FlowStage } | null>(null);

  async function handleActivate(flow: Flow) {
    try {
      await activateFlow.mutateAsync(flow.id);
      toast.success(`"${flow.name}" ativado`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function handleDeleteFlow(flow: Flow) {
    try {
      await deleteFlow.mutateAsync(flow.id);
      toast.success("Fluxo excluído");
    } catch (err) {
      toast.error(apiErrorMessage(err));
      throw err;
    }
  }

  async function handleDeleteStage(flow: Flow, stage: FlowStage) {
    try {
      await deleteStage.mutateAsync({ flowId: flow.id, stageId: stage.id });
      toast.success("Fase excluída");
    } catch (err) {
      toast.error(apiErrorMessage(err));
      throw err;
    }
  }

  async function handleMove(flow: Flow, stage: FlowStage, direction: "up" | "down") {
    try {
      await moveStage.mutateAsync({ flowId: flow.id, stageId: stage.id, direction });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function handleCreateExample() {
    try {
      const flow = await createExample.mutateAsync(true);
      toast.success(`"${flow.name}" criado e ativado`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  const flows = flowsQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleCreateExample}
          disabled={createExample.isPending}
        >
          {createExample.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Criar fluxo de exemplo
        </Button>
      </div>
      <ExampleFlowDisclaimer />

      {flowsQ.isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : flows.length === 0 ? (
        <EmptyState
          icon={RouteIcon}
          title="Monte sua jornada"
          description="Um fluxo é uma sequência de fases, da pior à melhor. Crie do zero ou comece pelo exemplo acima."
        />
      ) : (
        <ul className="space-y-3">
          {flows.map((flow) => (
            <li key={flow.id} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{flow.name}</p>
                  {flow.active && (
                    <span className="rounded-full bg-income/10 px-2 py-0.5 text-[10px] font-medium text-income">
                      Ativo
                    </span>
                  )}
                  {flow.isExample && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Exemplo
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {!flow.active && (
                    <Button size="sm" variant="outline" onClick={() => handleActivate(flow)}>
                      Ativar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1"
                    onClick={() => setCreatingStageFor(flow)}
                  >
                    <Plus className="h-3.5 w-3.5" /> Fase
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="ghost" className="text-expense hover:text-expense">
                        Excluir
                      </Button>
                    }
                    title="Excluir fluxo?"
                    description={
                      flow.active
                        ? "Este fluxo está ativo — ative outro antes de excluir."
                        : "Esta ação não pode ser desfeita."
                    }
                    confirmLabel="Excluir"
                    destructive
                    onConfirm={() => handleDeleteFlow(flow)}
                  />
                </div>
              </div>

              {flow.stages.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">Nenhuma fase ainda.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {[...flow.stages]
                    .sort((a, b) => a.order - b.order)
                    .map((stage, idx, arr) => (
                      <li
                        key={stage.id}
                        className="flex items-center gap-2 rounded-xl border border-border/50 px-3 py-2"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: stage.color ?? "var(--color-muted-foreground)",
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{stage.name}</p>
                          {stage.description && (
                            <p className="truncate text-xs text-muted-foreground">
                              {stage.description}
                            </p>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={idx === 0 || moveStage.isPending}
                          onClick={() => handleMove(flow, stage, "up")}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={idx === arr.length - 1 || moveStage.isPending}
                          onClick={() => handleMove(flow, stage, "down")}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-xs"
                          onClick={() => setTargetsFor({ flow, stage })}
                        >
                          <Target className="h-3.5 w-3.5" /> Faixas
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingStage({ flow, stage })}>
                              Editar
                            </DropdownMenuItem>
                            <ConfirmDialog
                              trigger={
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-expense focus:text-expense"
                                >
                                  Excluir
                                </DropdownMenuItem>
                              }
                              title="Excluir fase?"
                              description="Esta ação não pode ser desfeita."
                              confirmLabel="Excluir"
                              destructive
                              onConfirm={() => handleDeleteStage(flow, stage)}
                            />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </li>
                    ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <FlowStageForm
        entityId={entity?.id}
        flowId={creatingStageFor?.id}
        open={!!creatingStageFor}
        onOpenChange={(v) => !v && setCreatingStageFor(null)}
      />
      <FlowStageForm
        entityId={entity?.id}
        flowId={editingStage?.flow.id}
        open={!!editingStage}
        onOpenChange={(v) => !v && setEditingStage(null)}
        stage={editingStage?.stage}
      />
      <StageTargetsEditor
        entityId={entity?.id}
        flowId={targetsFor?.flow.id}
        open={!!targetsFor}
        onOpenChange={(v) => !v && setTargetsFor(null)}
        stage={targetsFor?.stage ?? null}
      />
    </div>
  );
}
