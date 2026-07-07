// Realistic seeded mock data for Frisby — household "Villa Bella 606"
// Money stored as integer cents STRINGS. Values follow the spec exactly.

import type { Currency } from "./money";

export type EntityType = "PERSONAL" | "COMPANY";
export type AccountType = "WALLET" | "BANK" | "INVESTMENT" | "CREDIT_CARD";
export type TxType = "INCOME" | "EXPENSE";
export type TxStatus = "PLANNED" | "SETTLED";
export type TxScope = "ENTITY" | "MEMBERS";

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  baseCurrency: Currency;
}

export interface Member {
  id: string;
  displayName: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  initials: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  ownerId: string;
  currency: Currency;
  balance: string; // cents
  // credit card
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

export interface Transaction {
  id: string;
  type: TxType;
  amount: string; // cents
  description: string;
  categoryId: string;
  accountId: string | null;
  competenceDate: string;
  status: TxStatus;
  scope: TxScope;
  shares?: { memberId: string; shareAmount: string }[];
  recurrence?: { interval: "MONTHLY" | "WEEKLY" | "YEARLY"; occurrences?: number };
  installment?: { number: number; total: number; groupId: string };
  cardInvoiceMonth?: string; // YYYY-MM for card purchases
}

export interface Invoice {
  id: string;
  cardId: string;
  month: string; // YYYY-MM
  closingDate: string;
  dueDate: string;
  status: "OPEN" | "CLOSED" | "PAID" | "PARTIAL";
  calculatedAmount: string;
  carriedBalance: string;
  purchases: { txId: string; description: string; amount: string; installment?: string }[];
  payments: { id: string; date: string; amount: string; payingAccountId: string }[];
}

// ---------- Seed ----------

export const currentEntity: Entity = {
  id: "e1",
  name: "Villa Bella 606",
  type: "PERSONAL",
  baseCurrency: "BRL",
};

export const entities: Entity[] = [
  currentEntity,
  { id: "e2", name: "Estúdio Frisby ME", type: "COMPANY", baseCurrency: "BRL" },
];

export const members: Member[] = [
  { id: "m1", displayName: "Marina", role: "OWNER", initials: "MA" },
  { id: "m2", displayName: "Rafael", role: "ADMIN", initials: "RA" },
];

export const accounts: Account[] = [
  {
    id: "a1",
    name: "Carteira",
    type: "WALLET",
    ownerId: "m1",
    currency: "BRL",
    balance: "18450",
  },
  {
    id: "a2",
    name: "Itaú Conta Corrente",
    type: "BANK",
    ownerId: "m1",
    currency: "BRL",
    balance: "845230",
  },
  {
    id: "a3",
    name: "Nubank",
    type: "BANK",
    ownerId: "m2",
    currency: "BRL",
    balance: "312800",
  },
  {
    id: "a4",
    name: "Tesouro Selic",
    type: "INVESTMENT",
    ownerId: "m1",
    currency: "BRL",
    balance: "2540000",
  },
  {
    id: "a5",
    name: "Hipercard",
    type: "CREDIT_CARD",
    ownerId: "m1",
    currency: "BRL",
    balance: "0",
    creditLimit: "500000",
    usedAmount: "48729",
    closingDay: 25,
    dueDay: 5,
  },
];

export const categories: Category[] = [
  { id: "c1", name: "Moradia", type: "EXPENSE", color: "#5B7CC2", icon: "home" },
  { id: "c2", name: "Alimentação", type: "EXPENSE", color: "#E8A33D", icon: "utensils" },
  { id: "c3", name: "Transporte", type: "EXPENSE", color: "#D2445A", icon: "car" },
  { id: "c4", name: "Educação", type: "EXPENSE", color: "#0EA5A0", icon: "book" },
  { id: "c5", name: "Lazer", type: "EXPENSE", color: "#8B5CF6", icon: "music" },
  { id: "c6", name: "Salário", type: "INCOME", color: "#2E9E6B", icon: "briefcase" },
  { id: "c7", name: "Rendimento", type: "INCOME", color: "#0EA5A0", icon: "trending-up" },
];

export const transactions: Transaction[] = [
  {
    id: "t1",
    type: "INCOME",
    amount: "980000",
    description: "Salário — Setembro",
    categoryId: "c6",
    accountId: "a2",
    competenceDate: "2026-09-05",
    status: "SETTLED",
    scope: "ENTITY",
  },
  {
    id: "t2",
    type: "EXPENSE",
    amount: "245000",
    description: "Aluguel Villa Bella",
    categoryId: "c1",
    accountId: "a2",
    competenceDate: "2026-09-10",
    status: "SETTLED",
    scope: "ENTITY",
    recurrence: { interval: "MONTHLY" },
  },
  {
    id: "t3",
    type: "EXPENSE",
    amount: "18790",
    description: "Feira orgânica",
    categoryId: "c2",
    accountId: "a3",
    competenceDate: "2026-09-12",
    status: "SETTLED",
    scope: "MEMBERS",
    shares: [
      { memberId: "m1", shareAmount: "9395" },
      { memberId: "m2", shareAmount: "9395" },
    ],
  },
  {
    id: "t4",
    type: "EXPENSE",
    amount: "12447",
    description: "Curso online de TypeScript (1/4)",
    categoryId: "c4",
    accountId: "a5",
    competenceDate: "2026-07-18",
    status: "SETTLED",
    scope: "ENTITY",
    installment: { number: 1, total: 4, groupId: "g-ts" },
    cardInvoiceMonth: "2026-07",
  },
  {
    id: "t5",
    type: "EXPENSE",
    amount: "12447",
    description: "Curso online de TypeScript (2/4)",
    categoryId: "c4",
    accountId: "a5",
    competenceDate: "2026-08-18",
    status: "SETTLED",
    scope: "ENTITY",
    installment: { number: 2, total: 4, groupId: "g-ts" },
    cardInvoiceMonth: "2026-08",
  },
  {
    id: "t6",
    type: "EXPENSE",
    amount: "12447",
    description: "Curso online de TypeScript (3/4)",
    categoryId: "c4",
    accountId: "a5",
    competenceDate: "2026-09-18",
    status: "PLANNED",
    scope: "ENTITY",
    installment: { number: 3, total: 4, groupId: "g-ts" },
    cardInvoiceMonth: "2026-09",
  },
  {
    id: "t7",
    type: "EXPENSE",
    amount: "12449",
    description: "Curso online de TypeScript (4/4)",
    categoryId: "c4",
    accountId: "a5",
    competenceDate: "2026-10-18",
    status: "PLANNED",
    scope: "ENTITY",
    installment: { number: 4, total: 4, groupId: "g-ts" },
    cardInvoiceMonth: "2026-10",
  },
  {
    id: "t8",
    type: "EXPENSE",
    amount: "36180",
    description: "Uber ao aeroporto",
    categoryId: "c3",
    accountId: "a5",
    competenceDate: "2026-09-14",
    status: "SETTLED",
    scope: "ENTITY",
    cardInvoiceMonth: "2026-09",
  },
  {
    id: "t9",
    type: "EXPENSE",
    amount: "8900",
    description: "Spotify Família",
    categoryId: "c5",
    accountId: null,
    competenceDate: "2026-09-20",
    status: "PLANNED",
    scope: "ENTITY",
    recurrence: { interval: "MONTHLY" },
  },
  {
    id: "t10",
    type: "INCOME",
    amount: "42150",
    description: "Rendimento Tesouro Selic",
    categoryId: "c7",
    accountId: "a4",
    competenceDate: "2026-09-01",
    status: "SETTLED",
    scope: "ENTITY",
  },
];

// July invoice — R$ 124,47 total, R$ 100,00 paid, R$ 24,47 carried
export const invoices: Invoice[] = [
  {
    id: "inv-jul",
    cardId: "a5",
    month: "2026-07",
    closingDate: "2026-07-25",
    dueDate: "2026-08-05",
    status: "PARTIAL",
    calculatedAmount: "12447",
    carriedBalance: "2447",
    purchases: [
      { txId: "t4", description: "Curso online de TypeScript", amount: "12447", installment: "1/4" },
    ],
    payments: [
      { id: "p1", date: "2026-08-05", amount: "10000", payingAccountId: "a2" },
    ],
  },
  {
    id: "inv-aug",
    cardId: "a5",
    month: "2026-08",
    closingDate: "2026-08-25",
    dueDate: "2026-09-05",
    status: "CLOSED",
    calculatedAmount: "14894", // 12447 + 2447 carried
    carriedBalance: "0",
    purchases: [
      { txId: "t5", description: "Curso online de TypeScript", amount: "12447", installment: "2/4" },
    ],
    payments: [
      { id: "p2", date: "2026-09-05", amount: "14894", payingAccountId: "a2" },
    ],
  },
  {
    id: "inv-sep",
    cardId: "a5",
    month: "2026-09",
    closingDate: "2026-09-25",
    dueDate: "2026-10-05",
    status: "OPEN",
    calculatedAmount: "48627", // 12447 + 36180
    carriedBalance: "0",
    purchases: [
      { txId: "t6", description: "Curso online de TypeScript", amount: "12447", installment: "3/4" },
      { txId: "t8", description: "Uber ao aeroporto", amount: "36180" },
    ],
    payments: [],
  },
];

// ---------- Derived helpers ----------

export function totalNetWorth(): string {
  // Sum of cash accounts (WALLET/BANK/INVESTMENT), cards excluded (they're liabilities tracked separately)
  return accounts
    .filter((a) => a.type !== "CREDIT_CARD")
    .reduce((acc, a) => (BigInt(acc) + BigInt(a.balance)).toString(), "0");
}

export function monthTotals(yearMonth: string): {
  income: string;
  expense: string;
  net: string;
  plannedIncome: string;
  plannedExpense: string;
} {
  let income = 0n, expense = 0n, plannedIncome = 0n, plannedExpense = 0n;
  for (const t of transactions) {
    if (!t.competenceDate.startsWith(yearMonth)) continue;
    const amt = BigInt(t.amount);
    if (t.status === "SETTLED") {
      if (t.type === "INCOME") income += amt;
      else expense += amt;
    } else {
      if (t.type === "INCOME") plannedIncome += amt;
      else plannedExpense += amt;
    }
  }
  return {
    income: income.toString(),
    expense: expense.toString(),
    net: (income - expense).toString(),
    plannedIncome: (income + plannedIncome).toString(),
    plannedExpense: (expense + plannedExpense).toString(),
  };
}

export const CURRENT_MONTH = "2026-09";

// Budget for the current month
export const monthlyBudget = { amount: "450000", used: monthTotals(CURRENT_MONTH).expense };

export function accountById(id: string | null): Account | undefined {
  return id ? accounts.find((a) => a.id === id) : undefined;
}
export function memberById(id: string): Member | undefined {
  return members.find((m) => m.id === id);
}
export function categoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}
