// Shapes crus do backend (financial/server) e mapeadores para os tipos de
// domínio da UI. Todo adapter de endpoint importa daqui — a UI nunca vê os
// shapes do backend diretamente.

import type {
  Account,
  AccountType,
  Category,
  EntityType,
  Flow,
  FlowStage,
  Invoice,
  InvoiceStatus,
  JourneySnapshot,
  JourneyStatus,
  MasterGroup,
  Member,
  MemberRole,
  Transaction,
  TxScope,
  TxStatus,
  TxType,
} from "../types";

export const FALLBACK_COLOR = "#6B7B77";

// ---------------------------------------------------------------------------
// Shapes crus (somente os campos que consumimos)
// ---------------------------------------------------------------------------

export interface ApiEntity {
  id: string;
  name: string;
  type: EntityType;
}

export interface ApiMembership {
  id: string;
  displayName: string | null;
  user: { id: string; name: string; email: string };
  role: { id: string; name: string; type: MemberRole };
}

export interface ApiAccount {
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

export interface ApiCategory {
  id: string;
  name: string;
  type: TxType;
  code?: string | null;
  color: string | null;
  icon: string | null;
  parentId?: string | null;
  isSystem?: boolean;
  children?: ApiCategory[];
}

export interface ApiTxShare {
  membershipId: string;
  shareAmount: string;
}

export interface ApiTransaction {
  id: string;
  type: TxType;
  amount: string;
  description: string | null;
  /** Pagamento a terceiro (ex.: "paguei a Fulano") — informativo, opcional. */
  payeeName?: string | null;
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
  /** Preenchido quando a transação é PERNA de uma transferência. */
  transferId: string | null;
  /** Preenchido quando a origem é CREDIT_CARD — a fatura à qual a compra pertence. */
  cardInvoiceId?: string | null;
  notes?: string | null;
  hasAttachments?: boolean;
  /** Presente só quando a rota faz include de category (ex.: detalhe de fatura). */
  category?: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    parentId: string | null;
  } | null;
}

export interface ApiInvoicePayment {
  id: string;
  paymentDate: string;
  settledAmount: string;
  payingAccountId: string;
}

export interface ApiInvoice {
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

export interface ApiInvoiceDetail extends ApiInvoice {
  totalPaid: string;
  transactions: ApiTransaction[];
  payments: ApiInvoicePayment[];
}

export interface ApiCashflowResponse {
  baseCurrency: string;
  buckets: Array<{ period: string; income: string; expense: string; net: string }>;
}

export interface ApiByCategoryNode {
  id: string;
  name: string;
  color: string | null;
  total: string;
  children: ApiByCategoryNode[];
}

export interface ApiByCategoryResponse {
  baseCurrency: string;
  categories: ApiByCategoryNode[];
}

// ---------------------------------------------------------------------------
// Helpers de data
// ---------------------------------------------------------------------------

/** "2026-07-09T00:00:00.000Z" → "2026-07-09" */
export function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

/** Primeiro e último dia de um mês "YYYY-MM". */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

/** Últimos N meses (inclui o corrente), em ordem cronológica: ["2026-03", ...] */
export function lastMonths(n: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function initialsOf(name: string): string {
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

export function mapMember(m: ApiMembership): Member {
  const name = m.displayName ?? m.user.name;
  return {
    id: m.id,
    userId: m.user.id,
    displayName: name,
    email: m.user.email,
    role: m.role.type,
    roleId: m.role.id,
    roleName: m.role.name,
    initials: initialsOf(name),
  };
}

export function mapAccount(a: ApiAccount): Account {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    ownerId: a.ownerUserId ?? a.ownerEntityId ?? "",
    currency: a.currency as Account["currency"],
    balance: a.currentBalance ?? "0",
    creditLimit: a.creditLimit ?? undefined,
    // O backend não devolve "usado" na listagem; a tela de cartões busca
    // /accounts/:id/limit quando precisa do valor exato.
    usedAmount: undefined,
    closingDay: a.statementClosingDay ?? undefined,
    dueDay: a.dueDay ?? undefined,
  };
}

export function flattenCategories(nodes: ApiCategory[], out: Category[] = []): Category[] {
  for (const c of nodes) {
    out.push({
      id: c.id,
      name: c.name,
      type: c.type,
      code: c.code ?? undefined,
      color: c.color ?? FALLBACK_COLOR,
      icon: c.icon ?? "tag",
      parentId: c.parentId ?? null,
      isSystem: c.isSystem ?? false,
    });
    // Ordem preservada: pai seguido dos filhos (indentação por parentId na UI).
    if (c.children?.length) flattenCategories(c.children, out);
  }
  return out;
}

export function mapTransaction(t: ApiTransaction): Transaction {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount,
    description: t.description ?? "",
    payeeName: t.payeeName ?? undefined,
    categoryId: t.categoryId ?? "",
    accountId: t.accountId,
    competenceDate: dateOnly(t.competenceDate),
    status: t.status,
    scope: t.scope,
    shares: t.shares?.map((s) => ({ memberId: s.membershipId, shareAmount: s.shareAmount })),
    // A UI usa `recurrence` como marcador ("recorrente") + link para a regra.
    recurrence: t.recurrenceRuleId
      ? { interval: "MONTHLY", ruleId: t.recurrenceRuleId }
      : undefined,
    installment:
      t.installmentNumber && t.installmentTotal
        ? {
            number: t.installmentNumber,
            total: t.installmentTotal,
            ...(t.installmentGroupId ? { groupId: t.installmentGroupId } : {}),
          }
        : undefined,
    cardInvoiceId: t.cardInvoiceId ?? undefined,
    notes: t.notes ?? undefined,
    hasAttachments: t.hasAttachments ?? false,
  };
}

export function mapPayment(p: ApiInvoicePayment) {
  return {
    id: p.id,
    date: dateOnly(p.paymentDate),
    amount: p.settledAmount,
    payingAccountId: p.payingAccountId,
  };
}

export function mapInvoice(inv: ApiInvoice, purchases: ApiTransaction[] = []): Invoice {
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
      date: dateOnly(t.competenceDate),
      notes: t.notes ?? undefined,
      installment:
        t.installmentNumber && t.installmentTotal
          ? `${t.installmentNumber}/${t.installmentTotal}`
          : undefined,
      category: t.category
        ? {
            id: t.category.id,
            name: t.category.name,
            color: t.category.color,
            icon: t.category.icon,
            parentId: t.category.parentId,
          }
        : undefined,
    })),
    payments: (inv.invoicePayments ?? []).map(mapPayment),
  };
}

