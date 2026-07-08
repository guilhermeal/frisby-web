import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreditCard, Info, Lock } from "lucide-react";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { MoneyText } from "@/components/frisby/money-text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { accounts, invoices } from "@/lib/mock-data";
import { formatMoney, subCents } from "@/lib/money";
import { formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/cartoes")({
  component: CartoesPage,
});

function CartoesPage() {
  const card = accounts.find((a) => a.type === "CREDIT_CARD")!;
  const openInvoice = invoices.find((i) => i.status === "OPEN")!;
  const otherInvoices = invoices.filter((i) => i.id !== openInvoice.id);

  const available = BigInt(card.creditLimit!) - BigInt(card.usedAmount ?? "0");
  const usagePct =
    Number((BigInt(card.usedAmount ?? "0") * 100n) / BigInt(card.creditLimit!));

  return (
    <AppShell>
      <PageHeader
        title="Cartões"
        subtitle="Fatura aberta, histórico e projeções"
      />

      <div className="mx-4 grid gap-6 sm:mx-6 lg:mx-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Card summary */}
        <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-ink to-ink/85 p-6 text-primary-foreground shadow-[var(--shadow-lift)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest opacity-70">Cartão de crédito</p>
              <h3 className="mt-1 font-display text-2xl font-semibold">{card.name}</h3>
              <p className="mt-0.5 text-xs opacity-70">Marina · final 4471</p>
            </div>
            <CreditCard className="h-6 w-6 opacity-80" />
          </div>

          <div className="mt-8">
            <div className="mb-2 flex items-baseline justify-between text-xs opacity-80">
              <span>Limite disponível</span>
              <span className="tnum">{formatMoney(card.creditLimit!)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-display text-2xl font-semibold tnum">
                {formatMoney(available.toString())}
              </span>
              <span className="text-xs opacity-70">
                {formatMoney(card.usedAmount ?? "0")} em uso
              </span>
            </div>
          </div>

          <p className="mt-6 rounded-xl bg-white/10 p-3 text-xs leading-relaxed opacity-90">
            <Info className="mr-1 inline h-3.5 w-3.5" />
            Compras no cartão não movem o caixa — só entram na fatura. O caixa mexe quando a
            fatura é paga.
          </p>
        </div>

        {/* Open invoice */}
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-1 flex items-center gap-2">
            <Badge className="bg-warning/15 text-warning border-transparent hover:bg-warning/15">
              Aberta
            </Badge>
            <span className="text-xs text-muted-foreground">
              fecha em {formatLongDate(openInvoice.closingDate)}
            </span>
          </div>
          <h3 className="font-display text-xl font-semibold">
            Fatura de {invoiceMonthLabel(openInvoice.month)}
          </h3>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MiniStat label="Total calculado" value={formatMoney(openInvoice.calculatedAmount)} />
            <MiniStat
              label="Saldo trazido"
              value={formatMoney(openInvoice.carriedBalance)}
              hint={openInvoice.carriedBalance !== "0" ? "de meses anteriores" : "sem rollover"}
            />
            <MiniStat label="Vencimento" value={formatLongDate(openInvoice.dueDate)} />
          </div>

          <ul className="mt-5 divide-y divide-border/60 rounded-2xl border border-border/60 bg-background/60">
            {openInvoice.purchases.map((p) => (
              <li key={p.txId} className="flex items-center gap-3 px-4 py-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-[10px] font-bold uppercase text-muted-foreground">
                  {p.description.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.description}</p>
                  {p.installment && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      {p.installment}
                    </Badge>
                  )}
                </div>
                <MoneyText cents={p.amount} kind="expense" className="text-sm" />
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {openInvoice.purchases.length} compras nesta fatura
            </p>
            <PayInvoiceDialog
              total={openInvoice.calculatedAmount}
              dueDate={openInvoice.dueDate}
            />
          </div>
        </div>
      </div>

      {/* History */}
      <div className="mx-4 mt-8 sm:mx-6 lg:mx-0">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Histórico de faturas
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          <ul className="divide-y divide-border/60">
            {otherInvoices.map((inv) => (
              <li key={inv.id} className="grid gap-2 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-semibold">
                      {invoiceMonthLabel(inv.month)}
                    </h3>
                    <InvoiceStatusBadge status={inv.status} />
                    {(inv.status === "CLOSED" || inv.status === "PAID") && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Lock className="h-3 w-3" /> imutável
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Fechou {formatLongDate(inv.closingDate)} · venceu {formatLongDate(inv.dueDate)}
                  </p>
                  {inv.status === "PARTIAL" && (
                    <p className="mt-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                      Pago {formatMoney(inv.payments[0].amount)} de{" "}
                      {formatMoney(inv.calculatedAmount)}. {formatMoney(
                        subCents(inv.calculatedAmount, inv.payments[0].amount),
                      )}{" "}
                      rolaram para a próxima fatura.
                    </p>
                  )}
                </div>
                <div className="text-right sm:text-right">
                  <MoneyText
                    cents={inv.calculatedAmount}
                    kind="expense"
                    className="font-display text-lg"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {inv.payments.length} pagamento{inv.payments.length === 1 ? "" : "s"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-base font-semibold tnum">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PAID: { label: "paga", cls: "bg-income/12 text-income" },
    CLOSED: { label: "fechada", cls: "bg-secondary text-muted-foreground" },
    PARTIAL: { label: "parcial", cls: "bg-warning/15 text-warning" },
    OPEN: { label: "aberta", cls: "bg-warning/15 text-warning" },
  };
  const { label, cls } = map[status] ?? map.OPEN;
  return <Badge className={cn("border-transparent hover:opacity-100", cls)}>{label}</Badge>;
}

function invoiceMonthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
}

function PayInvoiceDialog({ total, dueDate }: { total: string; dueDate: string }) {
  const [amount, setAmount] = useState(total);
  const totalNum = BigInt(total);
  const paidNum = amount ? BigInt(amount) : 0n;
  const diff = totalNum - paidNum;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Pagar fatura</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-display">Pagar fatura</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="pay-amount" className="text-xs uppercase tracking-wider text-muted-foreground">
              Valor a pagar (centavos)
            </Label>
            <Input
              id="pay-amount"
              className="mt-1.5 font-display text-lg tnum"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Total calculado: <span className="tnum">{formatMoney(total)}</span> · vence{" "}
              {formatLongDate(dueDate)}
            </p>
          </div>

          <div className="rounded-xl bg-secondary/60 p-3 text-sm">
            Pagando <span className="tnum font-semibold">{formatMoney(amount || "0")}</span>{" "}
            de <span className="tnum">{formatMoney(total)}</span>,{" "}
            {diff > 0n ? (
              <>
                <span className="tnum font-semibold text-warning">
                  {formatMoney(diff.toString())}
                </span>{" "}
                rolam para a próxima fatura.
              </>
            ) : diff < 0n ? (
              <>
                <span className="tnum font-semibold text-income">
                  {formatMoney((-diff).toString())}
                </span>{" "}
                viram crédito na próxima fatura.
              </>
            ) : (
              <>fatura quitada em cheio.</>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline">Cancelar</Button>
          <Button>Confirmar pagamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
