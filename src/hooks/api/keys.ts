// Query keys centralizadas — invalidações certeiras dependem de todo hook
// usar as keys daqui (nunca strings soltas).

import type { TransactionFilters } from "@/lib/api/types";

export const qk = {
  entities: ["entities"] as const,
  members: (entityId: string) => ["members", entityId] as const,
  roles: (entityId: string) => ["roles", entityId] as const,
  accounts: (entityId: string) => ["accounts", entityId] as const,
  categories: (entityId: string) => ["categories", entityId] as const,
  transactions: (filters: TransactionFilters) => ["transactions", filters] as const,
  recurrences: (entityId: string) => ["recurrences", entityId] as const,
  transfers: (entityId: string, filters: Record<string, string | undefined>) =>
    ["transfers", entityId, filters] as const,
  investments: (entityId: string) => ["investments", entityId] as const,
  cardInvoices: (cardId: string) => ["card-invoices", cardId] as const,
  cardLimit: (cardId: string) => ["card-limit", cardId] as const,
  upcomingInvoices: (cardId: string) => ["card-upcoming", cardId] as const,
  invoice: (id: string) => ["invoice", id] as const,
  currencies: ["currencies"] as const,
  budgets: (entityId: string) => ["budgets", "list", entityId] as const,
  budgetReport: (entityId: string, month: string) =>
    ["budgets", "report", entityId, month] as const,
  monthlyReport: (entityId: string, month: string) =>
    ["reports", "monthly", entityId, month] as const,
  cashflow: (entityId: string, months: number) =>
    ["reports", "cashflow", entityId, months] as const,
  byMember: (entityId: string, params: Record<string, string | undefined>) =>
    ["reports", "by-member", entityId, params] as const,
  recurringVsOneoff: (entityId: string, params: Record<string, string | undefined>) =>
    ["reports", "recurring-vs-oneoff", entityId, params] as const,
  plannedVsActual: (entityId: string, params: Record<string, string | undefined>) =>
    ["reports", "planned-vs-actual", entityId, params] as const,
  balances: (entityId: string) => ["reports", "balances", entityId] as const,
  netWorth: (entityId: string) => ["reports", "net-worth", entityId] as const,
  forecast: (entityId: string, params: Record<string, string | number | undefined>) =>
    ["reports", "forecast", entityId, params] as const,
  overview: ["reports", "overview"] as const,
  transactionAttachments: (transactionId: string) =>
    ["attachments", "transaction", transactionId] as const,
  invoicePaymentAttachments: (invoicePaymentId: string) =>
    ["attachments", "invoice-payment", invoicePaymentId] as const,
  // Jornada financeira (Sprint 5.0) — prefixo comum "journey" permite
  // invalidar tudo do domínio de uma vez (qc.invalidateQueries(["journey"])).
  masterGroups: (entityId: string) => ["journey", "master-groups", entityId] as const,
  unlinkedCategories: (entityId: string) => ["journey", "unlinked-categories", entityId] as const,
  flows: (entityId: string) => ["journey", "flows", entityId] as const,
  journeyStatus: (entityId: string) => ["journey", "status", entityId] as const,
  journeySnapshot: (entityId: string, month: string) =>
    ["journey", "snapshot", entityId, month] as const,
  journeyHistory: (entityId: string, months: number) =>
    ["journey", "history", entityId, months] as const,
  // Sonhos & Metas (Sprint 6.0/6.1).
  goals: (entityId: string) => ["goals", "list", entityId] as const,
  goal: (entityId: string, goalId: string) => ["goals", "detail", entityId, goalId] as const,
  goalsFeasibility: (entityId: string) => ["goals", "feasibility", entityId] as const,
};
