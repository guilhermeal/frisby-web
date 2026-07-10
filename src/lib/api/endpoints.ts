// Endpoints agrupados por domínio, adaptados ao backend real (financial/server).
// O backend usa caminhos aninhados (/entities/:id/...) e shapes próprios
// (Prisma). Este módulo traduz caminhos E shapes para os tipos de domínio
// da UI (ver types.ts) — o resto do app não conhece o backend.

import { api } from "./client";
import type {
  Account,
  AccountType,
  AuthTokens,
  CashflowPoint,
  Category,
  Entity,
  EntityType,
  Invoice,
  InvoiceStatus,
  MemberRole,
  Member,
  MonthlyReport,
  Transaction,
  TransactionFilters,
  TxScope,
  TxStatus,
  TxType,
  User,
} from "./types";

const FALLBACK_COLOR = "#6B7B77";

// ---------------------------------------------------------------------------
// Shapes crus do backend (somente os campos que consumimos)
// ---------------------------------------------------------------------------

interface ApiMembership {
  id: string;
  displayName: string | null;
  user: { id: string; name: string; email: string };
  role: { id: string; name: string; type: MemberRole };
}

interface ApiAccount {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  ownerUserId: string | null;
  ownerEntityId: string | null;
  currentBalance: string;
  creditLimit: string | null;
  statementClosingDay: number | null;
  dueDay: number | null;
}

interface ApiCategory {
  id: string;
  name: string;
  type: TxType;
  color: string | null;
  icon: string | null;
  children?: ApiCategory[];
}

interface ApiTxShare {
  membershipId: string;
  shareAmount: string;
}

interface ApiTransaction {
  id: string;
  type: TxType;
  amount: string;
  description: string | null;
  categoryId: string | null;
  accountId: string | null;
  competenceDate: string; // ISO DateTime
  status: TxStatus;
  scope: TxScope;
  shares?: ApiTxShare[];
  recurrenceRuleId: string | null;
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
}

interface ApiInvoicePayment {
  id: string;
  paymentDate: string;
  settledAmount: string;
  payingAccountId: string;
}

interface ApiInvoice {
  id: string;
  accountId: string;
  referenceMonth: string; // ISO DateTime
  closingDate: string;
  dueDate: string;
  status: InvoiceStatus;
  calculatedAmount: string;
  carriedBalance: string;
  invoicePayments?: ApiInvoicePayment[];
}

interface ApiInvoiceDetail extends ApiInvoice {
  transactions: ApiTransaction[];
  payments: ApiInvoicePayment[];
}

interface ApiCashflowResponse {
  baseCurrency: string;
  buckets: Array<{ period: string; income: string; expense: string; net: string }>;
}

interface ApiByCategoryNode {
  id: string;
  name: string;
  color: string | null;
  total: string;
  children: ApiByCategoryNode[];
}

interface ApiByCategoryResponse {
  baseCurrency: string;
  categories: ApiByCategoryNode[];
}

interface ApiEntity {
  id: string;
  name: string;
  type: EntityType;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** "2026-07-09T00:00:00.000Z" → "2026-07-09" */
function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

/** Primeiro e último dia de um mês "YYYY-MM". */
function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

/** Últimos N meses (inclui o corrente), em ordem cronológica: ["2026-03", ...] */
function lastMonths(n: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return (
    parts
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?"
  );
}

// ---------------------------------------------------------------------------
// Mapeadores backend → domínio da UI
// ---------------------------------------------------------------------------

function mapMember(m: ApiMembership): Member {
  const name = m.displayName ?? m.user.name;
  return { id: m.id, displayName: name, role: m.role.type, initials: initialsOf(name) };
}

function mapAccount(a: ApiAccount): Account {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    ownerId: a.ownerUserId ?? a.ownerEntityId ?? "",
    currency: a.currency as Account["currency"],
    balance: a.currentBalance ?? "0",
    creditLimit: a.creditLimit ?? undefined,
    // O backend não devolve "usado" na listagem; virá de /accounts/:id/limit
    // quando a tela de cartões precisar do valor exato.
    usedAmount: undefined,
    closingDay: a.statementClosingDay ?? undefined,
    dueDay: a.dueDay ?? undefined,
  };
}

