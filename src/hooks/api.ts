// Hooks de dados. Todas as queries são keyed por entidade + parâmetros.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  accountsApi,
  cardsApi,
  categoriesApi,
  entitiesApi,
  membersApi,
  reportsApi,
  transactionsApi,
} from "@/lib/api/endpoints";
import type { Transaction, TransactionFilters } from "@/lib/api/types";

export const qk = {
  entities: ["entities"] as const,
  members: (entityId: string) => ["members", entityId] as const,
  accounts: (entityId: string) => ["accounts", entityId] as const,
  categories: (entityId: string) => ["categories", entityId] as const,
  transactions: (filters: TransactionFilters) => ["transactions", filters] as const,
  cardInvoices: (cardId: string) => ["card-invoices", cardId] as const,
  invoice: (id: string) => ["invoice", id] as const,
  monthlyReport: (entityId: string, month: string) =>
    ["reports", "monthly", entityId, month] as const,
  cashflow: (entityId: string, months: number) =>
    ["reports", "cashflow", entityId, months] as const,
};

export function useEntities() {
  return useQuery({ queryKey: qk.entities, queryFn: entitiesApi.list });
}

export function useMembers(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.members(entityId ?? ""),
    queryFn: () => membersApi.list(entityId!),
    enabled: !!entityId,
  });
}

export function useAccounts(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.accounts(entityId ?? ""),
    queryFn: () => accountsApi.list(entityId!),
    enabled: !!entityId,
  });
}

export function useCategories(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.categories(entityId ?? ""),
    queryFn: () => categoriesApi.list(entityId!),
    enabled: !!entityId,
  });
}

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: qk.transactions(filters),
    queryFn: () => transactionsApi.list(filters),
    enabled: !!filters.entityId,
  });
}

export function useCardInvoices(cardId: string | undefined) {
  return useQuery({
    queryKey: qk.cardInvoices(cardId ?? ""),
    queryFn: () => cardsApi.invoices(cardId!),
    enabled: !!cardId,
  });
}

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

// ------- mutations -------

export function useCreateTransaction(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Transaction>) => transactionsApi.create(entityId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      if (entityId) qc.invalidateQueries({ queryKey: qk.accounts(entityId) });
    },
  });
}

export function usePayInvoice(cardId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      invoiceId: string;
      amount: string;
      payingAccountId: string;
      date: string;
    }) =>
      cardsApi.payInvoice(payload.invoiceId, {
        amount: payload.amount,
        payingAccountId: payload.payingAccountId,
        date: payload.date,
      }),
    onSuccess: () => {
      if (cardId) qc.invalidateQueries({ queryKey: qk.cardInvoices(cardId) });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
