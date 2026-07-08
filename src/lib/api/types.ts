// Tipos de domínio compartilhados entre client e servidor.
// Valores monetários chegam como STRING (centavos). Nunca converter para float.

import type { Currency } from "../money";

export type { Currency };

export type EntityType = "PERSONAL" | "COMPANY";
export type AccountType = "WALLET" | "BANK" | "INVESTMENT" | "CREDIT_CARD";
export type TxType = "INCOME" | "EXPENSE";
export type TxStatus = "PLANNED" | "SETTLED";
export type TxScope = "ENTITY" | "MEMBERS";
export type MemberRole = "OWNER" | "ADMIN" | "MEMBER";
export type InvoiceStatus = "OPEN" | "CLOSED" | "PAID" | "PARTIAL";

export interface User {
  id: string;
  name: string;
  email: string;
  initials?: string;
}

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  baseCurrency: Currency;
}

export interface Member {
  id: string;
  displayName: string;
  role: MemberRole;
  initials: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  ownerId: string;
  currency: Currency;
  balance: string;
  creditLimit?: string;
  usedAmount?: string;
  closingDay?: number;
  dueDay?: number;
}

export interface Category {
  id: string;
  name: string;
  type: TxType;
  color: string;
  icon: string;
}

export interface TransactionShare {
  memberId: string;
  shareAmount: string;
}

export interface TransactionInstallment {
  number: number;
  total: number;
  groupId: string;
}

export interface TransactionRecurrence {
  interval: "MONTHLY" | "WEEKLY" | "YEARLY";
  occurrences?: number;
}

export interface Transaction {
  id: string;
  type: TxType;
  amount: string;
  description: string;
  categoryId: string;
  accountId: string | null;
  competenceDate: string;
  status: TxStatus;
  scope: TxScope;
  shares?: TransactionShare[];
  recurrence?: TransactionRecurrence;
  installment?: TransactionInstallment;
  cardInvoiceMonth?: string;
}

export interface InvoicePurchase {
  txId: string;
  description: string;
  amount: string;
  installment?: string;
}

export interface InvoicePayment {
  id: string;
  date: string;
  amount: string;
  payingAccountId: string;
}

export interface Invoice {
  id: string;
  cardId: string;
  month: string;
  closingDate: string;
  dueDate: string;
  status: InvoiceStatus;
  calculatedAmount: string;
  carriedBalance: string;
  purchases: InvoicePurchase[];
  payments: InvoicePayment[];
}

// ---- respostas de auth ----

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

// ---- respostas de relatórios ----

export interface MonthlyReport {
  income: string;
  expense: string;
  plannedIncome: string;
  plannedExpense: string;
  net: string;
  byCategory: Array<{ categoryId: string; name: string; color: string; value: string }>;
}

export interface CashflowPoint {
  month: string; // "2026-09"
  realizado: string;
  previsto: string;
}

// ---- filtros ----

export interface TransactionFilters {
  entityId?: string;
  month?: string;
  type?: TxType;
  status?: TxStatus;
  q?: string;
}

// ---- erros ----

export interface ApiErrorShape {
  code?: string;
  message: string;
  details?: unknown;
}
