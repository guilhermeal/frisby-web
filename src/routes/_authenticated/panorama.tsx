// Panorama: visão consolidada entre TODAS as entidades do usuário
// (GET /me/overview) — sem misturar lançamentos, só somatórios de topo.

import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Sparkles } from "lucide-react";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { EmptyState } from "@/components/frisby/empty-state";
import { MoneyText } from "@/components/frisby/money-text";
import { useOverview } from "@/hooks/api";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";

export const Route = createFileRoute("/_authenticated/panorama")({
  component: PanoramaPage,
});

function PanoramaPage() {
  const q = useOverview();
  const { setCurrent } = useCurrentEntity();

  const entities = q.data?.entities ?? [];
  const total = q.data?.total;

  return (
    <AppShell>
      <PageHeader title="Meu panorama" subtitle="Consolidado entre todas as suas entidades" />

      <div className="mx-4 space-y-4 sm:mx-6 lg:mx-0">
        {q.isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : q.error ? (
          <div className="rounded-2xl border border-expense/30 bg-expense/5 p-6 text-sm text-expense">
            {apiErrorMessage(q.error)}
          </div>
        ) : entities.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Nenhuma entidade encontrada"
            description="Crie uma Casa ou Empresa para ver o panorama consolidado."
          />
        ) : (
          <>
            {total && (
              <div className="rounded-2xl border-2 border-brand/40 bg-card p-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-brand">
                  Total consolidado
                </p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Ativos</p>
                    <MoneyText
                      cents={total.assets}
                      kind="income"
                      className="text-lg font-semibold"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Dívidas</p>
                    <MoneyText
                      cents={total.liabilities}
                      kind="expense"
                      className="text-lg font-semibold"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Patrimônio</p>
                    <MoneyText cents={total.netWorth} className="text-lg font-semibold" />
                  </div>
                </div>
              </div>
            )}

            <ul className="space-y-2.5">
              {entities.map((e) => (
                <li key={e.entityId} className="rounded-2xl border border-border/60 bg-card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{e.entityName}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.entityType === "PERSONAL" ? "Casa" : "Empresa"}
                      </p>
                    </div>
                    <Link
                      to="/"
                      onClick={() => setCurrent(e.entityId)}
                      className="text-xs font-medium text-brand hover:underline"
                    >
                      Ir para entidade →
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div>
                      <p className="text-muted-foreground">Ativos</p>
                      <MoneyText cents={e.assets} kind="income" className="text-sm" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Dívidas</p>
                      <MoneyText cents={e.liabilities} kind="expense" className="text-sm" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Patrimônio</p>
                      <MoneyText cents={e.netWorth} className="text-sm" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </AppShell>
  );
}
