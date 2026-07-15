// Diálogo de baixa (settle) — o gesto mais frequente do produto.
// Data + valor editável (pagar diferente do previsto) + conta (obrigatória
// se o lançamento não tem origem; sobrescrevível se tem) + reconciliação do
// rateio quando o valor mudou em lançamento MEMBERS.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { MoneyInput } from "@/components/frisby/money-input";
import { DatePicker } from "@/components/frisby/date-picker";
import { AccountSelect } from "@/components/frisby/account-select";
import { SplitBuilder, sharesSumOk, type Share } from "@/components/frisby/split-builder";
import { AttachmentUploader } from "@/components/frisby/attachment-uploader";
import { useMembers, useSettleTransaction } from "@/hooks/api";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { formatMoney } from "@/lib/money";
import { todayISO } from "@/lib/format";
import type { Transaction } from "@/lib/api/types";

interface SettleDialogProps {
  entityId: string | undefined;
  transaction: Transaction | null;
  onClose: () => void;
}

export function SettleDialog({ entityId, transaction, onClose }: SettleDialogProps) {
  const membersQ = useMembers(entityId);
  const settle = useSettleTransaction(entityId);

  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [shares, setShares] = useState<Share[]>([]);
  const [error, setError] = useState<string | null>(null);

  const open = !!transaction;

  useEffect(() => {
    if (!transaction) return;
    setDate(todayISO());
    setAmount(transaction.amount);
    setAccountId(transaction.accountId ?? undefined);
    setShares(transaction.shares ?? []);
    setError(null);
  }, [transaction]);

  if (!transaction) return null;

  const amountChanged = amount !== transaction.amount;
  const needsShareReconciliation = transaction.scope === "MEMBERS" && amountChanged;
  const sharesOk = !needsShareReconciliation || sharesSumOk(shares, amount);
  const canSubmit = !!accountId && !!amount && BigInt(amount) > 0n && sharesOk;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !transaction) return;
    try {
      await settle.mutateAsync({
        id: transaction.id,
        settlementDate: date,
        settledAmount: amountChanged ? amount : undefined,
        accountId,
        shares: needsShareReconciliation ? shares : undefined,
      });
      toast.success("Lançamento baixado");
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => !v && !settle.isPending && onClose()}
      title="Dar baixa"
      description={
        <>
          {transaction.description || "Lançamento"} · previsto{" "}
          <span className="font-medium text-foreground">{formatMoney(transaction.amount)}</span>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4 pb-1">
        <div className="space-y-1.5">
          <Label>Data da baixa</Label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="settle-amount">Valor realmente pago</Label>
          <MoneyInput id="settle-amount" value={amount} onChange={setAmount} />
          {amountChanged && (
            <p className="text-xs text-muted-foreground">
              Diferente do previsto ({formatMoney(transaction.amount)}) — o valor baixado passa a
              ser o valor real do lançamento.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>
            Conta{" "}
            {!transaction.accountId && (
              <span className="font-normal text-expense">(obrigatória)</span>
            )}
          </Label>
          <AccountSelect
            entityId={entityId}
            value={accountId}
            onChange={(id) => setAccountId(id)}
            excludeTypes={["CREDIT_CARD"]}
          />
        </div>

        {needsShareReconciliation && (
          <div className="space-y-1.5">
            <Label>Reconciliar rateio</Label>
            <p className="text-xs text-muted-foreground">
              O valor mudou — ajuste as partes para fechar exatamente {formatMoney(amount || "0")}.
            </p>
            <SplitBuilder
              members={membersQ.data ?? []}
              total={amount}
              value={shares}
              onChange={setShares}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Anexos</Label>
          <AttachmentUploader target={{ kind: "transaction", id: transaction.id }} compact />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-expense/40 bg-expense/5 px-3 py-2 text-xs text-expense"
          >
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={!canSubmit || settle.isPending}>
          {settle.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirmar baixa
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
