import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cardsApi } from "@/lib/api/endpoints";
import { qk } from "./keys";

export function useCardInvoices(cardId: string | undefined) {
  return useQuery({
    queryKey: qk.cardInvoices(cardId ?? ""),
    queryFn: () => cardsApi.invoices(cardId!),
    enabled: !!cardId,
  });
}

export function useInvoiceDetail(invoiceId: string | undefined) {
  return useQuery({
    queryKey: qk.invoice(invoiceId ?? ""),
    queryFn: () => cardsApi.invoice(invoiceId!),
    enabled: !!invoiceId,
  });
}

export function useCardLimit(cardId: string | undefined) {
  return useQuery({
    queryKey: qk.cardLimit(cardId ?? ""),
    queryFn: () => cardsApi.limit(cardId!),
    enabled: !!cardId,
  });
}

export function useUpcomingInvoices(cardId: string | undefined) {
  return useQuery({
    queryKey: qk.upcomingInvoices(cardId ?? ""),
    queryFn: () => cardsApi.upcoming(cardId!),
    enabled: !!cardId,
  });
}

function useInvalidateCard(cardId: string | undefined) {
  const qc = useQueryClient();
  return () => {
    if (cardId) {
      qc.invalidateQueries({ queryKey: qk.cardInvoices(cardId) });
      qc.invalidateQueries({ queryKey: qk.cardLimit(cardId) });
      qc.invalidateQueries({ queryKey: qk.upcomingInvoices(cardId) });
    }
    qc.invalidateQueries({ queryKey: ["invoice"] });
    qc.invalidateQueries({ queryKey: ["accounts"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: ["alerts"] });
  };
}

export function usePayInvoice(cardId: string | undefined) {
  const invalidate = useInvalidateCard(cardId);
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
    onSuccess: invalidate,
  });
}

export function useCloseInvoice(cardId: string | undefined) {
  const invalidate = useInvalidateCard(cardId);
  return useMutation({
    mutationFn: (invoiceId: string) => cardsApi.closeInvoice(cardId!, invoiceId),
    onSuccess: invalidate,
  });
}

/** Get-or-create a fatura do ciclo de hoje — para quando o cartão ainda não tem nenhuma OPEN. */
export function useCreateCurrentInvoice(cardId: string | undefined) {
  const invalidate = useInvalidateCard(cardId);
  return useMutation({
    mutationFn: () => cardsApi.currentInvoice(cardId!),
    onSuccess: invalidate,
  });
}
