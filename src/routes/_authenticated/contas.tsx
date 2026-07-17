// Contas agrupadas por tipo, com criação/edição/arquivamento.
// Editar/arquivar só nas contas do PRÓPRIO usuário (o backend opera via
// /me/accounts); contas de outros membros e da empresa são somente leitura.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  CreditCard,
  Landmark,
  Wallet,
  TrendingUp,
  Loader2,
  MoreVertical,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { MoneyText } from "@/components/frisby/money-text";
import { EmptyState } from "@/components/frisby/empty-state";
import { AccountForm } from "@/components/frisby/account-form";
import { ConfirmDialog } from "@/components/frisby/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccounts, useArchiveAccount, useMembers } from "@/hooks/api";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { useAuth } from "@/lib/auth/context";
import { apiErrorMessage } from "@/lib/api/error-messages";
import type { Account, AccountType, Member } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/contas")({
  component: ContasPage,
});

const GROUPS: Array<{ type: AccountType; label: string; icon: LucideIcon }> = [
  { type: "WALLET", label: "Carteiras", icon: Wallet },
  { type: "BANK", label: "Contas bancárias", icon: Landmark },
  { type: "INVESTMENT", label: "Investimentos", icon: TrendingUp },
  { type: "CREDIT_CARD", label: "Cartões", icon: CreditCard },
];

function ContasPage() {
  const { entity } = useCurrentEntity();
  const { user } = useAuth();
  const accountsQ = useAccounts(entity?.id);
  const membersQ = useMembers(entity?.id);
  const archiveAccount = useArchiveAccount(entity?.id);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const memberMap = new Map<string, Member>();
  for (const m of membersQ.data ?? []) memberMap.set(m.userId, m);

  async function handleArchive(account: Account) {
    try {
      await archiveAccount.mutateAsync(account.id);
      toast.success(`Conta "${account.name}" arquivada`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
      throw err;
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Contas"
        subtitle="Todas as suas contas — reais e virtuais"
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nova conta</span>
          </Button>
        }
      />

      {accountsQ.isLoading ? (
        <div className="mx-4 flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card p-10 text-sm text-muted-foreground sm:mx-6 lg:mx-0">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando contas…
        </div>
      ) : accountsQ.error ? (
        <div className="mx-4 rounded-2xl border border-expense/30 bg-expense/5 p-6 text-sm text-expense sm:mx-6 lg:mx-0">
          Falha ao carregar contas: {apiErrorMessage(accountsQ.error)}
        </div>
      ) : (accountsQ.data ?? []).length === 0 ? (
        <div className="mx-4 sm:mx-6 lg:mx-0">
          <EmptyState
            icon={Wallet}
            title="Nenhuma conta cadastrada"
            description="Adicione carteiras, contas bancárias, investimentos e cartões."
            action={
              <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Adicionar primeira conta
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mx-4 space-y-6 sm:mx-6 lg:mx-0">
          {GROUPS.map((g) => {
            const items = (accountsQ.data ?? []).filter((a) => a.type === g.type);
            if (items.length === 0) return null;
            const Icon = g.icon;
            return (
              <section key={g.type}>
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.label}
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((a) => {
                    const own = a.ownerId === user?.id;
                    return (
                      <div
                        key={a.id}
                        className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className="truncate font-display text-base font-semibold"
                              title={a.name}
                            >
                              {a.name}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {memberMap.get(a.ownerId)?.displayName ??
                                (entity?.type === "COMPANY" ? "Empresa" : "—")}{" "}
                              · {a.currency}
                            </p>
                          </div>
                          {own && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  aria-label={`Ações da conta ${a.name}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={() => setEditing(a)}>
                                  Editar
                                </DropdownMenuItem>
                                <ConfirmDialog
                                  trigger={
                                    <DropdownMenuItem
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-expense focus:text-expense"
                                    >
                                      Arquivar
                                    </DropdownMenuItem>
                                  }
                                  title="Arquivar conta?"
                                  description="Contas com movimentações precisam estar com saldo zerado e sem fatura em aberto. A conta some das seleções; o histórico é preservado."
                                  confirmLabel="Arquivar"
                                  destructive
                                  onConfirm={() => handleArchive(a)}
                                />
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <div className="mt-4">
                          {a.type === "CREDIT_CARD" ? (
                            <>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Limite
                              </p>
                              <MoneyText
                                cents={a.creditLimit ?? "0"}
                                className="font-display text-xl"
                              />
                              <p className="mt-1 text-xs text-muted-foreground">
                                fecha dia {a.closingDay} · vence dia {a.dueDay}
                              </p>
                              <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                                <Link to="/cartoes/$cardId" params={{ cardId: a.id }}>
                                  Ver faturas e limite
                                </Link>
                              </Button>
                            </>
                          ) : (
                            <>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Saldo
                              </p>
                              <MoneyText cents={a.balance} className="font-display text-xl" />
                              {a.type === "INVESTMENT" && (
                                <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                                  <Link to="/investimentos">Ver investimentos</Link>
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <AccountForm entity={entity} open={creating} onOpenChange={setCreating} />
      <AccountForm
        entity={entity}
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        account={editing ?? undefined}
      />
    </AppShell>
  );
}
