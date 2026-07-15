import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wallet,
  Users,
  Target,
  Sparkles,
  Tags,
  TrendingUp,
  Settings,
  Globe,
  ArrowLeftRight,
  ChevronRight,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";

export const Route = createFileRoute("/_authenticated/mais")({
  component: Mais,
});

const ITEMS = [
  {
    to: "/contas",
    label: "Contas",
    desc: "Carteiras, bancos, investimentos, cartões",
    icon: Wallet,
  },
  {
    to: "/transferencias",
    label: "Transferências",
    desc: "Movimente dinheiro entre contas",
    icon: ArrowLeftRight,
  },
  { to: "/categorias", label: "Categorias", desc: "Árvore de despesas e receitas", icon: Tags },
  { to: "/orcamentos", label: "Orçamentos", desc: "Metas por categoria", icon: Target },
  {
    to: "/investimentos",
    label: "Investimentos",
    desc: "Aportes, resgates e rendimentos",
    icon: TrendingUp,
  },
  { to: "/membros", label: "Membros & Papéis", desc: "Convites e permissões", icon: Users },
  { to: "/panorama", label: "Meu panorama", desc: "Consolidado entre entidades", icon: Sparkles },
  {
    to: "/configuracoes",
    label: "Configurações",
    desc: "Perfil, notificações, plano",
    icon: Settings,
  },
  { to: "/configuracoes", label: "Câmbio", desc: "Moedas e cotações", icon: Globe },
];

function Mais() {
  return (
    <AppShell>
      <PageHeader title="Mais" subtitle="Todos os recursos do Frisby" />
      <div className="mx-4 grid gap-3 sm:mx-6 sm:grid-cols-2 lg:mx-0 xl:grid-cols-3">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          return (
            <Link
              key={it.label}
              to={it.to}
              className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:border-brand/40 hover:bg-brand-soft/40"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-foreground group-hover:bg-background">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{it.label}</p>
                <p className="truncate text-xs text-muted-foreground">{it.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
