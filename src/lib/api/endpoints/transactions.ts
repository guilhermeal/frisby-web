// Lançamentos (/entities/:id/transactions, /transactions/:id) e os módulos
// irmãos de recorrência (/entities/:id/recurrences) e parcelamento
// (/entities/:id/installments) — no backend são recursos separados.

import { api } from "../client";
import type {
  RecurrenceRule,
  Transaction,
  TransactionBulkCategorizeSummary,
  TransactionBulkImportRow,
  TransactionBulkImportSummary,
  TransactionFilters,
  TxScope,
  TxType,
} from "../types";
import { dateOnly, mapTransaction, monthRange, type ApiTransaction } from "./mappers";

function toApiShares(shares: NonNullable<Transaction["shares"]>) {
  return shares.map((s) => ({ membershipId: s.memberId, shareAmount: s.shareAmount }));
}

export const transactionsApi = {
  list: async (filters: TransactionFilters): Promise<Transaction[]> => {
    const { entityId, month, type, status, q } = filters;
    const range = month ? monthRange(month) : undefined;
    const rows = await api.get<ApiTransaction[]>(`/entities/${entityId}/transactions`, {
      type,
      status,
      from: range?.from,
      to: range?.to,
      pageSize: 100,
    });
    // Invariante 6: pernas de transferência NUNCA aparecem como
    // despesa/receita — o backend as devolve na listagem, a UI filtra.
    const mapped = rows.filter((t) => t.transferId === null).map(mapTransaction);
    // O backend não tem busca textual; filtramos no client.
    if (q) {
      const needle = q.toLowerCase();
      return mapped.filter((t) => t.description.toLowerCase().includes(needle));
    }
    return mapped;
  },
  create: async (entityId: string, body: Partial<Transaction>): Promise<Transaction> => {
    const created = await api.post<ApiTransaction>(`/entities/${entityId}/transactions`, {
      type: body.type,
      accountId: body.accountId ?? undefined,
      categoryId: body.categoryId,
      amount: body.amount,
      description: body.description,
      payeeName: body.payeeName,
      competenceDate: body.competenceDate,
      status: body.status ?? "PLANNED",
      // O backend exige settlementDate quando SETTLED.
      ...(body.status === "SETTLED"
        ? { settlementDate: body.settlementDate ?? body.competenceDate }
        : {}),
      scope: body.scope ?? "ENTITY",
      ...(body.shares?.length ? { shares: toApiShares(body.shares) } : {}),
    });
    return mapTransaction(created);
  },
  update: async (id: string, body: Partial<Transaction>): Promise<Transaction> => {
    const updated = await api.patch<ApiTransaction>(`/transactions/${id}`, {
      description: body.description,
      payeeName: body.payeeName,
      categoryId: body.categoryId,
      accountId: body.accountId ?? undefined,
      amount: body.amount,
      competenceDate: body.competenceDate,
      scope: body.scope,
      ...(body.shares?.length ? { shares: toApiShares(body.shares) } : {}),
    });
    return mapTransaction(updated);
  },
  remove: (id: string) => api.delete<void>(`/transactions/${id}`),
  /**
   * Baixa (settle). settledAmount permite pagar valor diferente do previsto;
   * accountId é obrigatório se o lançamento não tem origem (e sobrescreve se
   * tem); shares reconcilia o rateio quando o valor mudou.
   */
  settle: async (
    id: string,
    body: {
      settlementDate: string;
      settledAmount?: string;
      accountId?: string;
      shares?: Array<{ memberId: string; shareAmount: string }>;
    },
  ): Promise<Transaction> => {
    const settled = await api.post<ApiTransaction>(`/transactions/${id}/settle`, {
      settlementDate: body.settlementDate,
      ...(body.settledAmount ? { settledAmount: body.settledAmount } : {}),
      ...(body.accountId ? { accountId: body.accountId } : {}),
      ...(body.shares?.length ? { shares: toApiShares(body.shares) } : {}),
    });
    return mapTransaction(settled);
  },
  /** Estorna: volta a PLANNED e reverte o saldo. */
  unsettle: async (id: string): Promise<Transaction> => {
    const tx = await api.post<ApiTransaction>(`/transactions/${id}/unsettle`, {});
    return mapTransaction(tx);
  },
  /**
   * Importação em massa de histórico (Sprint 4.6, Parte A) — cada linha vira
   * uma Transaction SETTLED independente. Resposta parcial: created/failed.
   */
  bulkImport: (
    entityId: string,
    body: {
      type: TxType;
      accountId: string;
      defaultCategoryId?: string;
      defaultScope: TxScope;
      rows: TransactionBulkImportRow[];
    },
  ): Promise<TransactionBulkImportSummary> =>
    api.post<TransactionBulkImportSummary>(`/entities/${entityId}/transactions/bulk`, body),
  /** Aplica a mesma categoria a N lançamentos de uma vez. Resposta parcial. */
  bulkCategorize: (
    entityId: string,
    body: { transactionIds: string[]; categoryId: string },
  ): Promise<TransactionBulkCategorizeSummary> =>
    api.patch<TransactionBulkCategorizeSummary>(
      `/entities/${entityId}/transactions/bulk-categorize`,
      body,
    ),
};

// ---------------------------------------------------------------------------
// Recorrências — shares em RATIO (0..1, soma exata = 1), diferente do rateio
// por valor dos lançamentos.
// ---------------------------------------------------------------------------

interface ApiRecurrenceRule {
  id: string;
  type: TxType;
  accountId: string | null;
  categoryId: string;
  amount: string;
  description: string | null;
  scope: TxScope;
  interval: "WEEKLY" | "MONTHLY" | "YEARLY";
  dayOfPeriod: number | null;
  startDate: string;
  occurrences: number | null;
  active: boolean;
}

