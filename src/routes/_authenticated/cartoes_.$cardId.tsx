// Detalhe do cartão: barra de limite, fatura corrente destacada, lista de
// faturas com filtro de status, e próximas faturas projetadas por parcelas.
// Fatura CLOSED/PAID é imutável (invariante 7) — itens somente leitura.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Calendar, CreditCard as CardIcon, Loader2 } from "lucide-react";
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
  useAccounts,
  useCardInvoices,
  useCardLimit,
  useCloseInvoice,
  useInvoiceDetail,
  useUpcomingInvoices,
} from "@/hooks/api";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { formatMoney, pct, subCents } from "@/lib/money";
import { formatDate, formatMonth, todayISO } from "@/lib/format";
import type { Invoice } from "@/lib/api/types";
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

function InvoiceDetailDialog({
  invoiceId,
  onClose,
}: {
  invoiceId: string | null;
  onClose: () => void;
}) {
  const detailQ = useInvoiceDetail(invoiceId ?? undefined);
  const invoice = detailQ.data;
  const frozen = invoice && (invoice.status === "CLOSED" || invoice.status === "PAID");

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
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Compras ({invoice.purchases.length})
            </p>
            {invoice.purchases.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma compra neste ciclo.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {invoice.purchases.map((p) => (
                  <li key={p.txId} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-muted-foreground">
                      {p.description || "Compra"}
                      {p.installment && (
                        <Badge variant="secondary" className="ml-1.5 text-[10px]">
                          {p.installment}
                        </Badge>
                      )}
                    </span>
                    <MoneyText cents={p.amount} kind="expense" className="text-xs" />
                  </li>
                ))}
              </ul>
            )}
          </div>

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
