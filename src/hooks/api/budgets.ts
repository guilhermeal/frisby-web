import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { budgetsApi } from "@/lib/api/endpoints";
import type { BudgetPeriod } from "@/lib/api/types";
import { qk } from "./keys";

export function useBudgets(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.budgets(entityId ?? ""),
    queryFn: () => budgetsApi.list(entityId!),
    enabled: !!entityId,
  });
}

export function useBudgetReport(entityId: string | undefined, month: string) {
  return useQuery({
    queryKey: qk.budgetReport(entityId ?? "", month),
    queryFn: () => budgetsApi.report(entityId!, month),
    enabled: !!entityId,
  });
}

function useInvalidateBudgets(entityId: string | undefined) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["budgets"] });
}

export function useCreateBudget(entityId: string | undefined) {
  const invalidate = useInvalidateBudgets(entityId);
  return useMutation({
    mutationFn: (body: {
      categoryId: string;
      amount: string;
      currency: string;
      period: BudgetPeriod;
    }) => budgetsApi.create(entityId!, body),
    onSuccess: invalidate,
  });
}

export function useUpdateBudget(entityId: string | undefined) {
  const invalidate = useInvalidateBudgets(entityId);
  return useMutation({
    mutationFn: ({ budgetId, amount }: { budgetId: string; amount: string }) =>
      budgetsApi.update(entityId!, budgetId, { amount }),
    onSuccess: invalidate,
  });
}

export function useDeleteBudget(entityId: string | undefined) {
  const invalidate = useInvalidateBudgets(entityId);
  return useMutation({
    mutationFn: (budgetId: string) => budgetsApi.remove(entityId!, budgetId),
    onSuccess: invalidate,
  });
}
