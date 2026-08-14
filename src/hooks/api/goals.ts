import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  goalsApi,
  goalsFeasibilityApi,
  type CreateGoalBody,
  type UpdateGoalBody,
} from "@/lib/api/endpoints";
import type { GoalStatus } from "@/lib/api/types";
import { qk } from "./keys";

function invalidateGoals(qc: QueryClient, entityId: string | undefined) {
  if (!entityId) return;
  qc.invalidateQueries({ queryKey: qk.goals(entityId) });
  qc.invalidateQueries({ queryKey: qk.goalsFeasibility(entityId) });
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

export function useGoalsFeasibility(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.goalsFeasibility(entityId ?? ""),
    queryFn: () => goalsFeasibilityApi.get(entityId!),
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
