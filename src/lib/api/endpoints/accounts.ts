// Contas (/me/accounts para pessoais, /entities/:id/accounts para empresa).

import { api } from "../client";
import type { Account, EntityType } from "../types";
import { mapAccount, type ApiAccount } from "./mappers";

export const accountsApi = {
  list: async (entityId: string): Promise<Account[]> => {
    const accounts = await api.get<ApiAccount[]>(`/entities/${entityId}/accounts`);
    return accounts.map(mapAccount);
  },
  /**
   * Contas pessoais são criadas em /me/accounts (o backend as agrega por
   * entidade). Contas de empresa vão em /entities/:id/accounts.
   */
  create: async (
    entityId: string,
    body: Partial<Account> & { initialBalance?: string },
    entityType: EntityType = "PERSONAL",
  ): Promise<Account> => {
    const payload = {
      name: body.name,
      type: body.type,
      currency: body.currency ?? "BRL",
      initialBalance: body.initialBalance ?? body.balance ?? "0",
      ...(body.type === "CREDIT_CARD"
        ? {
            creditLimit: body.creditLimit,
            statementClosingDay: body.closingDay,
            dueDay: body.dueDay,
          }
        : {}),
    };
    const path = entityType === "COMPANY" ? `/entities/${entityId}/accounts` : "/me/accounts";
    const created = await api.post<ApiAccount>(path, payload);
    return mapAccount(created);
  },
  /** Só contas PESSOAIS do próprio usuário (o backend edita via /me/accounts). */
  update: async (
    accountId: string,
    body: { name?: string; creditLimit?: string; closingDay?: number; dueDay?: number },
  ): Promise<Account> => {
    const updated = await api.patch<ApiAccount>(`/me/accounts/${accountId}`, {
      name: body.name,
      creditLimit: body.creditLimit,
      statementClosingDay: body.closingDay,
      dueDay: body.dueDay,
    });
    return mapAccount(updated);
  },
  /** Arquiva (soft): com movimento exige saldo zero e fatura sem aberto. */
  archive: (accountId: string) => api.delete<void>(`/me/accounts/${accountId}`),
};

// ---------------------------------------------------------------------------
// Moedas (público) — para pickers.
// ---------------------------------------------------------------------------

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

export const currenciesApi = {
  list: () => api.get<CurrencyInfo[]>("/currencies", undefined, { anonymous: true }),
};
