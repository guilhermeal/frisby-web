import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  installmentsApi,
  recurrencesApi,
  transactionsApi,
  type CreateInstallmentsBody,
  type CreateRecurrenceBody,
} from "@/lib/api/endpoints";
import type { Transaction, TransactionFilters } from "@/lib/api/types";
import { qk } from "./keys";

/**
 * Um lançamento afeta listas, saldos, faturas, relatórios, orçamentos e
 * alertas. Invalidação por PREFIXO de domínio — as keys são padronizadas
 * em ./keys.
 */
function invalidateTransactionDomains(qc: QueryClient, entityId?: string) {
  qc.invalidateQueries({ queryKey: ["transactions"] });
  qc.invalidateQueries({ queryKey: ["reports"] });
  qc.invalidateQueries({ queryKey: ["card-invoices"] });
  qc.invalidateQueries({ queryKey: ["invoice"] });
  qc.invalidateQueries({ queryKey: ["budgets"] });
  qc.invalidateQueries({ queryKey: ["alerts"] });
  if (entityId) qc.invalidateQueries({ queryKey: qk.accounts(entityId) });
  else qc.invalidateQueries({ queryKey: ["accounts"] });
}

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: qk.transactions(filters),
    queryFn: () => transactionsApi.list(filters),
    enabled: !!filters.entityId,
  });
}

export function useCreateTransaction(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Transaction>) => transactionsApi.create(entityId!, body),
    onSuccess: () => invalidateTransactionDomains(qc, entityId),
  });
}

export function useUpdateTransaction(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Transaction> }) =>
      transactionsApi.update(id, body),
    onSuccess: () => invalidateTransactionDomains(qc, entityId),
  });
}

export function useDeleteTransaction(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transactionsApi.remove(id),
    onSuccess: () => invalidateTransactionDomains(qc, entityId),
  });
}

export function useSettleTransaction(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      settlementDate: string;
      settledAmount?: string;
      accountId?: string;
      shares?: Array<{ memberId: string; shareAmount: string }>;
    }) => transactionsApi.settle(id, body),
    onSuccess: () => invalidateTransactionDomains(qc, entityId),
  });
}

export function useUnsettleTransaction(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transactionsApi.unsettle(id),
    onSuccess: () => invalidateTransactionDomains(qc, entityId),
  });
}

// ------- recorrências -------

export function useRecurrences(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.recurrences(entityId ?? ""),
    queryFn: () => recurrencesApi.list(entityId!),
    enabled: !!entityId,
  });
}

export function useCreateRecurrence(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRecurrenceBody) => recurrencesApi.create(entityId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.recurrences(entityId ?? "") });
      invalidateTransactionDomains(qc, entityId);
    },
  });
}

export function useStopRecurrence(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, fromDate }: { ruleId: string; fromDate?: string }) =>
      recurrencesApi.stop(entityId!, ruleId, fromDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.recurrences(entityId ?? "") });
      invalidateTransactionDomains(qc, entityId);
    },
  });
}

// ------- parcelamentos -------

export function useCreateInstallments(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInstallmentsBody) => installmentsApi.create(entityId!, body),
    onSuccess: () => invalidateTransactionDomains(qc, entityId),
  });
}

export function useCancelInstallments(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => installmentsApi.cancel(entityId!, groupId),
    onSuccess: () => invalidateTransactionDomains(qc, entityId),
  });
}
