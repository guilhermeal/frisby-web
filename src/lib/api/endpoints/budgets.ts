// Orçamentos (/entities/:id/budgets) — limite de gasto por categoria EXPENSE,
// único por entidade+categoria+período. INFORMA, nunca bloqueia lançamento.
// O acompanhamento vem de /reports/budgets com percentUsed/status calculados
// pelo backend (não recalcular no front).

import { api } from "../client";
import type { Budget, BudgetPeriod, BudgetReportItem } from "../types";

interface ApiBudget {
  id: string;
  categoryId: string;
  amount: string;
  currency: string;
  period: BudgetPeriod;
  active: boolean;
  category?: { id: string; name: string };
}

function mapBudget(b: ApiBudget): Budget {
  return {
    id: b.id,
    categoryId: b.categoryId,
    categoryName: b.category?.name ?? "",
    amount: b.amount,
    currency: b.currency,
    period: b.period,
    active: b.active,
  };
}

export const budgetsApi = {
  list: async (entityId: string): Promise<Budget[]> => {
    const rows = await api.get<ApiBudget[]>(`/entities/${entityId}/budgets`);
    return rows.map(mapBudget);
  },
  create: async (
    entityId: string,
    body: { categoryId: string; amount: string; currency: string; period: BudgetPeriod },
  ): Promise<Budget> => {
    const created = await api.post<ApiBudget>(`/entities/${entityId}/budgets`, body);
    return mapBudget(created);
  },
  update: async (
    entityId: string,
    budgetId: string,
    body: { amount?: string; active?: boolean },
  ): Promise<Budget> => {
    const updated = await api.patch<ApiBudget>(`/entities/${entityId}/budgets/${budgetId}`, body);
    return mapBudget(updated);
  },
  remove: (entityId: string, budgetId: string) =>
    api.delete<void>(`/entities/${entityId}/budgets/${budgetId}`),
  /** Orçado vs realizado do mês (status ok/warning≥80%/exceeded do backend). */
  report: async (entityId: string, month: string): Promise<BudgetReportItem[]> => {
    const res = await api.get<{ baseCurrency: string; budgets: BudgetReportItem[] }>(
      `/entities/${entityId}/reports/budgets`,
      { month },
    );
    return res.budgets;
  },
};
