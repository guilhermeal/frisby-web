// Onboarding: passo 1 cria a primeira entidade (Casa ou Empresa com CNPJ);
// passo 2 oferece a primeira conta (opcional, pode pular). Sem AppShell —
// é um wizard de tela cheia. Também acessível depois, para criar novas
// entidades ("Nova entidade" no switcher).

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Briefcase, Home, Landmark, Loader2, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/frisby/money-input";
import { useCreateAccount, useCreateEntity } from "@/hooks/api";
import { writeCurrentEntityId } from "@/lib/auth/context";
import { apiErrorMessage } from "@/lib/api/error-messages";
import type { AccountType, Entity, EntityType } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

/** Máscara de CNPJ enquanto digita: 00.000.000/0000-00 */
function maskCnpj(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function OnboardingPage() {
  const [entity, setEntity] = useState<Entity | null>(null);

  return (
    <div className="grid min-h-svh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-ink text-primary-foreground">
            <span className="font-display text-sm font-bold">F</span>
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">frisby</span>
        </div>

        <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <StepDot active={!entity} done={!!entity} label="1. Entidade" />
          <div className="h-px flex-1 bg-border" />
          <StepDot active={!!entity} done={false} label="2. Primeira conta" />
        </div>

        {entity ? <AccountStep entity={entity} /> : <EntityStep onCreated={setEntity} />}
      </div>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 font-medium",
        done && "bg-income/10 text-income",
        active && !done && "bg-ink text-primary-foreground",
        !active && !done && "bg-secondary",
      )}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Passo 1 — Entidade
// ---------------------------------------------------------------------------

function EntityStep({ onCreated }: { onCreated: (entity: Entity) => void }) {
  const [type, setType] = useState<EntityType>("PERSONAL");
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const createEntity = useCreateEntity();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await createEntity.mutateAsync({
        name,
        type,
        ...(type === "COMPANY"
          ? { companyProfile: { taxId, legalName, tradeName: tradeName || undefined } }
          : {}),
      });
      writeCurrentEntityId(created.id);
      toast.success(`${type === "COMPANY" ? "Empresa" : "Casa"} criada!`);
      onCreated(created);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Vamos começar pela sua entidade
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Uma entidade agrupa contas, lançamentos e membros — sua casa ou sua empresa.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <TypeCard
            icon={<Home className="h-5 w-5" />}
            label="Casa"
            hint="Finanças pessoais e da família"
            active={type === "PERSONAL"}
            onClick={() => setType("PERSONAL")}
          />
          <TypeCard
            icon={<Briefcase className="h-5 w-5" />}
            label="Empresa"
            hint="Com CNPJ e papéis de equipe"
            active={type === "COMPANY"}
            onClick={() => setType("COMPANY")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="entity-name">Nome</Label>
          <Input
            id="entity-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === "COMPANY" ? "Minha Empresa" : "Casa da Família"}
          />
        </div>

        {type === "COMPANY" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                required
                inputMode="numeric"
                value={taxId}
                onChange={(e) => setTaxId(maskCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="legal-name">Razão social</Label>
              <Input
                id="legal-name"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trade-name">Nome fantasia (opcional)</Label>
              <Input
                id="trade-name"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
              />
            </div>
          </>
        )}

        <Button type="submit" className="w-full" disabled={createEntity.isPending}>
          {createEntity.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continuar
        </Button>
      </form>
    </div>
  );
}

function TypeCard({
  icon,
  label,
  hint,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-2xl border p-4 text-left transition-colors",
        active
          ? "border-ink bg-ink text-primary-foreground"
          : "border-border bg-card hover:bg-secondary",
      )}
    >
      {icon}
      <p className="mt-2 font-display text-sm font-semibold">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-[11px]",
          active ? "text-primary-foreground/70" : "text-muted-foreground",
        )}
      >
        {hint}
      </p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Passo 2 — Primeira conta (opcional)
// ---------------------------------------------------------------------------

const ACCOUNT_TYPES: Array<{ type: AccountType; label: string; icon: React.ReactNode }> = [
  { type: "WALLET", label: "Carteira", icon: <Wallet className="h-4 w-4" /> },
  { type: "BANK", label: "Banco", icon: <Landmark className="h-4 w-4" /> },
  { type: "INVESTMENT", label: "Investimento", icon: <TrendingUp className="h-4 w-4" /> },
];

function AccountStep({ entity }: { entity: Entity }) {
  const navigate = useNavigate();
  const [type, setType] = useState<AccountType>("BANK");
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const createAccount = useCreateAccount(entity.id, entity.type);

  function finish() {
    void navigate({ to: "/", replace: true });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createAccount.mutateAsync({
        name,
        type,
        currency: "BRL",
        initialBalance: balance || "0",
      });
      toast.success("Conta criada!");
      finish();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Sua primeira conta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cadastre uma conta para começar a lançar — cartões de crédito você adiciona depois em
        Contas.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {ACCOUNT_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => setType(t.type)}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors",
                type === t.type
                  ? "border-ink bg-ink text-primary-foreground"
                  : "border-border bg-card hover:bg-secondary",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="account-name">Nome da conta</Label>
          <Input
            id="account-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Nubank, Carteira"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="initial-balance">Saldo inicial</Label>
          <MoneyInput id="initial-balance" value={balance} onChange={setBalance} />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={finish}
            disabled={createAccount.isPending}
          >
            Pular
          </Button>
          <Button type="submit" className="flex-1" disabled={createAccount.isPending}>
            {createAccount.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar conta
          </Button>
        </div>
      </form>
    </div>
  );
}
