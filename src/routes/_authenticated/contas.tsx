import { createFileRoute } from "@tanstack/react-router";
import { Plus, CreditCard, Landmark, Wallet, TrendingUp } from "lucide-react";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { MoneyText } from "@/components/frisby/money-text";
import { Button } from "@/components/ui/button";
import { accounts, memberById } from "@/lib/mock-data";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/contas")({
  component: ContasPage,
});

const GROUPS = [
  { type: "WALLET", label: "Carteiras", icon: Wallet },
  { type: "BANK", label: "Contas bancárias", icon: Landmark },
  { type: "INVESTMENT", label: "Investimentos", icon: TrendingUp },
  { type: "CREDIT_CARD", label: "Cartões", icon: CreditCard },
] as const;

function ContasPage() {
  return (
    <AppShell>
      <PageHeader
        title="Contas"
        subtitle="Todas as suas contas — reais e virtuais"
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nova conta</span>
          </Button>
        }
      />

      <div className="mx-4 space-y-6 sm:mx-6 lg:mx-0">
        {GROUPS.map((g) => {
          const items = accounts.filter((a) => a.type === g.type);
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
                {items.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-display text-base font-semibold">{a.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {memberById(a.ownerId)?.displayName} · {a.currency}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      {a.type === "CREDIT_CARD" ? (
                        <>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Usado
                          </p>
                          <MoneyText
                            cents={a.usedAmount ?? "0"}
                            kind="expense"
                            className="font-display text-xl"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            de {formatMoney(a.creditLimit!)} · fecha dia {a.closingDay} · vence dia {a.dueDay}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Saldo
                          </p>
                          <MoneyText cents={a.balance} className="font-display text-xl" />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
