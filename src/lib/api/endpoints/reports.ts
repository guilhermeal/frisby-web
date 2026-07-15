// Relatórios (/entities/:id/reports/*) — o backend não tem /reports/monthly;
// compomos a partir de /reports/cashflow (SETTLED + PLANNED) e /reports/by-category.

import { api } from "../client";
import type {
  BalancesReport,
  ByMemberReport,
  CashflowPoint,
  ForecastReport,
  MonthlyReport,
  NetWorthReport,
  OverviewReport,
  PlannedVsActualPoint,
  RecurringVsOneoffReport,
} from "../types";
import {
  FALLBACK_COLOR,
  lastMonths,
  monthRange,
  type ApiByCategoryResponse,
  type ApiCashflowResponse,
} from "./mappers";

export const reportsApi = {
  monthly: async (entityId: string, month: string): Promise<MonthlyReport> => {
    const { from, to } = monthRange(month);
    const base = `/entities/${entityId}/reports`;
    const [settled, planned, byCategory] = await Promise.all([
      api.get<ApiCashflowResponse>(`${base}/cashflow`, {
        granularity: "month",
        status: "SETTLED",
        from,
        to,
      }),
      api.get<ApiCashflowResponse>(`${base}/cashflow`, {
        granularity: "month",
        status: "PLANNED",
        from,
        to,
      }),
      api.get<ApiByCategoryResponse>(`${base}/by-category`, {
        type: "EXPENSE",
        status: "SETTLED",
        from,
        to,
      }),
    ]);

    const s = settled.buckets.find((b) => b.period === month);
    const p = planned.buckets.find((b) => b.period === month);

    return {
      income: s?.income ?? "0",
      expense: s?.expense ?? "0",
      plannedIncome: p?.income ?? "0",
      plannedExpense: p?.expense ?? "0",
      net: s?.net ?? "0",
      byCategory: byCategory.categories.map((c) => ({
        categoryId: c.id,
        name: c.name,
        color: c.color ?? FALLBACK_COLOR,
        value: c.total,
      })),
    };
  },

  cashflow: async (entityId: string, months = 5): Promise<CashflowPoint[]> => {
    const keys = lastMonths(months);
    const from = `${keys[0]}-01`;
    const { to } = monthRange(keys[keys.length - 1]);
    const base = `/entities/${entityId}/reports`;

    const [settled, planned] = await Promise.all([
      api.get<ApiCashflowResponse>(`${base}/cashflow`, {
        granularity: "month",
        status: "SETTLED",
        from,
        to,
      }),
      api.get<ApiCashflowResponse>(`${base}/cashflow`, {
        granularity: "month",
        status: "PLANNED",
        from,
        to,
      }),
    ]);

    const settledByMonth = new Map(settled.buckets.map((b) => [b.period, b.net]));
    const plannedByMonth = new Map(planned.buckets.map((b) => [b.period, b.net]));

    return keys.map((month) => ({
      month,
      realizado: settledByMonth.get(month) ?? "0",
      previsto: plannedByMonth.get(month) ?? "0",
    }));
  },

  byMember: (entityId: string, params?: { from?: string; to?: string; status?: string }) =>
    api.get<ByMemberReport>(`/entities/${entityId}/reports/by-member`, params),

  recurringVsOneoff: (entityId: string, params?: { from?: string; to?: string; status?: string }) =>
    api.get<RecurringVsOneoffReport>(`/entities/${entityId}/reports/recurring-vs-oneoff`, params),

  plannedVsActual: async (
    entityId: string,
    params?: { from?: string; to?: string; granularity?: string },
  ): Promise<PlannedVsActualPoint[]> => {
    const res = await api.get<{ buckets: PlannedVsActualPoint[] }>(
      `/entities/${entityId}/reports/planned-vs-actual`,
      params,
    );
    return res.buckets;
  },

  balances: (entityId: string) => api.get<BalancesReport>(`/entities/${entityId}/reports/balances`),

  netWorth: (entityId: string) =>
    api.get<NetWorthReport>(`/entities/${entityId}/reports/net-worth`),

  forecast: (entityId: string, params?: { horizon?: number; lookback?: number; type?: string }) =>
    api.get<ForecastReport>(`/entities/${entityId}/forecast`, params),

  overview: () => api.get<OverviewReport>("/me/overview"),
};
