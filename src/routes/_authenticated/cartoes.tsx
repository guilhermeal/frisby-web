// Visão geral dos cartões: um card por cartão com limite, fatura corrente e
// atalho para o detalhe (faturas, fechamento, pagamento com rollover).

import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, CreditCard as CardIcon, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { MoneyText } from "@/components/frisby/money-text";
import { StatusPill } from "@/components/frisby/status-pill";
import { EmptyState } from "@/components/frisby/empty-state";
import { AccountForm } from "@/components/frisby/account-form";
import { invoicePaidTotal } from "@/components/frisby/pay-invoice-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts, useCardInvoices } from "@/hooks/api";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { formatMoney, subCents } from "@/lib/money";
import { formatDate } from "@/lib/format";
import type { Account } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/cartoes")({
  component: CartoesPage,
});

function CartoesPage() {
  const { entity } = useCurrentEntity();
  const accountsQ = useAccounts(entity?.id);
  const cards = (accountsQ.data ?? []).filter((a) => a.type === "CREDIT_CARD");
  const [creating, setCreating] = useState(false);

  return (
    <AppShell>
      <PageHeader
        title="Cartões"
        subtitle="Faturas, rollover e limites"
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo cartão</span>
          </Button>
        }
      />

      <div className="mx-4 sm:mx-6 lg:mx-0">
        {accountsQ.isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : accountsQ.error ? (
          <div className="rounded-2xl border border-expense/30 bg-expense/5 p-6 text-sm text-expense">
            {apiErrorMessage(accountsQ.error)}
          </div>
        ) : cards.length === 0 ? (
          <EmptyState
            icon={CardIcon}
            title="Nenhum cartão cadastrado"
            description="Cadastre um cartão de crédito para acompanhar faturas e limite."
            action={
              <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Novo cartão
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <CardOverview key={card.id} card={card} />
            ))}
          </div>
        )}
      </div>

      <AccountForm entity={entity} open={creating} onOpenChange={setCreating} />
    </AppShell>
  );
}

function CardOverview({ card }: { card: Account }) {
  const invoicesQ = useCardInvoices(card.id);
  const current = (invoicesQ.data ?? []).find(
    (i) => i.status === "OPEN" || i.status === "CLOSED" || i.status === "PARTIAL",
  );
  const remaining = current ? subCents(current.calculatedAmount, invoicePaidTotal(current)) : null;

  return (
    <Link
      to="/cartoes/$cardId"
      params={{ cardId: card.id }}
      className="group rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:border-brand/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold" title={card.name}>
            {card.name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            limite {formatMoney(card.creditLimit ?? "0")} · fecha dia {card.closingDay}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="mt-4 border-t border-border/60 pt-3">
        {invoicesQ.isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : current ? (
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Fatura {current.month} · vence {formatDate(current.dueDate)}
              </p>
              <MoneyText cents={remaining ?? "0"} kind="expense" className="font-display text-xl" />
            </div>
            <StatusPill status={current.status} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Sem fatura em aberto.</p>
        )}
      </div>
    </Link>
  );
}
