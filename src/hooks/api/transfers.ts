import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { investmentsApi, transfersApi, type CreateTransferBody } from "@/lib/api/endpoints";
import type { TransferKind, TxStatus } from "@/lib/api/types";
import { qk } from "./keys";

function invalidateTransferDomains(qc: QueryClient, entityId?: string) {
  qc.invalidateQueries({ queryKey: ["transfers"] });
  qc.invalidateQueries({ queryKey: ["investments"] });
  qc.invalidateQueries({ queryKey: ["reports"] });
  if (entityId) qc.invalidateQueries({ queryKey: qk.accounts(entityId) });
  else qc.invalidateQueries({ queryKey: ["accounts"] });
}

export function useTransfers(
  entityId: string | undefined,
  filters?: { kind?: TransferKind; status?: TxStatus },
) {
  return useQuery({
    queryKey: qk.transfers(entityId ?? "", filters ?? {}),
    queryFn: () => transfersApi.list(entityId!, filters),
    enabled: !!entityId,
  });
}

export function useCreateTransfer(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTransferBody) => transfersApi.create(entityId!, body),
    onSuccess: () => invalidateTransferDomains(qc, entityId),
  });
}

export function useSettleTransfer(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transferId: string) => transfersApi.settle(entityId!, transferId),
    onSuccess: () => invalidateTransferDomains(qc, entityId),
  });
}

export function useUnsettleTransfer(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transferId: string) => transfersApi.unsettle(entityId!, transferId),
    onSuccess: () => invalidateTransferDomains(qc, entityId),
  });
}

export function useDeleteTransfer(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transferId: string) => transfersApi.remove(entityId!, transferId),
    onSuccess: () => invalidateTransferDomains(qc, entityId),
  });
}

// ------- investimentos -------

export function useInvestmentsSummary(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.investments(entityId ?? ""),
    queryFn: () => investmentsApi.summary(entityId!),
    enabled: !!entityId,
  });
}

export function useRegisterYield(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      ...body
    }: {
      accountId: string;
      amount: string;
      date: string;
      description?: string;
    }) => investmentsApi.registerYield(accountId, body),
    onSuccess: () => {
      invalidateTransferDomains(qc, entityId);
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
