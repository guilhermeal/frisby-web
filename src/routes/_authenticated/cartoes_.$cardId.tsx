// Detalhe do cartão: barra de limite, fatura corrente destacada, lista de
// faturas com filtro de status, e próximas faturas projetadas por parcelas.
// Fatura CLOSED/PAID é imutável (invariante 7) — itens somente leitura.

import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  CreditCard as CardIcon,
  Loader2,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { MoneyText } from "@/components/frisby/money-text";
import { StatusPill } from "@/components/frisby/status-pill";
import { EmptyState } from "@/components/frisby/empty-state";
import { ConfirmDialog } from "@/components/frisby/confirm-dialog";
import { PayInvoiceDialog, invoicePaidTotal } from "@/components/frisby/pay-invoice-dialog";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAccounts,
  useCardInvoices,
  useCardLimit,
  useCategories,
  useCloseInvoice,
  useInvoiceDetail,
  useUpcomingInvoices,
} from "@/hooks/api";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { formatMoney, pct, subCents } from "@/lib/money";
import { formatDate, formatDateNumeric, formatMonth, todayISO } from "@/lib/format";
import type { Invoice, InvoicePurchase } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/cartoes_/$cardId")({
  component: CardDetailPage,
});

type StatusFilter = "all" | "unpaid" | "paid";

const STATUS_FILTERS: Array<[StatusFilter, string]> = [
  ["all", "Todas"],
  ["unpaid", "Em aberto"],
  ["paid", "Pagas"],
];

/**
 * A "fatura corrente" é a do ciclo de hoje pelo calendário: entre as OPEN,
 * a de menor closingDate que ainda não passou (o ciclo em andamento agora).
 * Faturas antigas ainda OPEN por falta de fechamento automático NÃO viram a
 * corrente — ficam na lista normal, marcadas "Vencida", aguardando o usuário
 * fechá-las manualmente. Se nenhuma OPEN cobre hoje (todas já venceram), cai
 * na mais recente entre as pendentes como fallback.
 */
function pickCurrentInvoice(invoices: Invoice[]): Invoice | undefined {
  const unpaid = invoices.filter((i) => i.status !== "PAID");
  if (unpaid.length === 0) return undefined;

  const today = todayISO();
  const currentCycle = unpaid
    .filter((i) => i.status === "OPEN" && i.closingDate >= today)
    .sort((a, b) => a.closingDate.localeCompare(b.closingDate))[0];
  if (currentCycle) return currentCycle;

  return [...unpaid].sort((a, b) => b.month.localeCompare(a.month))[0];
}

