// Transferências (/entities/:id/transfers) — movem dinheiro entre contas e
// NUNCA são despesa/receita (invariante 6). Aporte/resgate de investimento
// são transferências (kind); rendimento é receita real (yields).
// ATENÇÃO: settle/unsettle ficam SEMPRE sob /entities/:entityId/ (não existe
// rota /transfers/:id na raiz do backend).

import { api } from "../client";
import type { InvestmentsSummary, Transfer, TransferKind, TxStatus } from "../types";
import { dateOnly } from "./mappers";

interface ApiTransfer {
  id: string;
  entityId: string;
  toEntityId?: string | null;
  kind: TransferKind;
  fromAccountId: string;
  toAccountId: string;
  /** Só presente na listagem (GET /) — nome sempre visível, mesmo sem account.viewOthers. */
  fromAccountName?: string;
  toAccountName?: string;
  fromAmount: string;
  fromCurrency: string;
  toAmount: string;
  toCurrency: string;
  exchangeRate: string | null;
  date: string;
  status: TxStatus;
  description: string | null;
}

function mapTransfer(t: ApiTransfer): Transfer {
  return {
    id: t.id,
    entityId: t.entityId,
    toEntityId: t.toEntityId ?? undefined,
    kind: t.kind,
    fromAccountId: t.fromAccountId,
    toAccountId: t.toAccountId,
    fromAccountName: t.fromAccountName ?? "",
    toAccountName: t.toAccountName ?? "",
    fromAmount: t.fromAmount,
    fromCurrency: t.fromCurrency,
    toAmount: t.toAmount,
    toCurrency: t.toCurrency,
    exchangeRate: t.exchangeRate,
    date: dateOnly(t.date),
    status: t.status,
    description: t.description ?? "",
  };
}

export interface CreateTransferBody {
  kind?: TransferKind;
  fromAccountId: string;
  toAccountId: string;
  fromAmount: string;
  /** Obrigatório quando as moedas diferem. */
  toAmount?: string;
  date: string;
  status: TxStatus;
  description?: string;
  /** Presente = transferência cross-entity; usuário precisa ser membro desta entidade também. */
  toEntityId?: string;
}

export const transfersApi = {
  list: async (
    entityId: string,
    filters?: { kind?: TransferKind; status?: TxStatus; from?: string; to?: string },
  ): Promise<Transfer[]> => {
    const rows = await api.get<ApiTransfer[]>(`/entities/${entityId}/transfers`, filters);
    return rows.map(mapTransfer);
  },
  create: async (entityId: string, body: CreateTransferBody): Promise<Transfer> => {
    const created = await api.post<ApiTransfer>(`/entities/${entityId}/transfers`, body);
    return mapTransfer(created);
  },
  settle: async (entityId: string, transferId: string): Promise<Transfer> => {
    const t = await api.post<ApiTransfer>(
      `/entities/${entityId}/transfers/${transferId}/settle`,
      {},
    );
    return mapTransfer(t);
  },
  unsettle: async (entityId: string, transferId: string): Promise<Transfer> => {
    const t = await api.post<ApiTransfer>(
      `/entities/${entityId}/transfers/${transferId}/unsettle`,
      {},
    );
    return mapTransfer(t);
  },
  remove: (entityId: string, transferId: string) =>
    api.delete<void>(`/entities/${entityId}/transfers/${transferId}`),
};

// ---------------------------------------------------------------------------
// Investimentos — rendimento (INCOME real) e resumo consolidado.
// ---------------------------------------------------------------------------

export const investmentsApi = {
  /** Registra rendimento: INCOME SETTLED na categoria de sistema "Rendimentos". */
  registerYield: (
    investmentAccountId: string,
    body: { amount: string; date: string; description?: string },
  ) => api.post<unknown>(`/accounts/${investmentAccountId}/yields`, body),
  summary: (entityId: string, range?: { from?: string; to?: string }) =>
    api.get<InvestmentsSummary>(`/entities/${entityId}/investments/summary`, range),
};
