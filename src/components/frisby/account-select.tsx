// Seletor de conta ("Pago com / Recebido em") agrupado pelo DONO da conta —
// a origem pode ser de qualquer membro da entidade. Cartões aparecem com
// ícone próprio; o formulário decide o que fazer quando um cartão é escolhido.

import { CreditCard, Landmark, TrendingUp, Wallet } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts, useMembers } from "@/hooks/api";
import { formatMoney } from "@/lib/money";
import type { Account, AccountType } from "@/lib/api/types";

const TYPE_ICON: Record<AccountType, typeof Wallet> = {
  WALLET: Wallet,
  BANK: Landmark,
  INVESTMENT: TrendingUp,
  CREDIT_CARD: CreditCard,
};

interface AccountSelectProps {
  entityId: string | undefined;
  value: string | undefined;
  onChange: (accountId: string, account: Account | undefined) => void;
  /** Tipos a excluir (ex.: ["CREDIT_CARD"] no pagamento de fatura). */
  excludeTypes?: AccountType[];
  placeholder?: string;
  disabled?: boolean;
}

export function AccountSelect({
  entityId,
  value,
  onChange,
  excludeTypes = [],
  placeholder = "Escolha uma conta",
  disabled,
}: AccountSelectProps) {
  const accountsQ = useAccounts(entityId);
  const membersQ = useMembers(entityId);

  const accounts = (accountsQ.data ?? []).filter((a) => !excludeTypes.includes(a.type));
  const memberName = new Map((membersQ.data ?? []).map((m) => [m.userId, m.displayName]));

  // Agrupa por dono; contas da empresa (ownerId = entityId) viram "Empresa".
  const groups = new Map<string, Account[]>();
  for (const account of accounts) {
    const owner = memberName.get(account.ownerId) ?? "Empresa";
    const list = groups.get(owner) ?? [];
    list.push(account);
    groups.set(owner, list);
  }

  return (
    <Select
      value={value ?? ""}
      onValueChange={(id) =>
        onChange(
          id,
          accounts.find((a) => a.id === id),
        )
      }
      disabled={disabled || accountsQ.isLoading}
    >
      <SelectTrigger>
        <SelectValue placeholder={accountsQ.isLoading ? "Carregando…" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {accounts.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Nenhuma conta disponível — cadastre em Contas.
          </div>
        )}
        {[...groups.entries()].map(([owner, list]) => (
          <SelectGroup key={owner}>
            <SelectLabel>{owner}</SelectLabel>
            {list.map((account) => {
              const Icon = TYPE_ICON[account.type];
              return (
                <SelectItem key={account.id} value={account.id}>
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{account.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {account.type === "CREDIT_CARD"
                        ? "cartão"
                        : formatMoney(account.balance, account.currency)}
                    </span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
