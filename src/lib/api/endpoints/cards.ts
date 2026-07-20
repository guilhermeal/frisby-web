// Cartões e faturas (/accounts/:cardId/invoices, /invoices/:id).

import { api } from "../client";
import type { Invoice } from "../types";
import { mapInvoice, mapPayment, type ApiInvoice, type ApiInvoiceDetail } from "./mappers";

export const cardsApi = {
  invoices: async (cardId: string): Promise<Invoice[]> => {
    const invoices = await api.get<ApiInvoice[]>(`/accounts/${cardId}/invoices`);
    return invoices.map((i) => mapInvoice(i));
  },
  invoice: async (invoiceId: string): Promise<Invoice> => {
    const detail = await api.get<ApiInvoiceDetail>(`/invoices/${invoiceId}`);
    const mapped = mapInvoice(detail, detail.transactions ?? []);
    mapped.payments = (detail.payments ?? []).map(mapPayment);
    return mapped;
  },
  /** O backend retorna o InvoicePayment criado (não a fatura) — usamos só o id, para anexar comprovante. */
  payInvoice: async (
    invoiceId: string,
    body: { amount: string; payingAccountId: string; date: string },
  ): Promise<{ invoicePaymentId: string }> => {
    const payment = await api.post<{ id: string }>(`/invoices/${invoiceId}/payments`, {
      payingAccountId: body.payingAccountId,
      settledAmount: body.amount,
      paymentDate: body.date,
    });
    return { invoicePaymentId: payment.id };
  },
  /** Limite disponível — compra acima do limite não bloqueia, só avisa. */
  limit: (cardId: string) =>
    api.get<{
      creditLimit: string;
      usedAmount: string;
      availableLimit: string;
      overLimit: boolean;
    }>(`/accounts/${cardId}/limit`),
  /** Faturas FUTURAS projetadas pelas parcelas (marcar como projeção na UI). */
  upcoming: async (
    cardId: string,
  ): Promise<Array<{ month: string; projectedTotal: string; transactionCount: number }>> => {
    const rows = await api.get<
      Array<{ referenceMonth: string; projectedTotal: string; transactionCount: number }>
    >(`/accounts/${cardId}/invoices/upcoming`);
    return rows.map((r) => ({
      month: r.referenceMonth.slice(0, 7),
      projectedTotal: r.projectedTotal,
      transactionCount: r.transactionCount,
    }));
  },
  /** Fechamento manual: OPEN→CLOSED, calculado congela, próxima fatura abre. */
  closeInvoice: async (cardId: string, invoiceId: string): Promise<Invoice> => {
    const closed = await api.post<ApiInvoice>(
      `/accounts/${cardId}/invoices/${invoiceId}/close`,
      {},
    );
    return mapInvoice(closed);
  },
  /** Get-or-create a fatura do ciclo de hoje — usado quando não existe nenhuma OPEN ainda. */
  currentInvoice: async (cardId: string): Promise<Invoice> => {
    const invoice = await api.post<ApiInvoice>(`/accounts/${cardId}/invoices/current`, {});
    return mapInvoice(invoice);
  },
};
