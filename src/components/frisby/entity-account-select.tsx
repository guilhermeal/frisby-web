// Seletor de conta de DESTINO para transferências — pode navegar entre as
// entidades do usuário (ex. "Empresa X > Conta PJ Itaú", "Casa > Conta da
// Raylane"), agrupado por entidade e, dentro dela, por dono da conta.
// Usado só no campo "Para" do TransferForm; a origem continua restrita à
// entidade ativa (AccountSelect).

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
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
import { useEntities, useMembers } from "@/hooks/api";
import { accountsApi } from "@/lib/api/endpoints";
import { qk } from "@/hooks/api/keys";
import { formatMoney } from "@/lib/money";
import type { Account, AccountType, Entity } from "@/lib/api/types";

const TYPE_ICON: Record<AccountType, typeof Wallet> = {
  WALLET: Wallet,
  BANK: Landmark,
  INVESTMENT: TrendingUp,
  CREDIT_CARD: CreditCard,
};

interface EntityAccountSelectProps {
  /** Entidade de origem — usada só para rotular "(mesma entidade)" na própria opção. */
  currentEntityId: string | undefined;
  value: string | undefined;
  onChange: (accountId: string, account: Account | undefined, entityId: string | undefined) => void;
  excludeTypes?: AccountType[];
  placeholder?: string;
  disabled?: boolean;
}

export function EntityAccountSelect({
  currentEntityId,
  value,
  onChange,
  excludeTypes = [],
  placeholder = "Escolha uma conta",
  disabled,
}: EntityAccountSelectProps) {
  const entitiesQ = useEntities();
  const entities = entitiesQ.data ?? [];

  // Busca as contas de TODAS as entidades do usuário em paralelo.
  const accountsQueries = useQueries({
    queries: entities.map((e) => ({
      queryKey: qk.accounts(e.id),
      queryFn: () => accountsApi.list(e.id),
      enabled: !!e.id,
    })),
  });

  const membersQ = useMembers(currentEntityId);
  const memberName = new Map((membersQ.data ?? []).map((m) => [m.userId, m.displayName]));

  const isLoading = entitiesQ.isLoading || accountsQueries.some((q) => q.isLoading);

  // Mapa accountId -> entityId, para devolver ao onChange.
  const accountEntityMap = useMemo(() => {
    const map = new Map<string, string>();
    entities.forEach((e, idx) => {
      const accounts = accountsQueries[idx]?.data ?? [];
      for (const a of accounts) map.set(a.id, e.id);
    });
    return map;
  }, [entities, accountsQueries]);

  const groups: Array<{ entity: Entity; accounts: Account[] }> = entities.map((e, idx) => ({
    entity: e,
    accounts: (accountsQueries[idx]?.data ?? []).filter((a) => !excludeTypes.includes(a.type)),
  }));

  const allAccounts = groups.flatMap((g) => g.accounts);
  const selected = allAccounts.find((a) => a.id === value);

  return (
    <Select
      value={value ?? ""}
      onValueChange={(id) => {
        const account = allAccounts.find((a) => a.id === id);
        onChange(id, account, accountEntityMap.get(id));
      }}
      disabled={disabled || isLoading}
    >
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? "Carregando…" : placeholder}>
          {selected && (
            <span className="flex items-center gap-2">
              {selected.name}
              {accountEntityMap.get(selected.id) !== currentEntityId && (
                <span className="text-xs text-muted-foreground">
                  · {entities.find((e) => e.id === accountEntityMap.get(selected.id))?.name}
                </span>
              )}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allAccounts.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma conta disponível.</div>
        )}
        {groups.map(({ entity, accounts }) => {
          if (accounts.length === 0) return null;
          // Dentro da entidade, agrupa por dono (igual ao AccountSelect clássico).
          const byOwner = new Map<string, Account[]>();
          for (const account of accounts) {
            const owner =
              entity.id === currentEntityId ? (memberName.get(account.ownerId) ?? "Empresa") : "";
            const list = byOwner.get(owner) ?? [];
            list.push(account);
            byOwner.set(owner, list);
          }
          return (
            <SelectGroup key={entity.id}>
              <SelectLabel className="font-semibold text-foreground">
                {entity.name} {entity.id === currentEntityId ? "(esta entidade)" : ""}
              </SelectLabel>
              {[...byOwner.entries()].map(([owner, list]) =>
                list.map((account) => {
                  const Icon = TYPE_ICON[account.type];
                  return (
                    <SelectItem key={account.id} value={account.id}>
                      <span className="flex items-center gap-2 pl-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{account.name}</span>
                        {owner && <span className="text-xs text-muted-foreground">({owner})</span>}
                        <span className="text-xs text-muted-foreground">
                          {account.type === "CREDIT_CARD"
                            ? "cartão"
                            : formatMoney(account.balance, account.currency)}
                        </span>
                      </span>
                    </SelectItem>
                  );
                }),
              )}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
