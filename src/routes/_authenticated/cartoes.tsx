import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CreditCard as CardIcon, Calendar, ChevronRight, Loader2, Plus } from "lucide-react";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { MoneyText } from "@/components/frisby/money-text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts, useCardInvoices, usePayInvoice } from "@/hooks/api";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { formatMoney, subCents } from "@/lib/money";
import { formatDate } from "@/lib/format";
import type { Invoice } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/cartoes")({
  component: CartoesPage,
});

function CartoesPage() {
  const { entity } = useCurrentEntity();
  const accountsQ = useAccounts(entity?.id);
  const cards = (accountsQ.data ?? []).filter((a) => a.type === "CREDIT_CARD");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const activeCardId = selectedCardId ?? cards[0]?.id ?? null;

  const invoicesQ = useCardInvoices(activeCardId ?? undefined);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  return (
    <AppShell>
      <PageHeader
        title="Cartões"
        subtitle="Faturas, rollover e limites"
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo cartão</span>
          </Button>
        }
      />

      {accountsQ.isLoading ? (
        <LoadingBox />
      ) : cards.length === 0 ? (
        <div className="mx-4 rounded-2xl border border-dashed border-border/70 bg-card p-10 text-center sm:mx-6 lg:mx-0">
          <CardIcon className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">Nenhum cartão cadastrado</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cadastre um cartão em Contas para começar a acompanhar faturas.
          </p>
        </div>
      ) : (
        <>
          {/* Card selector (chips) */}
          <div className="mx-4 mb-4 flex gap-2 overflow-x-auto pb-1 sm:mx-6 lg:mx-0">
            {cards.map((c) => {
              const active = c.id === activeCardId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCardId(c.id)}
                  className={
                    "shrink-0 rounded-2xl border px-4 py-3 text-left transition-colors " +
                    (active
                      ? "border-ink bg-ink text-primary-foreground"
                      : "border-border bg-card hover:bg-secondary")
                  }
                >
                  <p className="font-display text-sm font-semibold">{c.name}</p>
                  <p
                    className={
                      "mt-0.5 text-[11px] " +
                      (active ? "text-primary-foreground/80" : "text-muted-foreground")
                    }
                  >
                    limite {formatMoney(c.creditLimit ?? "0")}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Invoices */}
          {invoicesQ.isLoading ? (
            <LoadingBox />
          ) : invoicesQ.error ? (
            <ErrorBox message={(invoicesQ.error as Error).message} />
          ) : (invoicesQ.data ?? []).length === 0 ? (
            <div className="mx-4 rounded-2xl border border-dashed border-border/70 bg-card p-8 text-center sm:mx-6 lg:mx-0">
              <p className="text-sm">Nenhuma fatura ainda para este cartão.</p>
            </div>
          ) : (
            <div className="mx-4 grid gap-3 sm:mx-6 lg:mx-0 lg:grid-cols-2 xl:grid-cols-3">
              {invoicesQ.data!.map((inv) => (
                <InvoiceCard
                  key={inv.id}
                  invoice={inv}
                  onPay={() => setPayingInvoice(inv)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <PayInvoiceDialog
        invoice={payingInvoice}
        cardId={activeCardId}
        onClose={() => setPayingInvoice(null)}
      />
    </AppShell>
  );
}

function InvoiceCard({ invoice, onPay }: { invoice: Invoice; onPay: () => void }) {
  const paid = invoice.payments.reduce((acc, p) => (BigInt(acc) + BigInt(p.amount)).toString(), "0");
  const remaining = subCents(invoice.calculatedAmount, paid);
  return (
    <article className="rounded-2xl border border-border/60 bg-card p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Fatura {invoice.month}
          </p>
          <p className="mt-0.5 font-display text-lg font-semibold">
            {formatMoney(invoice.calculatedAmount)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <Calendar className="mr-1 inline h-3 w-3" /> vence {formatDate(invoice.dueDate)}
          </p>
        </div>
        <StatusBadge status={invoice.status} />
      </header>

      {BigInt(invoice.carriedBalance) > 0n && (
        <p className="mt-3 rounded-lg bg-secondary/70 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          Rollover do mês anterior: {formatMoney(invoice.carriedBalance)}
        </p>
      )}

      <ul className="mt-3 space-y-1.5 text-xs">
        {invoice.purchases.slice(0, 3).map((p) => (
          <li key={p.txId} className="flex items-center justify-between gap-2">
            <span className="truncate text-muted-foreground">
              {p.description}
              {p.installment && ` (${p.installment})`}
            </span>
            <MoneyText cents={p.amount} kind="expense" className="text-xs" />
          </li>
        ))}
        {invoice.purchases.length > 3 && (
          <li className="text-[10px] text-muted-foreground">
            + {invoice.purchases.length - 3} compras
          </li>
        )}
      </ul>

      <footer className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Em aberto</p>
          <MoneyText cents={remaining} kind="expense" className="text-sm font-semibold" />
        </div>
        <Button
          size="sm"
          variant={invoice.status === "PAID" ? "outline" : "default"}
          onClick={onPay}
          disabled={invoice.status === "PAID"}
          className="gap-1.5"
        >
          {invoice.status === "PAID" ? "Ver detalhes" : "Pagar"}
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </footer>
    </article>
  );
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  const map: Record<Invoice["status"], { label: string; cls: string }> = {
    OPEN: { label: "Aberta", cls: "bg-brand-soft text-ink" },
    CLOSED: { label: "Fechada", cls: "bg-secondary text-foreground" },
    PARTIAL: { label: "Parcial", cls: "bg-transfer/10 text-transfer" },
    PAID: { label: "Paga", cls: "bg-income/10 text-income" },
  };
  const { label, cls } = map[status];
  return <Badge className={cls + " border-transparent"}>{label}</Badge>;
}

function PayInvoiceDialog({
  invoice,
  cardId,
  onClose,
}: {
  invoice: Invoice | null;
  cardId: string | null;
  onClose: () => void;
}) {
  const { entity } = useCurrentEntity();
  const accountsQ = useAccounts(entity?.id);
  const payables = (accountsQ.data ?? []).filter((a) => a.type !== "CREDIT_CARD");
  const payMutation = usePayInvoice(cardId ?? undefined);

  const remaining = useMemo(() => {
    if (!invoice) return "0";
    const paid = invoice.payments.reduce(
      (acc, p) => (BigInt(acc) + BigInt(p.amount)).toString(),
      "0",
    );
    return subCents(invoice.calculatedAmount, paid);
  }, [invoice]);

  const [amount, setAmount] = useState("");
  const [payingAccountId, setPayingAccountId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const open = !!invoice;
  const onOpenChange = (v: boolean) => {
    if (!v) {
      onClose();
      setAmount("");
      setPayingAccountId("");
    }
  };

  async function submit() {
    if (!invoice) return;
    const cents = amount ? String(Math.round(Number(amount.replace(",", ".")) * 100)) : remaining;
    await payMutation.mutateAsync({
      invoiceId: invoice.id,
      amount: cents,
      payingAccountId,
      date,
    });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar fatura</DialogTitle>
          <DialogDescription>
            {invoice && (
              <>
                Fatura {invoice.month} · em aberto{" "}
                <span className="font-medium text-foreground">{formatMoney(remaining)}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Valor (deixe vazio para pagar total)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder={invoice ? formatMoney(remaining).replace(/\s/g, " ") : ""}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Conta pagadora</Label>
            <Select value={payingAccountId} onValueChange={setPayingAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha uma conta" />
              </SelectTrigger>
              <SelectContent>
                {payables.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} · {formatMoney(a.balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {payMutation.error && (
            <p className="text-xs text-expense">
              {(payMutation.error as Error).message}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={!payingAccountId || payMutation.isPending}
            className="gap-1.5"
          >
            {payMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LoadingBox() {
  return (
    <div className="mx-4 flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card p-10 text-sm text-muted-foreground sm:mx-6 lg:mx-0">
      <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mx-4 rounded-2xl border border-expense/30 bg-expense/5 p-6 text-sm text-expense sm:mx-6 lg:mx-0">
      {message}
    </div>
  );
}