function flattenCategories(nodes: ApiCategory[], out: Category[] = []): Category[] {
  for (const c of nodes) {
    out.push({
      id: c.id,
      name: c.name,
      type: c.type,
      color: c.color ?? FALLBACK_COLOR,
      icon: c.icon ?? "tag",
    });
    if (c.children?.length) flattenCategories(c.children, out);
  }
  return out;
}

function mapTransaction(t: ApiTransaction): Transaction {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount,
    description: t.description ?? "",
    categoryId: t.categoryId ?? "",
    accountId: t.accountId,
    competenceDate: dateOnly(t.competenceDate),
    status: t.status,
    scope: t.scope,
    shares: t.shares?.map((s) => ({ memberId: s.membershipId, shareAmount: s.shareAmount })),
    // A UI só usa `recurrence` como marcador booleano ("recorrente").
    recurrence: t.recurrenceRuleId ? { interval: "MONTHLY" } : undefined,
    installment:
      t.installmentGroupId && t.installmentNumber && t.installmentTotal
        ? { number: t.installmentNumber, total: t.installmentTotal, groupId: t.installmentGroupId }
        : undefined,
  };
}

function mapPayment(p: ApiInvoicePayment) {
  return {
    id: p.id,
    date: dateOnly(p.paymentDate),
    amount: p.settledAmount,
    payingAccountId: p.payingAccountId,
  };
}

function mapInvoice(inv: ApiInvoice, purchases: ApiTransaction[] = []): Invoice {
  return {
    id: inv.id,
    cardId: inv.accountId,
    month: dateOnly(inv.referenceMonth).slice(0, 7),
    closingDate: dateOnly(inv.closingDate),
    dueDate: dateOnly(inv.dueDate),
    status: inv.status,
    calculatedAmount: inv.calculatedAmount,
    carriedBalance: inv.carriedBalance,
    purchases: purchases.map((t) => ({
      txId: t.id,
      description: t.description ?? "",
      amount: t.amount,
      installment:
        t.installmentNumber && t.installmentTotal
          ? `${t.installmentNumber}/${t.installmentTotal}`
          : undefined,
    })),
    payments: (inv.invoicePayments ?? []).map(mapPayment),
  };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  /** Devolve só os tokens — o backend não inclui o usuário no login. */
  login: (email: string, password: string) =>
    api.post<AuthTokens>("/auth/login", { email, password }, { anonymous: true }),
  /** O backend exige o refresh token no corpo para revogar a sessão. */
  logout: (refreshToken: string | null) =>
    refreshToken ? api.post<void>("/auth/logout", { refreshToken }) : Promise.resolve(undefined),
  me: () => api.get<User>("/me"),
};

// ---------------------------------------------------------------------------
// Entidades e membros
// ---------------------------------------------------------------------------

export const entitiesApi = {
  list: async (): Promise<Entity[]> => {
    const entities = await api.get<ApiEntity[]>("/entities");
    return entities.map((e) => ({ id: e.id, name: e.name, type: e.type }));
  },
};

export const membersApi = {
  list: async (entityId: string): Promise<Member[]> => {
    const members = await api.get<ApiMembership[]>(`/entities/${entityId}/members`);
    return members.map(mapMember);
  },
};

// ---------------------------------------------------------------------------
// Contas e categorias
// ---------------------------------------------------------------------------

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
};

export const categoriesApi = {
  list: async (entityId: string): Promise<Category[]> => {
    const tree = await api.get<ApiCategory[]>(`/entities/${entityId}/categories`);
    return flattenCategories(tree);
  },
};

