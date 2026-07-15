// Criação/edição de conta. Campos condicionais ao tipo (cartão exige limite
// + dias 1–28). Na edição a moeda fica travada (imutável após movimento) e o
// tipo não muda. Em entidade COMPANY a conta nasce no CNPJ; em PERSONAL, no
// usuário — a UI não expõe essa diferença técnica.

import { useEffect, useState } from "react";
import { CreditCard, Landmark, Loader2, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { MoneyInput } from "@/components/frisby/money-input";
import { useCreateAccount, useCurrencies, useUpdateAccount } from "@/hooks/api";
import { apiErrorMessage } from "@/lib/api/error-messages";
import type { Account, AccountType, Entity } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const TYPES: Array<{ type: AccountType; label: string; icon: typeof Wallet }> = [
  { type: "WALLET", label: "Carteira", icon: Wallet },
  { type: "BANK", label: "Banco", icon: Landmark },
  { type: "INVESTMENT", label: "Investimento", icon: TrendingUp },
  { type: "CREDIT_CARD", label: "Cartão", icon: CreditCard },
];

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

interface AccountFormProps {
  entity: Entity | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presente = edição. */
  account?: Account;
}

export function AccountForm({ entity, open, onOpenChange, account }: AccountFormProps) {
  const isEdit = !!account;
  const currenciesQ = useCurrencies();
  const createAccount = useCreateAccount(entity?.id, entity?.type);
  const updateAccount = useUpdateAccount(entity?.id);

  const [type, setType] = useState<AccountType>("BANK");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [initialBalance, setInitialBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [closingDay, setClosingDay] = useState(28);
  const [dueDay, setDueDay] = useState(10);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (account) {
      setType(account.type);
      setName(account.name);
      setCurrency(account.currency);
      setCreditLimit(account.creditLimit ?? "");
      setClosingDay(account.closingDay ?? 28);
      setDueDay(account.dueDay ?? 10);
    } else {
      setType("BANK");
      setName("");
      setCurrency("BRL");
      setInitialBalance("");
      setCreditLimit("");
      setClosingDay(28);
      setDueDay(10);
    }
  }, [open, account]);

  const isCard = type === "CREDIT_CARD";
  const pending = createAccount.isPending || updateAccount.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isCard && (!creditLimit || BigInt(creditLimit) <= 0n)) {
      setError("Cartão exige um limite de crédito.");
      return;
    }
    setError(null);
    try {
      if (isEdit && account) {
        await updateAccount.mutateAsync({
          accountId: account.id,
          name,
          ...(isCard ? { creditLimit, closingDay, dueDay } : {}),
        });
        toast.success("Conta atualizada");
      } else {
        await createAccount.mutateAsync({
          name,
          type,
          currency,
          initialBalance: isCard ? "0" : initialBalance || "0",
          ...(isCard ? { creditLimit, closingDay, dueDay } : {}),
        });
        toast.success(isCard ? "Cartão criado" : "Conta criada");
      }
      onOpenChange(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const currencies = currenciesQ.data ?? [
    { code: "BRL", name: "Real brasileiro", symbol: "R$", decimals: 2 },
  ];

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => !pending && onOpenChange(v)}
      title={isEdit ? "Editar conta" : "Nova conta"}
    >
      <form onSubmit={onSubmit} className="space-y-4 pb-1">
        {!isEdit && (
          <div className="grid grid-cols-4 gap-2">
            {TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setType(t.type)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 text-[11px] font-medium transition-colors",
                    type === t.type
                      ? "border-ink bg-ink text-primary-foreground"
                      : "border-border bg-card hover:bg-secondary",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="account-form-name">Nome</Label>
          <Input
            id="account-form-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isCard ? "Ex.: Hipercard" : "Ex.: Nubank"}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Moeda</Label>
          <Select value={currency} onValueChange={setCurrency} disabled={isEdit}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isEdit && (
            <p className="text-xs text-muted-foreground">
              A moeda fica travada depois das primeiras movimentações.
            </p>
          )}
        </div>

        {!isCard && !isEdit && (
          <div className="space-y-1.5">
            <Label htmlFor="account-form-balance">Saldo inicial</Label>
            <MoneyInput
              id="account-form-balance"
              value={initialBalance}
              onChange={setInitialBalance}
            />
          </div>
        )}

        {isCard && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="account-form-limit">Limite de crédito</Label>
              <MoneyInput id="account-form-limit" value={creditLimit} onChange={setCreditLimit} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dia de fechamento</Label>
                <Select value={String(closingDay)} onValueChange={(v) => setClosingDay(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        Dia {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Dia de vencimento</Label>
                <Select value={String(dueDay)} onValueChange={(v) => setDueDay(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        Dia {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
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
          {isEdit ? "Salvar alterações" : "Criar conta"}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
