// Gate declarativo de permissão. mode="hide" (default) remove a ação;
// mode="disable" envolve em um wrapper desabilitado com tooltip explicativo.

import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePermissions } from "@/lib/auth/use-permissions";

interface PermissionGateProps {
  permission: string;
  mode?: "hide" | "disable";
  children: ReactNode;
}

export function PermissionGate({ permission, mode = "hide", children }: PermissionGateProps) {
  const { can, isLoading } = usePermissions();

  // Sem piscar: enquanto as permissões carregam, não mostramos a ação.
  if (isLoading) return null;
  if (can(permission)) return <>{children}</>;
  if (mode === "hide") return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="pointer-events-auto inline-block cursor-not-allowed opacity-50 [&>*]:pointer-events-none">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>Você não tem permissão para esta ação.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
