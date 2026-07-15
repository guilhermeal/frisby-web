// Permissões do usuário logado na ENTIDADE ATIVA. O backend não expõe "minhas
// permissões" diretamente: cruzamos GET /members (acha a membership do usuário)
// com GET /roles (que devolve o JSON de permissions de cada papel).
// A lógica de wildcard replica shared/permissions.ts do backend:
// "transaction.*" concede "transaction.create", "transaction.manage" etc.

import { useMemo } from "react";
import { useMembers, useRoles } from "@/hooks/api";
import { useCurrentEntity } from "./use-current-entity";
import { useAuth } from "./context";

// Catálogo (espelho do backend) — útil para autocomplete e para a matriz de papéis.
export const PERMISSIONS = {
  HOUSEHOLD_MANAGE: "household.manage",
  MEMBER_MANAGE: "member.manage",
  ACCOUNT_VIEW_OTHERS: "account.viewOthers",
  CATEGORY_MANAGE: "category.manage",
  TRANSACTION_MANAGE: "transaction.manage",
  TRANSACTION_CREATE: "transaction.create",
  TRANSACTION_READ: "transaction.read",
  REPORT_VIEW: "report.view",
  BUDGET_MANAGE: "budget.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Mesma semântica de hasPermission do backend (match exato ou wildcard de namespace). */
export function hasPermission(
  permissions: Record<string, boolean> | undefined,
  permission: string,
): boolean {
  if (!permissions) return false;
  if (permissions[permission] === true) return true;
  const namespace = permission.split(".")[0];
  return permissions[`${namespace}.*`] === true;
}

export function usePermissions(): {
  can: (permission: string) => boolean;
  isOwner: boolean;
  isLoading: boolean;
} {
  const { user } = useAuth();
  const { entity } = useCurrentEntity();
  const membersQ = useMembers(entity?.id);
  const rolesQ = useRoles(entity?.id);

  return useMemo(() => {
    const membership = membersQ.data?.find((m) => m.userId === user?.id);
    const role = rolesQ.data?.find((r) => r.id === membership?.roleId);
    const isLoading = membersQ.isLoading || rolesQ.isLoading;
    return {
      // Enquanto carrega, negamos — os gates usam isLoading para não "piscar".
      can: (permission: string) => hasPermission(role?.permissions, permission),
      isOwner: membership?.role === "OWNER",
      isLoading,
    };
  }, [membersQ.data, membersQ.isLoading, rolesQ.data, rolesQ.isLoading, user?.id]);
}
