// Formulário de transferência (De → Para). Sem categoria e sem escopo —
// transferência não é despesa nem receita. Cross-currency: quando as moedas
// diferem, o valor de destino é obrigatório e a taxa implícita é exibida.
// Cartão de crédito nunca participa (o backend rejeita; nem oferecemos).

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { MoneyInput } from "@/components/frisby/money-input";
import { DatePicker } from "@/components/frisby/date-picker";
import { AccountSelect } from "@/components/frisby/account-select";
import { useCreateTransfer } from "@/hooks/api";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { todayISO } from "@/lib/format";
import type { Account, TransferKind, TxStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface TransferFormProps {
  entityId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** GENERIC (padrão) | CONTRIBUTION (aporte) | WITHDRAWAL (resgate). */
  kind?: TransferKind;
  /** Pré-seleção (ex.: a conta de investimento no aporte/resgate). */
  defaultFromId?: string;
  defaultToId?: string;
}

const TITLES: Record<TransferKind, string> = {
  GENERIC: "Nova transferência",
  CONTRIBUTION: "Novo aporte",
  WITHDRAWAL: "Novo resgate",
};

export function TransferForm({
  entityId,
  open,
  onOpenChange,
  kind = "GENERIC",
  defaultFromId,
  defaultToId,
}: TransferFormProps) {
  const createTransfer = useCreateTransfer(entityId);

  const [fromId, setFromId] = useState<string | undefined>(defaultFromId);
  const [from, setFrom] = useState<Account | undefined>(undefined);
  const [toId, setToId] = useState<string | undefined>(defaultToId);
  const [to, setTo] = useState<Account | undefined>(undefined);
  const [amount, setAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState<TxStatus>("SETTLED");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFromId(defaultFromId);
    setFrom(undefined);
    setToId(defaultToId);
    setTo(undefined);
    setAmount("");
    setToAmount("");
    setDate(todayISO());
    setStatus("SETTLED");
    setDescription("");
    setError(null);
  }, [open, defaultFromId, defaultToId]);

  const crossCurrency = !!from && !!to && from.currency !== to.currency;

  const impliedRate = useMemo(() => {
    if (!crossCurrency || !amount || !toAmount) return null;
    const rate = Number(toAmount) / Number(amount);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    return `1 ${from!.currency} ≈ ${rate.toFixed(4)} ${to!.currency}`;
  }, [crossCurrency, amount, toAmount, from, to]);

  const validationError = useMemo((): string | null => {
    if (!fromId) return "Escolha a conta de origem.";
    if (!toId) return "Escolha a conta de destino.";
    if (fromId === toId) return "Origem e destino precisam ser contas diferentes.";
    if (!amount || BigInt(amount) <= 0n) return "Informe o valor.";
    if (crossCurrency && (!toAmount || BigInt(toAmount) <= 0n))
      return "Moedas diferentes — informe o valor recebido no destino.";
    return null;
  }, [fromId, toId, amount, crossCurrency, toAmount]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    try {
      await createTransfer.mutateAsync({
        kind,
        fromAccountId: fromId!,
        toAccountId: toId!,
        fromAmount: amount,
        toAmount: crossCurrency ? toAmount : undefined,
        date,
        status,
        description: description || undefined,
      });
      toast.success(
        kind === "CONTRIBUTION"
          ? "Aporte registrado"
          : kind === "WITHDRAWAL"
            ? "Resgate registrado"
            : "Transferência criada",
      );
      onOpenChange(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => !createTransfer.isPending && onOpenChange(v)}
      title={TITLES[kind]}
      description="Transferências movem dinheiro entre suas contas — não contam como despesa nem receita."
    >
      <form onSubmit={onSubmit} className="space-y-4 pb-1">
        <div className="space-y-1.5">
          <Label>De</Label>
          <AccountSelect
            entityId={entityId}
            value={fromId}
            onChange={(id, acc) => {
              setFromId(id);
              setFrom(acc);
            }}
            excludeTypes={["CREDIT_CARD"]}
            placeholder="Conta de origem"
          />
        </div>

        <div className="flex justify-center">
          <ArrowDown className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="space-y-1.5">
          <Label>Para</Label>
          <AccountSelect
            entityId={entityId}
            value={toId}
            onChange={(id, acc) => {
              setToId(id);
              setTo(acc);
            }}
            excludeTypes={["CREDIT_CARD"]}
            placeholder="Conta de destino"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="transfer-amount">
            Valor {crossCurrency && from ? `(${from.currency})` : ""}
          </Label>
          <MoneyInput
            id="transfer-amount"
            value={amount}
            onChange={setAmount}
            currency={(from?.currency as "BRL") ?? "BRL"}
          />
        </div>

        {crossCurrency && (
          <div className="space-y-1.5">
            <Label htmlFor="transfer-to-amount">Valor recebido ({to!.currency})</Label>
            <MoneyInput
              id="transfer-to-amount"
              value={toAmount}
              onChange={setToAmount}
              currency={(to!.currency as "BRL") ?? "BRL"}
            />
            {impliedRate && <p className="text-xs text-muted-foreground">Taxa: {impliedRate}</p>}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Data</Label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-secondary p-1">
          {(
            [
              ["PLANNED", "Prevista"],
              ["SETTLED", "Efetivada"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatus(id)}
              className={cn(
                "rounded-lg py-1.5 text-sm font-medium transition-colors",
                status === id ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="transfer-description">Descrição (opcional)</Label>
          <Input
            id="transfer-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: reserva do mês"
          />
        </div>

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
          disabled={createTransfer.isPending || !!validationError}
        >
          {createTransfer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {kind === "CONTRIBUTION" ? "Aportar" : kind === "WITHDRAWAL" ? "Resgatar" : "Transferir"}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
