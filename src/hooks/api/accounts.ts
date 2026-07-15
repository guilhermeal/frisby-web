import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountsApi, currenciesApi } from "@/lib/api/endpoints";
import type { Account, EntityType } from "@/lib/api/types";
import { qk } from "./keys";

export function useAccounts(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.accounts(entityId ?? ""),
    queryFn: () => accountsApi.list(entityId!),
    enabled: !!entityId,
  });
}

export function useCurrencies() {
  return useQuery({
    queryKey: qk.currencies,
    queryFn: currenciesApi.list,
    staleTime: Infinity, // lista estática
  });
}

export function useCreateAccount(
  entityId: string | undefined,
  entityType: EntityType = "PERSONAL",
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Account> & { initialBalance?: string }) =>
      accountsApi.create(entityId!, body, entityType),
    onSuccess: () => {
      if (entityId) qc.invalidateQueries({ queryKey: qk.accounts(entityId) });
    },
  });
}

export function useUpdateAccount(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      ...body
    }: {
      accountId: string;
      name?: string;
      creditLimit?: string;
      closingDay?: number;
      dueDay?: number;
    }) => accountsApi.update(accountId, body),
    onSuccess: () => {
      if (entityId) qc.invalidateQueries({ queryKey: qk.accounts(entityId) });
    },
  });
}

export function useArchiveAccount(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) => accountsApi.archive(accountId),
    onSuccess: () => {
      if (entityId) qc.invalidateQueries({ queryKey: qk.accounts(entityId) });
    },
  });
}
