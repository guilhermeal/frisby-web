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
  /** Preferência pessoal: se membros de hierarquia igual/inferior podem ver
   * os lançamentos/contas deste membro. Só o dono da membership pode alterar. */
  shareWithPeers: boolean;
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
  /** Código de atalho opcional (ex. "1.1.3"), único por entidade+tipo. */
  code?: string;
  color: string;
  icon: string;
  /** null = categoria raiz; string = subcategoria (árvore de 1 nível). */
  parentId: string | null;
  /** Categorias de sistema só podem ser renomeadas. */
  isSystem: boolean;
}

export interface CategoryImportRow {
  code: string;
  type: TxType;
  name: string;
  action: "created" | "updated" | "skipped";
  reason?: string;
}

export interface CategoryImportSummary {
  created: number;
  updated: number;
  skipped: number;
  rows: CategoryImportRow[];
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
  /** Ausente quando a parcela é só metadado de exibição (import em massa de
   * histórico) — não há série real, então não há grupo pra cancelar/consultar. */
  groupId?: string;
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
  /** id da fatura de cartão à qual este lançamento pertence (compras de CREDIT_CARD). */
  cardInvoiceId?: string | null;
  /** Observação livre do lançamento — distinta de description (título) e payeeName (pago a). */
  notes?: string;
  /** true = tem ao menos um comprovante/boleto anexado (ícone de clipe na lista). */
  hasAttachments?: boolean;
}

/** Uma linha do texto colado/enviado na importação em massa (Sprint 4.6, Parte A). */
export interface TransactionBulkImportRow {
  date: string; // YYYY-MM-DD
  description: string;
  amount: string; // centavos, já convertido no client
  /** Metadados de exibição apenas — não geram série nem installmentGroupId. */
  installmentNumber: number | null;
  installmentTotal: number | null;
  categoryId: string | null;
  notes: string | null;
}

export interface TransactionBulkImportSummary {
  created: string[];
  failed: Array<{ index: number; error: string }>;
}

/** Como o backend resolveu a coluna opcional de categoria do CSV (Sprint 4.7). */
export type CategoryResolutionMethod =
  "uuid" | "code" | "name" | "default" | "ambiguous" | "notfound";

export interface CategoryResolutionResult {
  categoryId: string | null;
  categoryName: string | null;
  resolvedBy: CategoryResolutionMethod;
}

export interface TransactionBulkCategorizeSummary {
  updated: string[];
  failed: Array<{ id: string; error: string }>;
}

/** Comprovante/boleto/nota fiscal anexado a um lançamento OU pagamento de fatura. */
export interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  /** URL assinada e temporária — só presente na listagem (GET), nunca persistida. */
  downloadUrl?: string;
}

export interface InvoicePurchase {
  txId: string;
  description: string;
  amount: string;
  installment?: string;
  /** Data da compra/parcela (competenceDate), YYYY-MM-DD. */
  date: string;
  notes?: string;
  category?: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    parentId: string | null;
  };
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
  /** Entidade de origem (dona da conta fromAccountId). */
  entityId: string;
  /** Entidade de destino — presente só quando difere de entityId (cross-entity). */
  toEntityId?: string;
  kind: TransferKind;
  fromAccountId: string;
  toAccountId: string;
  /** Nome da conta de origem — vem sempre do backend, mesmo sem account.viewOthers. */
  fromAccountName: string;
  /** Nome da conta de destino — vem sempre do backend, mesmo sem account.viewOthers. */
  toAccountName: string;
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

// ---- jornada financeira (Sprint 5.0) ----

export interface MasterGroupCategoryRef {
  id: string;
  name: string;
}

export interface MasterGroup {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  includeContributions: boolean;
  order: number;
  categories: MasterGroupCategoryRef[];
}