function CardDetailPage() {
  const { cardId } = Route.useParams();
  const { entity } = useCurrentEntity();

  const accountsQ = useAccounts(entity?.id);
  const card = (accountsQ.data ?? []).find((a) => a.id === cardId);

  const limitQ = useCardLimit(cardId);
  const invoicesQ = useCardInvoices(cardId);
  const upcomingQ = useUpcomingInvoices(cardId);
  const closeInvoice = useCloseInvoice(cardId);

  const [paying, setPaying] = useState<Invoice | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const invoices = invoicesQ.data ?? [];
  const currentInvoice = useMemo(() => pickCurrentInvoice(invoices), [invoices]);

  // Lista principal = tudo exceto a fatura já destacada como corrente,
  // sempre ordenada do mês mais recente para o mais antigo.
  const otherInvoices = useMemo(
    () =>
      [...invoices]
        .filter((i) => i.id !== currentInvoice?.id)
        .sort((a, b) => b.month.localeCompare(a.month)),
    [invoices, currentInvoice],
  );
  const filteredInvoices = useMemo(() => {
    if (statusFilter === "all") return otherInvoices;
    if (statusFilter === "paid") return otherInvoices.filter((i) => i.status === "PAID");
    return otherInvoices.filter((i) => i.status !== "PAID");
  }, [otherInvoices, statusFilter]);

  async function handleClose(invoice: Invoice) {
    try {
      await closeInvoice.mutateAsync(invoice.id);
      toast.success("Fatura fechada — o valor calculado foi congelado");
    } catch (err) {
      toast.error(apiErrorMessage(err));
      throw err;
    }
  }

  const limit = limitQ.data;
  const usedPct = limit ? pct(limit.usedAmount, limit.creditLimit) : 0;

  return (
    <AppShell>
      <PageHeader
        title={card?.name ?? "Cartão"}
        subtitle={card ? `fecha dia ${card.closingDay} · vence dia ${card.dueDay}` : undefined}
        actions={
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/cartoes">
              <ArrowLeft className="h-4 w-4" /> Cartões
            </Link>
          </Button>
        }
      />

      <div className="mx-4 space-y-4 sm:mx-6 lg:mx-0">
        {/* Limite */}
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Limite</h3>
            {limit?.overLimit && (
              <Badge className="border-transparent bg-expense/10 text-expense">
                Acima do limite
              </Badge>
            )}
          </div>
          {limitQ.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : limitQ.error ? (
            <p className="text-sm text-expense">{apiErrorMessage(limitQ.error)}</p>
          ) : limit ? (
            <>
              <div className="h-3 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    limit.overLimit ? "bg-expense" : usedPct >= 80 ? "bg-warning" : "bg-brand",
                  )}
                  style={{ width: `${Math.min(100, usedPct)}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Usado <strong className="text-foreground">{formatMoney(limit.usedAmount)}</strong>{" "}
                  de {formatMoney(limit.creditLimit)}
                </span>
                <span>
                  Disponível{" "}
                  <strong className="text-foreground">{formatMoney(limit.availableLimit)}</strong>
                </span>
              </div>
            </>
          ) : null}
        </div>

        {/* Fatura corrente destacada */}
        {invoicesQ.isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando faturas…
          </div>
        ) : currentInvoice ? (
          <div className="rounded-2xl border-2 border-brand/40 bg-card p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-brand">
              Fatura corrente
            </p>
            <InvoiceRow
              invoice={currentInvoice}
              highlight
              onPay={() => setPaying(currentInvoice)}
              onCloseInvoice={() => handleClose(currentInvoice)}
              onDetail={() => setDetailId(currentInvoice.id)}
            />
          </div>
        ) : (
          <EmptyState
            icon={CardIcon}
            title="Nenhuma fatura ainda"
            description="A primeira compra no cartão abre a fatura do ciclo automaticamente."
          />
        )}

        {/* Demais faturas + próximas */}
        <Tabs defaultValue="history">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="history">Faturas</TabsTrigger>
              <TabsTrigger value="upcoming">Projeção futura</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="history" className="mt-3 space-y-3">
            {otherInvoices.length > 1 && (
              <div className="-mx-1 flex flex-wrap gap-1.5 overflow-x-auto pb-1">
                {STATUS_FILTERS.map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setStatusFilter(id)}
                    className={cn(
                      "shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      statusFilter === id
                        ? "border-ink bg-ink text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {filteredInvoices.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
                {otherInvoices.length === 0
                  ? "Sem outras faturas."
                  : "Nenhuma fatura nesse filtro."}
              </p>
            ) : (
              <ul className="space-y-2.5">
                {filteredInvoices.map((inv) => (
                  <li key={inv.id} className="rounded-2xl border border-border/60 bg-card p-4">
                    <InvoiceRow
                      invoice={inv}
                      onPay={() => setPaying(inv)}
                      onCloseInvoice={() => handleClose(inv)}
                      onDetail={() => setDetailId(inv.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-3">
            {upcomingQ.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (upcomingQ.data ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
                Nenhuma fatura futura projetada além da fatura corrente — parcelas criam projeções
                automaticamente.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {[...(upcomingQ.data ?? [])]
                  .sort((a, b) => a.month.localeCompare(b.month))
                  .map((u) => (
                    <li
                      key={u.month}
                      className="flex items-center justify-between rounded-2xl border border-dashed border-border/70 bg-background/40 p-4"
                    >
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {formatMonth(`${u.month}-01`)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Projeção · {u.transactionCount}{" "}
                          {u.transactionCount === 1 ? "lançamento" : "lançamentos"}
                        </p>
                      </div>
                      <MoneyText cents={u.projectedTotal} className="text-sm" />
                    </li>
                  ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <PayInvoiceDialog
        entityId={entity?.id}
        cardId={cardId}
        invoice={paying}
        onClose={() => setPaying(null)}
      />
      <InvoiceDetailDialog invoiceId={detailId} onClose={() => setDetailId(null)} />
    </AppShell>
  );
}

// ---------------------------------------------------------------------------

function InvoiceRow({
  invoice,
  highlight,
  onPay,
  onCloseInvoice,
  onDetail,
}: {
  invoice: Invoice;
  highlight?: boolean;
  onPay: () => void;
  onCloseInvoice: () => Promise<void>;
  onDetail: () => void;
}) {
  const paid = invoicePaidTotal(invoice);
  const remaining = subCents(invoice.calculatedAmount, paid);
  const payable = invoice.status === "CLOSED" || invoice.status === "PARTIAL";
  // Fatura OPEN cuja data de fechamento já passou — deveria ter fechado
  // sozinha; mostrar como "Vencida" em vez de "Aberta" evita confundir com
  // uma fatura futura genuína.
  const overdueOpen = invoice.status === "OPEN" && invoice.closingDate < todayISO();

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Fatura {invoice.month}
          </p>
          <p
            className={cn("mt-0.5 font-display font-semibold", highlight ? "text-2xl" : "text-lg")}
          >
            {formatMoney(invoice.calculatedAmount)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <Calendar className="mr-1 inline h-3 w-3" />
            fecha {formatDate(invoice.closingDate)} · vence {formatDate(invoice.dueDate)}
          </p>
        </div>
        <StatusPill status={invoice.status} overdue={overdueOpen} />
      </div>

      {BigInt(invoice.carriedBalance) !== 0n && (
        <p className="mt-3 rounded-lg bg-secondary/70 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          {BigInt(invoice.carriedBalance) > 0n ? (
            <>Rollover do mês anterior: {formatMoney(invoice.carriedBalance)}</>
          ) : (
            <>
              Crédito do mês anterior: {formatMoney((-BigInt(invoice.carriedBalance)).toString())}
            </>
          )}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Em aberto</p>
          <MoneyText cents={remaining} kind="expense" className="text-sm font-semibold" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onDetail}>
            Ver compras
          </Button>
          {invoice.status === "OPEN" && (
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="outline">
                  Fechar fatura
                </Button>
              }
              title="Fechar a fatura?"
              description="O valor calculado será congelado e as compras ficam imutáveis — correções vão para a próxima fatura. Você poderá pagá-la em seguida."
              confirmLabel="Fechar fatura"
              onConfirm={onCloseInvoice}
            />
          )}
          {payable && (
            <Button size="sm" onClick={onPay}>
              Pagar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

type SortColumn = "date" | "description" | "installment" | "category" | "amount";
type SortDir = "asc" | "desc";
type GroupBy = "none" | "date" | "category";

function sortPurchases(
  purchases: InvoicePurchase[],
  column: SortColumn,
  dir: SortDir,
): InvoicePurchase[] {
  const sorted = [...purchases].sort((a, b) => {
    let cmp = 0;
    switch (column) {
      case "date":
        cmp = a.date.localeCompare(b.date);
        break;
      case "description":
        cmp = (a.description || "").localeCompare(b.description || "");
        break;
      case "installment":
        cmp = (a.installment ?? "").localeCompare(b.installment ?? "");
        break;
      case "category":
        cmp = (a.category?.name ?? "").localeCompare(b.category?.name ?? "");
        break;
      case "amount":
        cmp =
          BigInt(a.amount) < BigInt(b.amount) ? -1 : BigInt(a.amount) > BigInt(b.amount) ? 1 : 0;
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

function groupPurchases(
  purchases: InvoicePurchase[],
  groupBy: GroupBy,
): Array<{ key: string; label: string; items: InvoicePurchase[] }> {
  if (groupBy === "none") return [{ key: "all", label: "", items: purchases }];
  const map = new Map<string, { label: string; items: InvoicePurchase[] }>();
  for (const p of purchases) {
    const key = groupBy === "date" ? p.date : (p.category?.name ?? "Sem categoria");
    const label =
      groupBy === "date" ? formatDateNumeric(p.date) : (p.category?.name ?? "Sem categoria");
    const g = map.get(key);
    if (g) g.items.push(p);
    else map.set(key, { label, items: [p] });
  }
  return [...map.entries()].map(([key, g]) => ({ key, ...g }));
}

function sumAmount(purchases: InvoicePurchase[]): bigint {
  return purchases.reduce((sum, p) => sum + BigInt(p.amount), 0n);
}

function SortableHeader({
  label,
  column,
  align,
  sortColumn,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  column: SortColumn;
  align?: "right";
  sortColumn: SortColumn;
  sortDir: SortDir;
  onSort: (column: SortColumn) => void;
  className?: string;
}) {
  const active = sortColumn === column;
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className={cn("whitespace-nowrap px-2 py-1.5 font-medium", className)}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "flex cursor-pointer items-center gap-1 hover:text-foreground",
          align === "right" && "ml-auto",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </th>
  );
}

const PIE_COLORS = [
  "var(--color-brand)",
  "var(--color-transfer)",
  "var(--color-warning)",
  "var(--color-expense)",
  "var(--color-income)",
];

const pieTooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--color-foreground)",
};

/**
 * Agrupa compras por uma chave arbitrária (categoria folha ou categoria pai)
 * e monta os dados do PieChart + legenda. `keyOf` decide o agrupamento;
 * `labelOf`/`colorOf` resolvem o texto e a cor exibidos para cada grupo.
 */
function PurchasesPieChart({
  title,
  purchases,
  keyOf,
  labelOf,
  colorOf,
}: {
  title: string;
  purchases: InvoicePurchase[];
  keyOf: (p: InvoicePurchase) => string;
  labelOf: (key: string, p: InvoicePurchase) => string;
  colorOf: (key: string, p: InvoicePurchase) => string | null;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; color: string | null; total: bigint }>();
    for (const p of purchases) {
      const key = keyOf(p);
      const existing = map.get(key);
      if (existing) existing.total += BigInt(p.amount);
      else
        map.set(key, { label: labelOf(key, p), color: colorOf(key, p), total: BigInt(p.amount) });
    }
    return [...map.values()]
      .filter((g) => g.total > 0n)
      .sort((a, b) => (b.total > a.total ? 1 : -1));
  }, [purchases, keyOf, labelOf, colorOf]);

  const data = grouped.map((g, i) => ({
    name: g.label,
    value: Number(g.total),
    fill: g.color ?? PIE_COLORS[i % PIE_COLORS.length],
  }));

  if (data.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
        <div className="h-45">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((c) => (
                  <Cell key={c.name} fill={c.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={pieTooltipStyle}
                itemStyle={{ color: "var(--color-foreground)" }}
                labelStyle={{ display: "none" }}
                labelFormatter={() => ""}
                formatter={(v: number, name: string) => [formatMoney(String(v)), name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-1.5">
          {data.map((c) => (
            <li key={c.name} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: c.fill }}
              />
              <span className="min-w-0 flex-1 truncate text-foreground" title={c.name}>
                {c.name}
              </span>
              <MoneyText cents={String(c.value)} kind="expense" className="text-xs" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function InvoiceCategoryCharts({
  purchases,
  entityId,
}: {
  purchases: InvoicePurchase[];
  entityId: string | undefined;
}) {
  const categoriesQ = useCategories(entityId);
  const categoryById = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; color: string; parentId: string | null }
    >();
    for (const c of categoriesQ.data ?? []) map.set(c.id, c);
    return map;
  }, [categoriesQ.data]);

  return (
    <div className="space-y-6">
      <PurchasesPieChart
        title="Por categoria"
        purchases={purchases}
        keyOf={(p) => p.category?.id ?? "uncategorized"}
        labelOf={(_key, p) => p.category?.name ?? "Sem categoria"}
        colorOf={(_key, p) => p.category?.color ?? null}
      />
      <PurchasesPieChart
        title="Por categoria pai"
        purchases={purchases}
        keyOf={(p) => {
          const cat = p.category;
          if (!cat) return "uncategorized";
          return cat.parentId ?? cat.id;
        }}
        labelOf={(key, p) => {
          if (key === "uncategorized") return "Sem categoria";
          const parent = categoryById.get(key);
          return parent?.name ?? p.category?.name ?? "Sem categoria";
        }}
        colorOf={(key, p) => {
          if (key === "uncategorized") return null;
          const parent = categoryById.get(key);
          return parent?.color ?? p.category?.color ?? null;
        }}
      />
    </div>
  );
}

function InvoiceDetailDialog({
  invoiceId,
  onClose,
}: {
  invoiceId: string | null;
  onClose: () => void;
}) {
  const { entity } = useCurrentEntity();
  const detailQ = useInvoiceDetail(invoiceId ?? undefined);
  const invoice = detailQ.data;
  const frozen = invoice && (invoice.status === "CLOSED" || invoice.status === "PAID");

  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

  function handleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDir("asc");
    }
  }

  const groups = useMemo(() => {
    if (!invoice) return [];
    const sorted = sortPurchases(invoice.purchases, sortColumn, sortDir);
    return groupPurchases(sorted, groupBy);
  }, [invoice, sortColumn, sortDir, groupBy]);

  return (
    <ResponsiveDialog
      open={!!invoiceId}
      onOpenChange={(v) => !v && onClose()}
      title={invoice ? `Fatura ${invoice.month}` : "Fatura"}
      description={
        frozen
          ? "Fatura fechada — itens somente leitura; correções vão para a próxima fatura."
          : undefined
      }
    >
      {detailQ.isLoading ? (
        <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : detailQ.error ? (
        <p className="p-4 text-sm text-expense">{apiErrorMessage(detailQ.error)}</p>
      ) : invoice ? (
        <div className="space-y-4 pb-1">
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Calculado" value={formatMoney(invoice.calculatedAmount)} />
            <MiniStat label="Pago" value={formatMoney(invoicePaidTotal(invoice))} />
            <MiniStat
              label="Em aberto"
              value={formatMoney(subCents(invoice.calculatedAmount, invoicePaidTotal(invoice)))}
            />
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Compras ({invoice.purchases.length})
              </p>
              {invoice.purchases.length > 0 && (
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                  <SelectTrigger className="h-7 w-40 text-xs">
                    <SelectValue placeholder="Agrupar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem agrupamento</SelectItem>
                    <SelectItem value="date">Agrupar por data</SelectItem>
                    <SelectItem value="category">Agrupar por categoria</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            {invoice.purchases.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma compra neste ciclo.</p>
            ) : (
              <div className="-mx-2 overflow-x-auto rounded-lg border border-border/60">
                <table className="min-w-full text-xs">
                  <thead className="text-left uppercase tracking-wider text-muted-foreground">
                    <tr className="border-b border-border/60">
                      <SortableHeader
                        label="Data"
                        column="date"
                        sortColumn={sortColumn}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Descrição"
                        column="description"
                        sortColumn={sortColumn}
                        sortDir={sortDir}
                        onSort={handleSort}
                        className="min-w-45"
                      />
                      <SortableHeader
                        label="Parcela"
                        column="installment"
                        sortColumn={sortColumn}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Categoria"
                        column="category"
                        sortColumn={sortColumn}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Valor"
                        column="amount"
                        align="right"
                        sortColumn={sortColumn}
                        sortDir={sortDir}
                        onSort={handleSort}
                        className="text-right"
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => (
                      <Fragment key={group.key}>
                        {groupBy !== "none" && (
                          <tr className="border-t border-border/60 bg-secondary/40">
                            <td colSpan={4} className="px-2 py-1 font-medium text-muted-foreground">
                              {group.label}{" "}
                              <span className="font-normal">({group.items.length})</span>
                            </td>
                            <td className="px-2 py-1 text-right font-medium">
                              <MoneyText
                                cents={sumAmount(group.items).toString()}
                                kind="expense"
                                className="text-xs"
                              />
                            </td>
                          </tr>
                        )}
                        {group.items.map((p) => (
                          <tr
                            key={p.txId}
                            className="border-t border-border/40 hover:bg-secondary/40"
                          >
                            <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                              {formatDateNumeric(p.date)}
                            </td>
                            <td className="max-w-0 px-2 py-1.5">
                              <span className="block truncate" title={p.description || "Compra"}>
                                {p.description || "Compra"}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-2 py-1.5">
                              {p.installment ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  {p.installment}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-2 py-1.5">
                              {p.category ? (
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <span
                                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: p.category.color ?? undefined }}
                                  />
                                  {p.category.name}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-2 py-1.5 text-right">
                              <MoneyText cents={p.amount} kind="expense" className="text-xs" />
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <InvoiceCategoryCharts purchases={invoice.purchases} entityId={entity?.id} />

          {invoice.payments.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pagamentos
              </p>
              <ul className="space-y-1.5 text-sm">
                {invoice.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{formatDate(p.date)}</span>
                    <MoneyText cents={p.amount} kind="income" className="text-xs" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </ResponsiveDialog>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-2 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="tnum mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
