import { createFileRoute, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/context";
import { useEntities } from "@/hooks/api";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function FullScreenLoader() {
  return (
    <div className="grid min-h-svh place-items-center bg-background text-muted-foreground">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    </div>
  );
}

function AuthenticatedLayout() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullScreenLoader />;

  if (status === "unauthenticated") {
    // Durante a transição para /auth este layout ainda re-renderiza com o
    // location já em /auth?redirect=... — re-emitir <Navigate> aqui aninharia
    // o redirect indefinidamente (/auth?redirect=/auth?...). Se a navegação
    // já está a caminho do login, não faz nada.
    if (location.href.startsWith("/auth")) return null;
    return <Navigate to="/auth" search={{ redirect: location.href }} replace />;
  }

  return (
    <EntityGate>
      <Outlet />
    </EntityGate>
  );
}

/**
 * Onboarding NÃO é obrigatório: um usuário sem nenhuma entidade pode navegar
 * livremente (perfil, configurações...). Só oferecemos o /onboarding como
 * atalho a partir do Início — cada tela que depende de entidade ativa mostra
 * seu próprio EmptyState orientando a criar a primeira Casa/Empresa.
 * Renderizado apenas quando autenticado (a query de entidades exige token).
 */
function EntityGate({ children }: { children: ReactNode }) {
  const entitiesQ = useEntities();

  if (entitiesQ.isLoading) return <FullScreenLoader />;

  return <>{children}</>;
}