export interface UnlinkedCategory {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

export interface FlowStageTarget {
  masterGroupId: string;
  /** Fração 0..1 (não pontos percentuais). */
  minPct: number;
  maxPct: number;
}

export interface FlowStage {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  order: number;
  targets: FlowStageTarget[];
}

export interface Flow {
  id: string;
  name: string;
  active: boolean;
  isExample: boolean;
  stages: FlowStage[];
}

export type StageSuggestionStatus = "PENDING" | "ACCEPTED" | "DISMISSED";

export interface StageRef {
  id: string;
  name: string;
  color: string | null;
  order: number;
  description?: string | null;
}

export interface PendingSuggestion {
  snapshotMonth: string; // "YYYY-MM"
  suggestedStage: StageRef | null;
  matchedStage: StageRef | null;
}

export interface JourneyStatus {
  flow: { id: string; name: string; active: boolean; isExample: boolean } | null;
  currentStage: StageRef | null;
  stages: StageRef[];
  evaluationDay: number;
  autoApply: boolean;
  pendingSuggestion: PendingSuggestion | null;
}

export interface SnapshotGroup {
  masterGroupId: string; // "__others__" para o grupo Outros
  name: string;
  color: string | null;
  icon: string | null;
  realized: string; // cents
  pct: number; // fração 0..1
  includeContributions: boolean;
  isOthers: boolean;
}

export type SnapshotReason = "matched" | "no_flow" | "no_match" | "no_income";

export interface JourneySnapshot {
  month: string; // "YYYY-MM"
  currency: Currency;
  totalIncome: string;
  totalExpense: string;
  groups: SnapshotGroup[];
  matchedStage: StageRef | null;
  appliedStage: StageRef | null;
  suggestedStage: StageRef | null;
  suggestionStatus: StageSuggestionStatus | null;
  onTarget: boolean;
  reason: SnapshotReason;
  persisted: boolean;
  computedAt: string;
}

// ---- sonhos & metas (Sprint 6.0/6.1) ----
// Contrato real do backend (frisby-server/src/modules/goals). Cada meta tem
// uma Account INVESTMENT dedicada por trás (accountId); aportar é um Transfer
// kind=CONTRIBUTION comum para essa conta — não existe rota própria de aporte.

export type GoalHorizon = "SHORT" | "MEDIUM" | "LONG";
export type GoalStatus = "ACTIVE" | "PAUSED" | "ACHIEVED" | "ABANDONED";

/** Viabilidade — individual (por meta, calculada no front) ou agregada
 * (GET /goals/feasibility). "unknown" = sem histórico suficiente para
 * calcular uma sobra mensal real (não é o mesmo que "inviável"). */
export type GoalViabilityLevel = "ok" | "tight" | "unrealistic" | "unknown";

export interface Goal {
  id: string;
  name: string;
  description?: string | null;
  /** Conta de investimento dedicada por trás da meta — transparente ao usuário. */
  accountId: string;
  targetAmount: string;
  currency: string;
  targetDate: string; // YYYY-MM-DD
  horizon: GoalHorizon;
  status: GoalStatus;
  icon?: string | null;
  color?: string | null;
  /** Saldo atual da conta dedicada — é o "andamento" da meta. */
  currentBalance: string;
  /** % concluído (0-100), calculado pelo backend. */
  progressPct: number;
  monthsRemaining: number;
  /** Aporte mensal necessário para chegar ao valor-alvo até a data-alvo; "0" se já atingiu. */
  requiredMonthly: string;
  createdAt: string;
}

export interface GoalFeasibilityItem {
  goalId: string;
  name: string;
  targetAmount: string;
  currentBalance: string;
  monthsRemaining: number;
  requiredMonthly: string;
}

/** Viabilidade agregada (GET /entities/:id/goals/feasibility): soma do aporte
 * necessário de todas as metas ATIVAS vs. a sobra mensal média real (últimos
 * 3 meses) da entidade. */
export interface GoalsFeasibility {
  baseCurrency: string;
  /** Sobra mensal média — "0" tanto quando sobra real é zero quanto quando
   * insufficientHistory é true (nesse caso o valor não é significativo). */
  availableSurplus: string;
  totalRequiredMonthly: string;
  /** null quando indeterminado: sem histórico, ou sobra <= 0 com metas ativas. */
  ratio: number | null;
  level: GoalViabilityLevel;
  /** true = nenhum mês com lançamento SETTLED nos últimos 3 meses — o painel
   * deve mostrar um estado informativo em vez dos números (que não refletem
   * comportamento real ainda). */
  insufficientHistory: boolean;
  /** Metas que mais pesam no orçamento, maior aporte necessário primeiro. */
  goals: GoalFeasibilityItem[];
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
