import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  goalsApi,
  goalsViabilityApi,
  type CreateGoalBody,
  type UpdateGoalBody,
} from "@/lib/api/endpoints";
import type { GoalStatus } from "@/lib/api/types";
import { qk } from "./keys";

function invalidateGoals(qc: QueryClient, entityId: string | undefined) {
  if (!entityId) return;
  qc.invalidateQueries({ queryKey: qk.goals(entityId) });
  qc.invalidateQueries({ queryKey: qk.goalsViability(entityId) });
}

export function useGoals(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.goals(entityId ?? ""),
    queryFn: () => goalsApi.list(entityId!),
    enabled: !!entityId,
  });
}

export function useGoal(entityId: string | undefined, goalId: string | undefined) {
  return useQuery({
    queryKey: qk.goal(entityId ?? "", goalId ?? ""),
    queryFn: () => goalsApi.get(entityId!, goalId!),
    enabled: !!entityId && !!goalId,
  });
}

export function useGoalsViability(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.goalsViability(entityId ?? ""),
    queryFn: () => goalsViabilityApi.get(entityId!),
    enabled: !!entityId,
  });
}

export function useCreateGoal(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGoalBody) => goalsApi.create(entityId!, body),
    onSuccess: () => invalidateGoals(qc, entityId),
  });
}

export function useUpdateGoal(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, ...body }: UpdateGoalBody & { goalId: string }) =>
      goalsApi.update(entityId!, goalId, body),
    onSuccess: () => invalidateGoals(qc, entityId),
  });
}

export function useSetGoalStatus(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, status }: { goalId: string; status: GoalStatus }) =>
      goalsApi.setStatus(entityId!, goalId, status),
    onSuccess: () => invalidateGoals(qc, entityId),
  });
}

export function useDeleteGoal(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => goalsApi.remove(entityId!, goalId),
    onSuccess: () => invalidateGoals(qc, entityId),
  });
}

/**
 * Prévia ao vivo do aporte necessário — debounced pelo chamador. Não usa
 * useQuery porque é essencialmente uma ação sob demanda dos campos do
 * formulário, não um dado cacheável por chave estável.
 */
export function useGoalPreview(entityId: string | undefined) {
  return useMutation({
    mutationFn: (body: { targetAmount: string; targetDate: string }) =>
      goalsApi.preview(entityId!, body),
  });
}