// ---------------------------------------------------------------------------
// Jornada financeira (Sprint 5.0) — shapes já vêm próximos do formato final;
// os mappers aqui só tipam e aplicam defaults, sem tradução pesada de nomes.
// ---------------------------------------------------------------------------

export interface ApiMasterGroup {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  includeContributions: boolean;
  order: number;
  categories: { id: string; name: string }[];
}

export function mapMasterGroup(g: ApiMasterGroup): MasterGroup {
  return {
    id: g.id,
    name: g.name,
    color: g.color,
    icon: g.icon,
    includeContributions: g.includeContributions,
    order: g.order,
    categories: g.categories,
  };
}

export interface ApiFlowStageTarget {
  masterGroupId: string;
  minPct: number;
  maxPct: number;
}

export interface ApiFlowStage {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  order: number;
  targets: ApiFlowStageTarget[];
}

export function mapFlowStage(s: ApiFlowStage): FlowStage {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    color: s.color,
    order: s.order,
    targets: s.targets,
  };
}

export interface ApiFlow {
  id: string;
  name: string;
  active: boolean;
  isExample: boolean;
  stages: ApiFlowStage[];
}

export function mapFlow(f: ApiFlow): Flow {
  return {
    id: f.id,
    name: f.name,
    active: f.active,
    isExample: f.isExample,
    stages: f.stages.map(mapFlowStage),
  };
}

export interface ApiJourneyStatus {
  flow: { id: string; name: string; active: boolean; isExample: boolean } | null;
  currentStage: JourneyStatus["currentStage"];
  stages: JourneyStatus["stages"];
  evaluationDay: number;
  autoApply: boolean;
  pendingSuggestion: JourneyStatus["pendingSuggestion"];
}

export function mapJourneyStatus(s: ApiJourneyStatus): JourneyStatus {
  return {
    flow: s.flow,
    currentStage: s.currentStage,
    stages: s.stages,
    evaluationDay: s.evaluationDay,
    autoApply: s.autoApply,
    pendingSuggestion: s.pendingSuggestion,
  };
}

export type ApiJourneySnapshot = JourneySnapshot;

export function mapJourneySnapshot(s: ApiJourneySnapshot): JourneySnapshot {
  return s;
}
