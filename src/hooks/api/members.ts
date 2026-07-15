import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { membersApi, rolesApi, invitationsApi, authApi } from "@/lib/api/endpoints";
import { qk } from "./keys";

export function useMembers(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.members(entityId ?? ""),
    queryFn: () => membersApi.list(entityId!),
    enabled: !!entityId,
  });
}

export function useRoles(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.roles(entityId ?? ""),
    queryFn: () => rolesApi.list(entityId!),
    enabled: !!entityId,
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me(),
  });
}

export function useGetPublicInvitation(token: string) {
  return useQuery({
    queryKey: ["invitations", "public", token],
    queryFn: () => invitationsApi.getPublic(token),
    enabled: !!token,
  });
}

export function useCreateInvitation(entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, roleId }: { email: string; roleId: string }) =>
      invitationsApi.create(entityId!, { email, roleId }),
    onSuccess: () => {
      if (entityId) {
        qc.invalidateQueries({ queryKey: ["invitations", entityId] });
      }
    },
  });
}

export function useAcceptInvitation(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => invitationsApi.accept(token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth"] });
      qc.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}
