// Modal de detalhe de fatura: tabela ordenável/agrupável de compras +
// gráficos por categoria. Compartilhado entre /cartoes/:id e a linha de
// fatura agrupada em /lancamentos (Sprint 4.8, Parte A).
// Fatura CLOSED/PAID/PARTIAL é imutável (invariante 7) — itens somente
// leitura. Fatura OPEN permite editar valor e categoria inline (Parte B).

import { Fragment, useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { MoneyText } from "@/components/frisby/money-text";
import { MoneyInput } from "@/components/frisby/money-input";
import { CategorySelect } from "@/components/frisby/category-select";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories, useInvoiceDetail } from "@/hooks/api";
import { useUpdateTransaction } from "@/hooks/api/transactions";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { formatMoney, subCents } from "@/lib/money";
import { formatDate, formatDateNumeric } from "@/lib/format";
import type { InvoicePurchase } from "@/lib/api/types";
import { invoicePaidTotal } from "@/components/frisby/pay-invoice-dialog";
import { cn } from "@/lib/utils";

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

/** Linha editável (fatura OPEN) — valor e categoria são inputs inline; o
 * resto dos campos permanece somente leitura mesmo aberta (Parte B só pede
 * valor/categoria). */
function EditablePurchaseRow({
  purchase,
  entityId,
  onSaved,
}: {
  purchase: InvoicePurchase;
  entityId: string | undefined;
  onSaved: () => void;
}) {
  const updateTx = useUpdateTransaction(entityId);
  const [amount, setAmount] = useState(purchase.amount);

  function commitAmount() {
    if (amount === purchase.amount || !amount) return;
    updateTx.mutate(
      { id: purchase.txId, body: { amount } },
      {
        onSuccess: () => onSaved(),
        onError: (err) => {
          setAmount(purchase.amount);
          toast.error(apiErrorMessage(err));
        },
      },
    );
  }

  function handleCategoryChange(categoryId: string) {
    updateTx.mutate(
      { id: purchase.txId, body: { categoryId } },
      {
        onSuccess: () => onSaved(),
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );
  }

  return (
    <tr className="border-t border-border/40 hover:bg-secondary/40">
      <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
        {formatDateNumeric(purchase.date)}
      </td>
      <td className="max-w-0 px-2 py-1.5">
        <span className="block truncate" title={purchase.description || "Compra"}>
          {purchase.description || "Compra"}
        </span>
      </td>
      <td className="whitespace-nowrap px-2 py-1.5">
        {purchase.installment ? (
          <Badge variant="secondary" className="text-[10px]">
            {purchase.installment}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="min-w-40 px-2 py-1.5">
        <CategorySelect
          entityId={entityId}
          type="EXPENSE"
          value={purchase.category?.id}
          onChange={handleCategoryChange}
          disabled={updateTx.isPending}
          className="h-7 text-xs"
        />
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-right">
        <MoneyInput
          value={amount}
          onChange={setAmount}
          onBlur={commitAmount}
          disabled={updateTx.isPending}
          className="h-7 w-28 text-right text-xs"
        />
      </td>
    </tr>
  );
}

export function InvoiceDetailDialog({
  invoiceId,
  onClose,
}: {
  invoiceId: string | null;
  onClose: () => void;
}) {
  const { entity } = useCurrentEntity();
  const detailQ = useInvoiceDetail(invoiceId ?? undefined);
  const invoice = detailQ.data;
  const frozen =
    invoice &&
    (invoice.status === "CLOSED" || invoice.status === "PAID" || invoice.status === "PARTIAL");

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
          : invoice
            ? "Fatura aberta — valor e categoria dos itens são editáveis."
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
                        {group.items.map((p) =>
                          frozen ? (
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
                          ) : (
                            <EditablePurchaseRow
                              key={p.txId}
                              purchase={p}
                              entityId={entity?.id}
                              onSaved={() => detailQ.refetch()}
                            />
                          ),
                        )}
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
