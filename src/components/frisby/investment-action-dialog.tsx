// Ações de investimento: aporte (CONTRIBUTION), resgate (WITHDRAWAL),
// ou registrar rendimento. Cada modo é claramente separado visualmente.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { MoneyInput } from "@/components/frisby/money-input";
import { DatePicker } from "@/components/frisby/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateTransfer, useRegisterYield, useAccounts } from "@/hooks/api";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { todayISO } from "@/lib/format";
import type { Account } from "@/lib/api/types";

type Mode = "contribution" | "withdrawal" | "yield";

interface InvestmentActionDialogProps {
  entityId: string | undefined;
  investmentAccount: Account | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvestmentActionDialog({
  entityId,
  investmentAccount,
  open,
  onOpenChange,
}: InvestmentActionDialogProps) {
  const [mode, setMode] = useState<Mode>("contribution");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [toAccountId, setToAccountId] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const accountsQ = useAccounts(entityId);
  const createTransfer = useCreateTransfer(entityId);
  const registerYield = useRegisterYield(investmentAccount?.id);

  const cashAccounts = (accountsQ.data ?? []).filter(
    (a) => a.type === "WALLET" || a.type === "BANK",
  );

  const pending = createTransfer.isPending || registerYield.isPending;

  useEffect(() => {
    if (open) {
      setAmount("");
      setDate(todayISO());
      setToAccountId(undefined);
      setDescription("");
      setError(null);
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || BigInt(amount) <= 0n) {
      setError("Informe um valor.");
      return;
    }
    if (!investmentAccount) {
      setError("Conta de investimento não encontrada.");
      return;
    }
    setError(null);

    try {
      if (mode === "contribution") {
        if (!toAccountId) {
          setError("Escolha a conta de origem.");
          return;
        }
        await createTransfer.mutateAsync({
          kind: "CONTRIBUTION",
          fromAccountId: toAccountId,
          toAccountId: investmentAccount.id,
          fromAmount: amount,
          date,
          status: "SETTLED",
        });
        toast.success("Aporte registrado");
      } else if (mode === "withdrawal") {
        if (!toAccountId) {
          setError("Escolha a conta de destino.");
          return;
        }
        await createTransfer.mutateAsync({
          kind: "WITHDRAWAL",
          fromAccountId: investmentAccount.id,
          toAccountId,
          fromAmount: amount,
          date,
          status: "SETTLED",
        });
        toast.success("Resgate registrado");
      } else {
        await registerYield.mutateAsync({
          accountId: investmentAccount.id,
          amount,
          date,
          description: description || undefined,
        });
        toast.success("Rendimento registrado");
      }
      onOpenChange(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => !pending && onOpenChange(v)}
      title={
        mode === "contribution"
          ? "Aporte"
          : mode === "withdrawal"
            ? "Resgate"
            : "Registrar rendimento"
      }
      description={
        mode === "contribution"
          ? "Transferir dinheiro para este investimento"
          : mode === "withdrawal"
            ? "Sacar dinheiro do investimento"
            : "Registrar ganho (receita real)"
      }
    >
      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contribution">Aporte</TabsTrigger>
          <TabsTrigger value="withdrawal">Resgate</TabsTrigger>
          <TabsTrigger value="yield">Rendimento</TabsTrigger>
        </TabsList>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-amount">Valor</Label>
            <MoneyInput id="inv-amount" value={amount} onChange={setAmount} autoFocus />
          </div>

          {(mode === "contribution" || mode === "withdrawal") && (
            <div className="space-y-1.5">
              <Label htmlFor="inv-account">
                {mode === "contribution" ? "De qual conta?" : "Para qual conta?"}
              </Label>
              <select
                id="inv-account"
                value={toAccountId ?? ""}
                onChange={(e) => setToAccountId(e.target.value || undefined)}
                className="flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="">— Escolha uma conta —</option>
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="inv-date">Data</Label>
            <DatePicker value={date} onChange={setDate} />
          </div>

          {mode === "yield" && (
            <div className="space-y-1.5">
              <Label htmlFor="inv-desc">Descrição (opcional)</Label>
              <input
                id="inv-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: Rendimento da aplicação"
                className="flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              />
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-expense/40 bg-expense/5 px-3 py-2 text-xs text-expense"
            >
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </form>
      </Tabs>
    </ResponsiveDialog>
  );
}
