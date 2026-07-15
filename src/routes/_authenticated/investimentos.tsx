// Investimentos: resumo consolidado + cards por conta com ações
// (aporte/resgate/rendimento).

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, PlusCircle, TrendingUp } from "lucide-react";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { InvestmentActionDialog } from "@/components/frisby/investment-action-dialog";
import { EmptyState } from "@/components/frisby/empty-state";
import { MoneyText } from "@/components/frisby/money-text";
import { PermissionGate } from "@/components/frisby/permission-gate";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts, useInvestmentsSummary } from "@/hooks/api";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { PERMISSIONS } from "@/lib/auth/use-permissions";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { formatMoney } from "@/lib/money";
import type { Account } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/investimentos")({
  component: InvestimentosPage,
});

function InvestimentosPage() {
  const { entity } = useCurrentEntity();
  const [actionAccount, setActionAccount] = useState<Account | undefined>(undefined);

  const accountsQ = useAccounts(entity?.id);
  const summaryQ = useInvestmentsSummary(entity?.id);

  const investmentAccounts = (accountsQ.data ?? []).filter((a) => a.type === "INVESTMENT");
  const summary = summaryQ.data;
  const consolidated = summary?.consolidated;

  const isLoading = accountsQ.isLoading || summaryQ.isLoading;

  return (
    <AppShell>
      <PageHeader title="Investimentos" subtitle="Saldo, aportes, resgates e rendimentos" />

      <div className="mx-4 space-y-4 sm:mx-6 lg:mx-0">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : summaryQ.error ? (
          <div className="rounded-2xl border border-expense/30 bg-expense/5 p-6 text-sm text-expense">
            {apiErrorMessage(summaryQ.error)}
          </div>
        ) : investmentAccounts.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Nenhuma conta de investimento"
            description="Crie uma conta de investimento para começar a acompanhar seus ganhos."
            action={
              <Button size="sm" className="gap-1.5">
                <PlusCircle className="h-4 w-4" /> Nova conta de investimento
              </Button>
            }
          />
        ) : (
          <>
            {consolidated && (
              <div className="rounded-2xl border border-border/60 bg-card p-5">
                <h3 className="mb-3 font-semibold">Consolidado</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Aportes</p>
                    <p className="font-medium">{formatMoney(consolidated.totalContributions)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Resgates</p>
                    <p className="font-medium">{formatMoney(consolidated.totalWithdrawals)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rendimento</p>
                    <p
                      className={cn(
                        "font-medium",
                        consolidated.totalYield > "0" ? "text-income" : "",
                      )}
                    >
                      {formatMoney(consolidated.totalYield)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Saldo</p>
                    <p className="font-medium">{formatMoney(consolidated.currentBalance)}</p>
                  </div>
                </div>
              </div>
            )}

            <ul className="space-y-3">
              {investmentAccounts.map((acc) => (
                <li key={acc.id} className="rounded-2xl border border-border/60 bg-card p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium">{acc.name}</h4>
                      <p className="text-sm font-semibold text-foreground">
                        <MoneyText cents={acc.balance} currency={acc.currency} />
                      </p>
                    </div>
                    <PermissionGate permission={PERMISSIONS.TRANSACTION_CREATE}>
                      <Button size="sm" variant="outline" onClick={() => setActionAccount(acc)}>
                        Ação
                      </Button>
                    </PermissionGate>
                  </div>
                  <p className="text-xs text-muted-foreground"></p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {actionAccount && (
        <InvestmentActionDialog
          entityId={entity?.id}
          investmentAccount={actionAccount}
          open={!!actionAccount}
          onOpenChange={(v) => !v && setActionAccount(undefined)}
        />
      )}
    </AppShell>
  );
}
