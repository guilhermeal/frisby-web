import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api/endpoints";
import { qk } from "./keys";

export function useMonthlyReport(entityId: string | undefined, month: string) {
  return useQuery({
    queryKey: qk.monthlyReport(entityId ?? "", month),
    queryFn: () => reportsApi.monthly(entityId!, month),
    enabled: !!entityId,
  });
}

export function useCashflow(entityId: string | undefined, months = 5) {
  return useQuery({
    queryKey: qk.cashflow(entityId ?? "", months),
    queryFn: () => reportsApi.cashflow(entityId!, months),
    enabled: !!entityId,
  });
}

export function useByMemberReport(
  entityId: string | undefined,
  params?: { from?: string; to?: string; status?: string },
) {
  return useQuery({
    queryKey: qk.byMember(entityId ?? "", params ?? {}),
    queryFn: () => reportsApi.byMember(entityId!, params),
    enabled: !!entityId,
  });
}

export function useRecurringVsOneoffReport(
  entityId: string | undefined,
  params?: { from?: string; to?: string; status?: string },
) {
  return useQuery({
    queryKey: qk.recurringVsOneoff(entityId ?? "", params ?? {}),
    queryFn: () => reportsApi.recurringVsOneoff(entityId!, params),
    enabled: !!entityId,
  });
}

export function usePlannedVsActualReport(
  entityId: string | undefined,
  params?: { from?: string; to?: string; granularity?: string },
) {
  return useQuery({
    queryKey: qk.plannedVsActual(entityId ?? "", params ?? {}),
    queryFn: () => reportsApi.plannedVsActual(entityId!, params),
    enabled: !!entityId,
  });
}

export function useBalancesReport(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.balances(entityId ?? ""),
    queryFn: () => reportsApi.balances(entityId!),
    enabled: !!entityId,
  });
}

export function useNetWorthReport(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.netWorth(entityId ?? ""),
    queryFn: () => reportsApi.netWorth(entityId!),
    enabled: !!entityId,
  });
}

export function useForecast(
  entityId: string | undefined,
  params?: { horizon?: number; lookback?: number; type?: string },
) {
  return useQuery({
    queryKey: qk.forecast(entityId ?? "", params ?? {}),
    queryFn: () => reportsApi.forecast(entityId!, params),
    enabled: !!entityId,
  });
}

export function useOverview() {
  return useQuery({
    queryKey: qk.overview,
    queryFn: () => reportsApi.overview(),
  });
}
