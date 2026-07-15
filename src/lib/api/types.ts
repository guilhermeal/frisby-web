// Tipos de domínio compartilhados entre client e servidor.
// Valores monetários chegam como STRING (centavos). Nunca converter para float.

import type { Currency } from "../money";

export type { Currency };

export type EntityType = "PERSONAL" | "COMPANY";
export type AccountType = "WALLET" | "BANK" | "INVESTMENT" | "CREDIT_CARD";
export type TxType = "INCOME" | "EXPENSE";
export type TxStatus = "PLANNED" | "SETTLED";
export type TxScope = "ENTITY" | "MEMBERS";
export type MemberRole = "OWNER" | "PROVIDER" | "ADMIN" | "MEMBER" | "VIEWER" | "FINANCE";
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
  /** O backend não expõe moeda por entidade; a UI usa fallback "BRL". */
  baseCurrency?: Currency;
}

export interface Member {
  /** id da MEMBERSHIP (usado em rateios), não do usuário. */
  id: string;
  userId: string;
  displayName: string;
  email: string;
  role: MemberRole;
  roleId: string;
  roleName: string;
  initials: string;
}

export interface Role {
  id: string;
  name: string;
  type: MemberRole;
  permissions: Record<string, boolean>;
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
  /** null = categoria raiz; string = subcategoria (árvore de 1 nível). */
  parentId: string | null;
  /** Categorias de sistema só podem ser renomeadas. */
  isSystem: boolean;
}

export interface RecurrenceRule {
  id: string;
  type: TxType;
  accountId: string | null;
  categoryId: string;
  amount: string;
  description: string;
  scope: TxScope;
  interval: "WEEKLY" | "MONTHLY" | "YEARLY";
  dayOfPeriod: number | null;
  startDate: string; // YYYY-MM-DD
  occurrences: number | null; // null = contínua
  active: boolean;
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
  /** id da RecurrenceRule no backend — permite link "gerenciar recorrência". */
  ruleId?: string;
}

export interface Transaction {
  id: string;
  type: TxType;
  amount: string;
  description: string;
  /** Pagamento a terceiro (ex.: "paguei a Fulano") — informativo, opcional. */
  payeeName?: string;
  categoryId: string;
  accountId: string | null;
  competenceDate: string;
  /** Data da baixa (só em SETTLED). */
  settlementDate?: string;
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

// O backend (financial/server) devolve tokens em camelCase e NÃO inclui o
// usuário no login — o client busca GET /me logo em seguida.
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type LoginResponse = AuthTokens;

// ---- transferências e investimentos ----

export type TransferKind = "GENERIC" | "CONTRIBUTION" | "WITHDRAWAL";

export interface Transfer {
  id: string;
  kind: TransferKind;
  fromAccountId: string;
  toAccountId: string;
  fromAmount: string;
  fromCurrency: string;
  toAmount: string;
  toCurrency: string;
  exchangeRate: string | null;
  date: string; // YYYY-MM-DD
  status: TxStatus;
  description: string;
}

export interface InvestmentAccountSummary {
  accountId: string;
  accountName: string;
  currency: string;
  currentBalance: string;
  currentBalanceBase: string;
  totalContributions: string;
  totalWithdrawals: string;
  totalYield: string;
  simpleReturnPct: number;
}

export interface InvestmentsSummary {
  baseCurrency: string;
  accounts: InvestmentAccountSummary[];
  consolidated: {
    totalContributions: string;
    totalWithdrawals: string;
    totalYield: string;
    currentBalance: string;
  };
}

// ---- orçamentos ----

export type BudgetPeriod = "MONTHLY" | "YEARLY";

export interface Budget {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: string;
  currency: string;
  period: BudgetPeriod;
  active: boolean;
}

export interface BudgetReportItem {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  period: BudgetPeriod;
  budgetAmount: string;
  currency: string;
  spentSettled: string;
  spentPlanned: string;
  remaining: string;
  percentUsed: number;
  status: "ok" | "warning" | "exceeded";
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

export interface ByMemberReport {
  members: Array<{
    membershipId: string;
    name: string;
    income: string;
    expense: string;
    net: string;
  }>;
  entity: { income: string; expense: string; net: string };
}

export interface RecurringVsOneoffReport {
  recurring: { total: string; byCategory: Array<{ categoryId: string; total: string }> };
  oneoff: { total: string; byCategory: Array<{ categoryId: string; total: string }> };
}

export interface PlannedVsActualPoint {
  period: string;
  planned: string;
  actual: string;
  variance: string;
}

export interface BalancesReport {
  total: string;
  byType: Array<{
    type: AccountType;
    subtotal: string;
    accounts: Array<{
      id: string;
      name: string;
      type: AccountType;
      currency: string;
      balance: string;
      balanceBase: string;
    }>;
  }>;
}

export interface NetWorthReport {
  assets: string;
  liabilities: string;
  netWorth: string;
}

export interface ForecastCategory {
  categoryId: string;
  committed: string;
  estimated: string;
  total: string;
}

export interface ForecastReport {
  horizon: number;
  lookback: number;
  months: Array<{ month: string; categories: ForecastCategory[]; total: string }>;
}

export interface OverviewReport {
  entities: Array<{
    entityId: string;
    entityName: string;
    entityType: EntityType;
    assets: string;
    liabilities: string;
    netWorth: string;
  }>;
  total: { assets: string; liabilities: string; netWorth: string };
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