// ---------------------------------------------------------------------------
// Lançamentos
// ---------------------------------------------------------------------------

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
    const mapped = rows.map(mapTransaction);
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
      competenceDate: body.competenceDate,
      status: body.status ?? "PLANNED",
      // O backend exige settlementDate quando SETTLED.
      ...(body.status === "SETTLED" ? { settlementDate: body.competenceDate } : {}),
      scope: body.scope ?? "ENTITY",
      ...(body.shares?.length
        ? {
            shares: body.shares.map((s) => ({
              membershipId: s.memberId,
              shareAmount: s.shareAmount,
            })),
          }
        : {}),
    });
    return mapTransaction(created);
  },
  update: async (id: string, body: Partial<Transaction>): Promise<Transaction> => {
    const updated = await api.patch<ApiTransaction>(`/transactions/${id}`, {
      description: body.description,
      categoryId: body.categoryId,
      accountId: body.accountId ?? undefined,
      amount: body.amount,
      competenceDate: body.competenceDate,
      scope: body.scope,
      ...(body.shares?.length
        ? {
            shares: body.shares.map((s) => ({
              membershipId: s.memberId,
              shareAmount: s.shareAmount,
            })),
          }
        : {}),
    });
    return mapTransaction(updated);
  },
  remove: (id: string) => api.delete<void>(`/transactions/${id}`),
};

// ---------------------------------------------------------------------------
// Cartões e faturas
// ---------------------------------------------------------------------------

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
  payInvoice: async (
    invoiceId: string,
    body: { amount: string; payingAccountId: string; date: string },
  ): Promise<Invoice> => {
    const paid = await api.post<ApiInvoice>(`/invoices/${invoiceId}/payments`, {
      payingAccountId: body.payingAccountId,
      settledAmount: body.amount,
      paymentDate: body.date,
    });
    return mapInvoice(paid);
  },
};

// ---------------------------------------------------------------------------
// Relatórios — o backend não tem /reports/monthly; compomos a partir de
// /reports/cashflow (SETTLED + PLANNED) e /reports/by-category.
// ---------------------------------------------------------------------------

export const reportsApi = {
  monthly: async (entityId: string, month: string): Promise<MonthlyReport> => {
    const { from, to } = monthRange(month);
    const base = `/entities/${entityId}/reports`;
    const [settled, planned, byCategory] = await Promise.all([
      api.get<ApiCashflowResponse>(`${base}/cashflow`, {
        granularity: "month",
        status: "SETTLED",
        from,
        to,
      }),
      api.get<ApiCashflowResponse>(`${base}/cashflow`, {
        granularity: "month",
        status: "PLANNED",
        from,
        to,
      }),
      api.get<ApiByCategoryResponse>(`${base}/by-category`, {
        type: "EXPENSE",
        status: "SETTLED",
        from,
        to,
      }),
    ]);

    const s = settled.buckets.find((b) => b.period === month);
    const p = planned.buckets.find((b) => b.period === month);

    return {
      income: s?.income ?? "0",
      expense: s?.expense ?? "0",
      plannedIncome: p?.income ?? "0",
      plannedExpense: p?.expense ?? "0",
      net: s?.net ?? "0",
      byCategory: byCategory.categories.map((c) => ({
        categoryId: c.id,
        name: c.name,
        color: c.color ?? FALLBACK_COLOR,
        value: c.total,
      })),
    };
  },

  cashflow: async (entityId: string, months = 5): Promise<CashflowPoint[]> => {
    const keys = lastMonths(months);
    const from = `${keys[0]}-01`;
    const { to } = monthRange(keys[keys.length - 1]);
    const base = `/entities/${entityId}/reports`;

    const [settled, planned] = await Promise.all([
      api.get<ApiCashflowResponse>(`${base}/cashflow`, {
        granularity: "month",
        status: "SETTLED",
        from,
        to,
      }),
      api.get<ApiCashflowResponse>(`${base}/cashflow`, {
        granularity: "month",
        status: "PLANNED",
        from,
        to,
      }),
    ]);

    const settledByMonth = new Map(settled.buckets.map((b) => [b.period, b.net]));
    const plannedByMonth = new Map(planned.buckets.map((b) => [b.period, b.net]));

    return keys.map((month) => ({
      month,
      realizado: settledByMonth.get(month) ?? "0",
      previsto: plannedByMonth.get(month) ?? "0",
    }));
  },
};
