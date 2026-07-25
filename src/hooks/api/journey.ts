import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { flowsApi, journeyApi, masterGroupsApi } from "@/lib/api/endpoints";
import { qk } from "./keys";

function useInvalidateJourney() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["journey"] });
}

// ------- grupos master -------

export function useMasterGroups(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.masterGroups(entityId ?? ""),
    queryFn: () => masterGroupsApi.list(entityId!),
    enabled: !!entityId,
  });
}

export function useUnlinkedCategories(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.unlinkedCategories(entityId ?? ""),
    queryFn: () => masterGroupsApi.unlinkedCategories(entityId!),
    enabled: !!entityId,
  });
}

export function useCreateMasterGroup(entityId: string | undefined) {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: (body: {
      name: string;
      color?: string;
      icon?: string;
      includeContributions?: boolean;
    }) => masterGroupsApi.create(entityId!, body),
    onSuccess: invalidate,
  });
}

export function useUpdateMasterGroup(entityId: string | undefined) {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: ({
      groupId,
      ...body
    }: {
      groupId: string;
      name?: string;
      color?: string | null;
      icon?: string | null;
      includeContributions?: boolean;
      order?: number;
    }) => masterGroupsApi.update(entityId!, groupId, body),
    onSuccess: invalidate,
  });
}

export function useDeleteMasterGroup(entityId: string | undefined) {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: (groupId: string) => masterGroupsApi.remove(entityId!, groupId),
    onSuccess: invalidate,
  });
}

export function useSetGroupCategories(entityId: string | undefined) {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: ({ groupId, categoryIds }: { groupId: string; categoryIds: string[] }) =>
      masterGroupsApi.setCategories(entityId!, groupId, categoryIds),
    onSuccess: invalidate,
  });
}

// ------- fluxos e fases -------

export function useFlows(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.flows(entityId ?? ""),
    queryFn: () => flowsApi.list(entityId!),
    enabled: !!entityId,
  });
}

export function useCreateFlow(entityId: string | undefined) {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: (body: { name: string; active?: boolean }) => flowsApi.create(entityId!, body),
    onSuccess: invalidate,
  });
}

export function useCreateExampleFlow(entityId: string | undefined) {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: (activate?: boolean) => flowsApi.createExample(entityId!, activate),
    onSuccess: invalidate,
  });
}

export function useUpdateFlow(entityId: string | undefined) {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: ({ flowId, ...body }: { flowId: string; name?: string; active?: boolean }) =>
      flowsApi.update(entityId!, flowId, body),
    onSuccess: invalidate,
  });
}

export function useActivateFlow(entityId: string | undefined) {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: (flowId: string) => flowsApi.activate(entityId!, flowId),
    onSuccess: invalidate,
  });
}

export function useDeleteFlow(entityId: string | undefined) {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: (flowId: string) => flowsApi.remove(entityId!, flowId),
    onSuccess: invalidate,
  });
}

export function useCreateStage(entityId: string | undefined) {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: ({
      flowId,
      ...body
    }: {
      flowId: string;
      name: string;
      description?: string;
      color?: string;
    }) => flowsApi.createStage(entityId!, flowId, body),
    onSuccess: invalidate,
  });
}

export function useUpdateStage(entityId: string | undefined) {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: ({
      flowId,
      stageId,
      ...body
    }: {
      flowId: string;
      stageId: string;
      name?: string;
      description?: string | null;
      color?: string | null;
    }) => flowsApi.updateStage(entityId!, flowId, stageId, body),
    onSuccess: invalidate,
  });
}

export function useDeleteStage(entityId: string | undefined) {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: ({ flowId, stageId }: { flowId: string; stageId: string }) =>
      flowsApi.removeStage(entityId!, flowId, stageId),
    onSuccess: invalidate,
  });
}

export function useMoveStage(entityId: string | undefined) {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: ({
      flowId,
      stageId,
      direction,
    }: {
      flowId: string;
      stageId: string;
      direction: "up" | "down";
    }) => flowsApi.moveStage(entityId!, flowId, stageId, direction),
    onSuccess: invalidate,
  });
}

export function useSetStageTargets(entityId: string | undefined) {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: ({
      flowId,
      stageId,
      targets,
    }: {
      flowId: string;
      stageId: string;
      targets: { masterGroupId: string; minPct: number; maxPct: number }[];
    }) => flowsApi.setStageTargets(entityId!, flowId, stageId, targets),
    onSuccess: invalidate,
  });
}

// ------- status, snapshot, histórico, sugestão -------

export function useJourneyStatus(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.journeyStatus(entityId ?? ""),
    queryFn: () => journeyApi.status(entityId!),
    enabled: !!entityId,
  });
}

export function useJourneySnapshot(entityId: string | undefined, month: string) {
  return useQuery({
    queryKey: qk.journeySnapshot(entityId ?? "", month),
    queryFn: () => journeyApi.snapshot(entityId!, month),
    enabled: !!entityId,
  });
}

export function useJourneyHistory(entityId: string | undefined, months = 12) {
  return useQuery({
    queryKey: qk.journeyHistory(entityId ?? "", months),
    queryFn: () => journeyApi.history(entityId!, months),
    enabled: !!entityId,
  });
}

export function useEvaluateJourney(entityId: string | undefined) {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: (month?: string) => journeyApi.evaluate(entityId!, month),
    onSuccess: invalidate,
  });
}

export function useAcceptSuggestion(entityId: string | undefined) {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: (month: string) => journeyApi.acceptSuggestion(entityId!, month),
    onSuccess: invalidate,
  });
}

export function useDismissSuggestion(entityId: string | undefined) {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: (month: string) => journeyApi.dismissSuggestion(entityId!, month),
    onSuccess: invalidate,
  });
}

export function useUpdateJourneySettings(entityId: string | undefined) {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: (
      body: Partial<{ evaluationDay: number; autoApply: boolean; currentStageId: string | null }>,
    ) => journeyApi.updateSettings(entityId!, body),
    onSuccess: invalidate,
  });
}
