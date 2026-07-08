// Endpoints agrupados por domínio. Se sua API usa outros caminhos, mude AQUI
// (o resto da UI não precisa mudar). Veja API-CONTRACT.md para o resumo.

import { api } from "./client";
import type {
  Account,
  CashflowPoint,
  Category,
  Entity,
  Invoice,
  LoginResponse,
  Member,
  MonthlyReport,
  Transaction,
  TransactionFilters,
  User,
} from "./types";

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/auth/login", { email, password }, { anonymous: true }),
  logout: () => api.post<void>("/auth/logout", {}),
  me: () => api.get<User>("/auth/me"),
};

export const entitiesApi = {
  list: () => api.get<Entity[]>("/entities"),
};

export const membersApi = {
  list: (entityId: string) => api.get<Member[]>("/members", { entityId }),
};

export const accountsApi = {
  list: (entityId: string) => api.get<Account[]>("/accounts", { entityId }),
  create: (entityId: string, body: Partial<Account>) =>
    api.post<Account>("/accounts", { ...body, entityId }),
};

export const categoriesApi = {
  list: (entityId: string) => api.get<Category[]>("/categories", { entityId }),
};

export const transactionsApi = {
  list: (filters: TransactionFilters) =>
    api.get<Transaction[]>("/transactions", filters as Record<string, string | undefined>),
  create: (entityId: string, body: Partial<Transaction>) =>
    api.post<Transaction>("/transactions", { ...body, entityId }),
  update: (id: string, body: Partial<Transaction>) =>
    api.patch<Transaction>(`/transactions/${id}`, body),
  remove: (id: string) => api.delete<void>(`/transactions/${id}`),
};

export const cardsApi = {
  invoices: (cardId: string) => api.get<Invoice[]>(`/cards/${cardId}/invoices`),
  invoice: (invoiceId: string) => api.get<Invoice>(`/invoices/${invoiceId}`),
  payInvoice: (
    invoiceId: string,
    body: { amount: string; payingAccountId: string; date: string },
  ) => api.post<Invoice>(`/invoices/${invoiceId}/payments`, body),
};

export const reportsApi = {
  monthly: (entityId: string, month: string) =>
    api.get<MonthlyReport>("/reports/monthly", { entityId, month }),
  cashflow: (entityId: string, months = 5) =>
    api.get<CashflowPoint[]>("/reports/cashflow", { entityId, months }),
};
