// Transferências entre contas — NUNCA aparecem como despesa/receita
// (invariante 6). Lista com filtros, efetivar/estornar/excluir.

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeftRight, ArrowRight, Loader2, MoreVertical, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { MoneyText } from "@/components/frisby/money-text";
import { StatusPill } from "@/components/frisby/status-pill";
import { EmptyState } from "@/components/frisby/empty-state";
import { TransferForm } from "@/components/frisby/transfer-form";
import { ConfirmDialog } from "@/components/frisby/confirm-dialog";
import { PermissionGate } from "@/components/frisby/permission-gate";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { PERMISSIONS } from "@/lib/auth/use-permissions";
import {
  useAccounts,
  useDeleteTransfer,
  useEntities,
  useSettleTransfer,
  useTransfers,
  useUnsettleTransfer,
} from "@/hooks/api";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { formatDate } from "@/lib/format";
import type { Account, Transfer, TxStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/transferencias")({
  component: TransferenciasPage,
});

type StatusFilter = "all" | TxStatus;

function TransferenciasPage() {
  const { entity } = useCurrentEntity();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [creating, setCreating] = useState(false);

  const transfersQ = useTransfers(
    entity?.id,
    statusFilter === "all" ? undefined : { status: statusFilter },
  );
  const accountsQ = useAccounts(entity?.id);
  const entitiesQ = useEntities();
  const settleTransfer = useSettleTransfer(entity?.id);
  const unsettleTransfer = useUnsettleTransfer(entity?.id);
  const deleteTransfer = useDeleteTransfer(entity?.id);

  const accountMap = useMemo(() => {
    const m = new Map<string, Account>();
    for (const a of accountsQ.data ?? []) m.set(a.id, a);
    return m;
  }, [accountsQ.data]);

  const entityName = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of entitiesQ.data ?? []) m.set(e.id, e.name);
    return m;
  }, [entitiesQ.data]);

  async function handleSettle(t: Transfer) {
    try {
      await settleTransfer.mutateAsync(t.id);
      toast.success("Transferência efetivada — os dois saldos foram atualizados");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function handleUnsettle(t: Transfer) {
    try {
      await unsettleTransfer.mutateAsync(t.id);
      toast.success("Transferência estornada");
    } catch (err) {
      toast.error(apiErrorMessage(err));
      throw err;
    }
  }

  async function handleDelete(t: Transfer) {
    try {
      await deleteTransfer.mutateAsync(t.id);
      toast.success("Transferência excluída");
    } catch (err) {
      toast.error(apiErrorMessage(err));
      throw err;
    }
  }

  const rows = transfersQ.data ?? [];

  return (
    <AppShell>
      <PageHeader
        title="Transferências"
        subtitle="Movimentos entre contas — não contam como despesa nem receita"
        actions={
          <PermissionGate permission={PERMISSIONS.TRANSACTION_MANAGE}>
            <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nova</span>
            </Button>
          </PermissionGate>
        }
      />

      {/* Filtro por status */}
      <div className="mx-4 mb-4 flex gap-1.5 sm:mx-6 lg:mx-0">
        {(
          [
            ["all", "Todas"],
            ["SETTLED", "Efetivadas"],
            ["PLANNED", "Previstas"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setStatusFilter(id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              statusFilter === id
                ? "border-ink bg-ink text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mx-4 sm:mx-6 lg:mx-0">
        {transfersQ.isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : transfersQ.error ? (
          <div className="rounded-2xl border border-expense/30 bg-expense/5 p-6 text-sm text-expense">
            {apiErrorMessage(transfersQ.error)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="Nenhuma transferência"
            description="Mova dinheiro entre carteiras, bancos e investimentos."
            action={
              <PermissionGate permission={PERMISSIONS.TRANSACTION_MANAGE}>
                <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4" /> Nova transferência
                </Button>
              </PermissionGate>
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {rows.map((t) => {
              // O backend sempre inclui fromAccountName/toAccountName na
              // listagem — funciona mesmo quando o membro não tem permissão
              // account.viewOthers (não conseguiria resolver pelo accountMap
              // local, que só contém as contas que ele pode listar).
              const fromName = t.fromAccountName || accountMap.get(t.fromAccountId)?.name;
              const toName = t.toAccountName || accountMap.get(t.toAccountId)?.name;
              const cross = t.fromCurrency !== t.toCurrency;
              // Cross-entity: esta entidade pode ser a origem OU o destino da
              // transferência — a conta "do outro lado" não está no accountMap
              // local, então mostramos o nome da outra entidade em vez do "?".
              const isCrossEntity = !!t.toEntityId && t.toEntityId !== t.entityId;
              const isThisEntityOrigin = t.entityId === entity?.id;
              const otherEntityName = isCrossEntity
                ? entityName.get(isThisEntityOrigin ? t.toEntityId! : t.entityId)
                : undefined;
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-transfer/10 text-transfer">
                    <ArrowLeftRight className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {isCrossEntity ? (
                        isThisEntityOrigin ? (
                          <>
                            {fromName ?? "esta conta"}{" "}
                            <ArrowRight className="h-3 w-3 text-muted-foreground" /> Transferência
                            para {otherEntityName ?? "outra entidade"}
                          </>
                        ) : (
                          <>
                            Transferência de {otherEntityName ?? "outra entidade"}{" "}
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />{" "}
                            {toName ?? "esta conta"}
                          </>
                        )
                      ) : (
                        <>
                          {fromName ?? "?"} <ArrowRight className="h-3 w-3 text-muted-foreground" />{" "}
                          {toName ?? "?"}
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {t.kind === "CONTRIBUTION" && "Aporte · "}
                      {t.kind === "WITHDRAWAL" && "Resgate · "}
                      {t.description && `${t.description} · `}
                      {formatDate(t.date)}
                      {cross && ` · ${t.fromCurrency}→${t.toCurrency}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <MoneyText cents={t.fromAmount} kind="transfer" className="text-sm" />
                    <StatusPill status={t.status} />
                  </div>
                  <PermissionGate permission={PERMISSIONS.TRANSACTION_MANAGE}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Ações da transferência"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {t.status === "PLANNED" ? (
                          <DropdownMenuItem onClick={() => handleSettle(t)}>
                            Efetivar
                          </DropdownMenuItem>
                        ) : (
                          <ConfirmDialog
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                Estornar
                              </DropdownMenuItem>
                            }
                            title="Estornar transferência?"
                            description="Os saldos das DUAS contas serão revertidos."
                            confirmLabel="Estornar"
                            onConfirm={() => handleUnsettle(t)}
                          />
                        )}
                        <DropdownMenuSeparator />
                        <ConfirmDialog
                          trigger={
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-expense focus:text-expense"
                            >
                              Excluir
                            </DropdownMenuItem>
                          }
                          title="Excluir transferência?"
                          description={
                            t.status === "SETTLED"
                              ? "Ela está efetivada — excluir reverte os saldos das duas contas."
                              : "Esta ação não pode ser desfeita."
                          }
                          confirmLabel="Excluir"
                          destructive
                          onConfirm={() => handleDelete(t)}
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </PermissionGate>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <TransferForm entityId={entity?.id} open={creating} onOpenChange={setCreating} />
    </AppShell>
  );
}