function mapRule(r: ApiRecurrenceRule): RecurrenceRule {
  return {
    id: r.id,
    type: r.type,
    accountId: r.accountId,
    categoryId: r.categoryId,
    amount: r.amount,
    description: r.description ?? "",
    scope: r.scope,
    interval: r.interval,
    dayOfPeriod: r.dayOfPeriod,
    startDate: dateOnly(r.startDate),
    occurrences: r.occurrences,
    active: r.active,
  };
}

export interface CreateRecurrenceBody {
  type: TxType;
  accountId?: string;
  categoryId: string;
  amount: string;
  description?: string;
  scope: TxScope;
  shares?: Array<{ memberId: string; shareRatio: number }>;
  interval: "WEEKLY" | "MONTHLY" | "YEARLY";
  dayOfPeriod?: number;
  startDate: string;
  occurrences: number | null;
}

export const recurrencesApi = {
  list: async (entityId: string): Promise<RecurrenceRule[]> => {
    const rules = await api.get<ApiRecurrenceRule[]>(`/entities/${entityId}/recurrences`);
    return rules.map(mapRule);
  },
  create: async (entityId: string, body: CreateRecurrenceBody): Promise<RecurrenceRule> => {
    const created = await api.post<ApiRecurrenceRule>(`/entities/${entityId}/recurrences`, {
      ...body,
      shares: body.shares?.map((s) => ({ membershipId: s.memberId, shareRatio: s.shareRatio })),
    });
    return mapRule(created);
  },
  /** mode="this" edita só a ocorrência; "future" muda a regra dali em diante. */
  update: (
    entityId: string,
    ruleId: string,
    body: {
      mode: "this" | "future";
      fromDate: string;
      description?: string;
      amount?: string;
      categoryId?: string;
    },
  ) => api.patch<unknown>(`/entities/${entityId}/recurrences/${ruleId}`, body),
  stop: (entityId: string, ruleId: string, fromDate?: string) =>
    api.post<{ message: string }>(`/entities/${entityId}/recurrences/${ruleId}/stop`, {
      ...(fromDate ? { fromDate } : {}),
    }),
  /** Pula uma ocorrência PLANNED sem quebrar a série. */
  skipOccurrence: (entityId: string, ruleId: string, txId: string) =>
    api.delete<void>(`/entities/${entityId}/recurrences/${ruleId}/occurrences/${txId}`),
};

// ---------------------------------------------------------------------------
// Parcelamentos — módulo próprio; accountId é OBRIGATÓRIO (tipicamente cartão).
// O backend divide em centavos com o resto na última parcela.
// ---------------------------------------------------------------------------

export interface CreateInstallmentsBody {
  type: TxType;
  totalAmount: string;
  installmentTotal: number; // 2–60
  /** Opcional — default = data da compra (o backend resolve a fatura certa). */
  firstCompetenceDate?: string;
  accountId: string;
  categoryId: string;
  description?: string;
  /** Pagamento a terceiro — informativo, opcional. */
  payeeName?: string;
  scope: TxScope;
  shares?: Array<{ memberId: string; shareAmount: string }>;
}

export interface ResumeInstallmentsBody {
  accountId: string;
  categoryId: string;
  description?: string;
  installmentAmount: string;
  installmentTotal: number; // total original da compra, não a quantidade restante
  resumeFromNumber: number; // 1 <= resumeFromNumber <= installmentTotal
  nextCompetenceDate: string;
  scope: TxScope;
  shares?: Array<{ memberId: string; shareAmount: string }>;
}

export const installmentsApi = {
  create: async (
    entityId: string,
    body: CreateInstallmentsBody,
  ): Promise<{ installmentGroupId: string; transactions: Transaction[] }> => {
    const created = await api.post<{
      installmentGroupId: string;
      transactions: ApiTransaction[];
    }>(`/entities/${entityId}/installments`, {
      ...body,
      shares: body.shares?.length ? toApiShares(body.shares) : undefined,
    });
    return {
      installmentGroupId: created.installmentGroupId,
      transactions: created.transactions.map(mapTransaction),
    };
  },
  get: async (entityId: string, groupId: string): Promise<Transaction[]> => {
    const txs = await api.get<ApiTransaction[]>(`/entities/${entityId}/installments/${groupId}`);
    return txs.map(mapTransaction);
  },
  /** Cancela as parcelas futuras (PLANNED) do grupo; baixadas ficam. */
  cancel: (entityId: string, groupId: string) =>
    api.delete<{ cancelled: number; message: string }>(
      `/entities/${entityId}/installments/${groupId}/cancel`,
    ),
  /**
   * Continua um parcelamento que já estava em andamento antes de entrar no
   * sistema (Sprint 4.6, Parte C) — gera só as parcelas restantes, com um
   * installmentGroupId novo (as parcelas já pagas antes não aparecem no
   * histórico, não há o que linkar).
   */
  resume: async (
    entityId: string,
    body: ResumeInstallmentsBody,
  ): Promise<{ installmentGroupId: string; transactions: Transaction[] }> => {
    const created = await api.post<{
      installmentGroupId: string;
      transactions: ApiTransaction[];
    }>(`/entities/${entityId}/transactions/resume-installment`, {
      ...body,
      shares: body.shares?.length ? toApiShares(body.shares) : undefined,
    });
    return {
      installmentGroupId: created.installmentGroupId,
      transactions: created.transactions.map(mapTransaction),
    };
  },
};
