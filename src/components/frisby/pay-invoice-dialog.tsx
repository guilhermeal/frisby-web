// Pagamento de fatura — o coração do ciclo do cartão (invariante 8: o caixa
// debita o valor PAGO, nunca o calculado). A frase viva explica o rollover:
// "Pagando R$ X de R$ Y — R$ Z rolam para a próxima fatura".

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { MoneyInput } from "@/components/frisby/money-input";
import { DatePicker } from "@/components/frisby/date-picker";
import { AccountSelect } from "@/components/frisby/account-select";
import { usePayInvoice } from "@/hooks/api";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { formatMoney, subCents } from "@/lib/money";
import { todayISO } from "@/lib/format";
import type { Invoice } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Total já pago de uma fatura. */
export function invoicePaidTotal(invoice: Invoice): string {
  return invoice.payments.reduce((acc, p) => (BigInt(acc) + BigInt(p.amount)).toString(), "0");
}

interface PayInvoiceDialogProps {
  entityId: string | undefined;
  cardId: string | null;
  invoice: Invoice | null;
  onClose: () => void;
}

export function PayInvoiceDialog({ entityId, cardId, invoice, onClose }: PayInvoiceDialogProps) {
  const payMutation = usePayInvoice(cardId ?? undefined);

  const [amount, setAmount] = useState("");
  const [payingAccountId, setPayingAccountId] = useState<string | undefined>(undefined);
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);

  const remaining = useMemo(
    () => (invoice ? subCents(invoice.calculatedAmount, invoicePaidTotal(invoice)) : "0"),
    [invoice],
  );

  useEffect(() => {
    if (!invoice) return;
    setAmount("");
    setPayingAccountId(undefined);
    setDate(todayISO());
    setError(null);
  }, [invoice]);

  if (!invoice) return null;

  const paying = amount || remaining;
  const rollover = subCents(remaining, paying);
  const rolloverBig = BigInt(rollover);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payingAccountId || !invoice) return;
    try {
      await payMutation.mutateAsync({
        invoiceId: invoice.id,
        amount: paying,
        payingAccountId,
        date,
      });
      toast.success("Pagamento registrado");
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <ResponsiveDialog
      open={!!invoice}
      onOpenChange={(v) => !v && !payMutation.isPending && onClose()}
      title="Pagar fatura"
      description={
        <>
          Fatura {invoice.month} · em aberto{" "}
          <span className="font-medium text-foreground">{formatMoney(remaining)}</span>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4 pb-1">
        <div className="space-y-1.5">
          <Label htmlFor="pay-amount">Valor (deixe vazio para pagar o total)</Label>
          <MoneyInput
            id="pay-amount"
            value={amount}
            onChange={setAmount}
            placeholder={formatMoney(remaining)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Conta pagadora</Label>
          <AccountSelect
            entityId={entityId}
            value={payingAccountId}
            onChange={(id) => setPayingAccountId(id)}
            excludeTypes={["CREDIT_CARD", "INVESTMENT"]}
            placeholder="Carteira ou conta bancária"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Data</Label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        {/* Frase viva do rollover */}
        {BigInt(paying || "0") > 0n && (
          <p
            className={cn(
              "rounded-lg px-3 py-2 text-xs",
              rolloverBig > 0n
                ? "bg-warning/10 text-warning-foreground text-foreground"
                : rolloverBig < 0n
                  ? "bg-transfer/10 text-transfer"
                  : "bg-income/10 text-income",
            )}
          >
            Pagando <strong>{formatMoney(paying)}</strong> de{" "}
            <strong>{formatMoney(remaining)}</strong>
            {rolloverBig > 0n && (
              <>
                {" "}
                — <strong>{formatMoney(rollover)}</strong> rolam para a próxima fatura.
              </>
            )}
            {rolloverBig < 0n && (
              <>
                {" "}
                — <strong>{formatMoney((-rolloverBig).toString())}</strong> viram crédito na próxima
                fatura.
              </>
            )}
            {rolloverBig === 0n && <> — a fatura fica quitada.</>}
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-expense/40 bg-expense/5 px-3 py-2 text-xs text-expense"
          >
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={!payingAccountId || payMutation.isPending}
        >
          {payMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirmar pagamento
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
