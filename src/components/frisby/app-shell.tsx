import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import {
  Home,
  ArrowLeftRight,
  CreditCard,
  BarChart3,
  MoreHorizontal,
  Plus,
  Sun,
  Moon,
  ChevronDown,
  Wallet,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { entities, currentEntity } from "@/lib/mock-data";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
}

const NAV: NavItem[] = [
  { to: "/", label: "Início", icon: Home },
  { to: "/lancamentos", label: "Lançamentos", icon: ArrowLeftRight },
  { to: "/cartoes", label: "Cartões", icon: CreditCard },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/mais", label: "Mais", icon: MoreHorizontal },
];

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const stored = localStorage.getItem("frisby-theme") as "light" | "dark" | null;
    const initial = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);
  return {
    theme,
    toggle: () => {
      const next = theme === "dark" ? "light" : "dark";
      setTheme(next);
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("frisby-theme", next);
    },
  };
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-svh bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6 xl:px-10 2xl:px-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-ink text-primary-foreground">
              <span className="font-display text-sm font-bold">F</span>
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">frisby</span>
          </Link>

          <div className="mx-2 h-6 w-px bg-border" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 -ml-1 max-w-[45vw] truncate">
                <span className="hidden text-xs uppercase tracking-wider text-muted-foreground sm:inline">
                  {currentEntity.type === "COMPANY" ? "Empresa" : "Casa"}
                </span>
                <span className="truncate font-medium">{currentEntity.name}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Trocar entidade</DropdownMenuLabel>
              {entities.map((e) => (
                <DropdownMenuItem key={e.id} className="flex items-center justify-between">
                  <span className="truncate">{e.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.type === "COMPANY" ? "Empresa" : "Casa"}
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Plus className="mr-2 h-4 w-4" /> Nova entidade
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu de usuário">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-ink">
                    MA
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Marina Alves</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/configuracoes">
                    <Settings className="mr-2 h-4 w-4" /> Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>Perfil</DropdownMenuItem>
                <DropdownMenuItem>Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] gap-8 px-0 lg:px-6 xl:px-10 2xl:px-16">
        {/* Sidebar (desktop/tv) */}
        <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-56 shrink-0 flex-col gap-1 py-8 lg:flex xl:w-64 2xl:w-72">
          {NAV.map((item) => {
            const active = isActive(pathname, item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-ink text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="mt-auto rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Plano
            </p>
            <p className="mt-1 font-display text-lg">Frisby Casa</p>
            <p className="mt-1 text-xs text-muted-foreground">
              2 membros · 5 contas · uso confortável
            </p>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 pb-28 pt-4 sm:pt-6 lg:pb-12">{children}</main>
      </div>

      {/* FAB (mobile only) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="fixed bottom-20 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-ink text-primary-foreground shadow-[var(--shadow-lift)] transition-transform active:scale-95 lg:hidden"
            aria-label="Novo lançamento"
          >
            <Plus className="h-6 w-6" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="mb-2 w-56">
          <DropdownMenuItem>Despesa</DropdownMenuItem>
          <DropdownMenuItem>Receita</DropdownMenuItem>
          <DropdownMenuItem>Transferência</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Bottom nav (mobile) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map((item) => {
            const active = isActive(pathname, item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "text-brand")} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname.startsWith(to);
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 px-4 sm:px-6 lg:px-0">
      <div className="min-w-0">
        <h1 className="truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-6", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between px-4 sm:px-6 lg:px-0">
          {title && (
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function WalletIcon() {
  return <Wallet className="h-4 w-4" />;
}
