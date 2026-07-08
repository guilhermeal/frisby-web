import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth/context";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Configuracoes,
});

function Configuracoes() {
  const { user, logout } = useAuth();
  const { entity } = useCurrentEntity();
  const navigate = useNavigate();

  async function handleSignOut() {
    await logout();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell>
      <PageHeader title="Configurações" subtitle="Entidade, perfil, preferências" />

      <div className="mx-4 grid gap-6 sm:mx-6 lg:mx-0 lg:grid-cols-2 xl:grid-cols-3">
        <SettingsCard title="Perfil" desc="Como você aparece no Frisby">
          <Field label="Nome">
            <Input defaultValue={user?.name ?? ""} />
          </Field>
          <Field label="Email">
            <Input defaultValue={user?.email ?? ""} type="email" />
          </Field>
          <Field label="Idioma">
            <Input defaultValue="pt-BR" />
          </Field>
          <Field label="Fuso horário">
            <Input defaultValue="America/Sao_Paulo" />
          </Field>
        </SettingsCard>

        <SettingsCard
          title="Entidade ativa"
          desc={entity ? `${entity.name} · ${entity.type === "COMPANY" ? "Empresa" : "Casa"}` : "Nenhuma entidade selecionada"}
        >
          <Field label="Nome">
            <Input defaultValue={entity?.name ?? ""} />
          </Field>
          <Field label="Moeda base">
            <Input defaultValue={entity?.baseCurrency ?? "BRL"} />
          </Field>
          <Button variant="outline" className="mt-2">
            Salvar alterações
          </Button>
        </SettingsCard>

        <SettingsCard title="Notificações" desc="Frisby só te lembra do necessário">
          <Toggle label="Contas a vencer" defaultChecked />
          <Toggle label="Fatura fechada" defaultChecked />
          <Toggle label="Orçamento excedido" defaultChecked />
          <Toggle label="Resumo semanal por email" />
        </SettingsCard>

        <SettingsCard title="Plano Frisby Casa" desc="Ajuste conforme seu uso">
          <div className="rounded-xl border border-border/60 bg-secondary/60 p-4 text-sm">
            <p className="font-medium">Você está no plano Casa (grátis).</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Faça upgrade para múltiplas entidades, membros ilimitados e relatórios avançados.
            </p>
            <Button className="mt-3">Comparar planos</Button>
          </div>
        </SettingsCard>

        <SettingsCard title="Sessão" desc="Encerrar acesso neste dispositivo">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" /> Sair da conta
          </Button>
        </SettingsCard>

        <SettingsCard title="Privacidade (LGPD)" desc="Seus dados, suas regras">
          <Button variant="outline" className="w-full justify-start">
            Exportar meus dados
          </Button>
          <Button variant="outline" className="w-full justify-start text-expense">
            Excluir conta
          </Button>
        </SettingsCard>
      </div>
    </AppShell>
  );
}

function SettingsCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl bg-secondary/40 px-3 py-2.5 text-sm">
      <span>{label}</span>
      <Switch defaultChecked={defaultChecked} />
    </label>
  );
}
