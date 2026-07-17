// Membros e papéis (/entities/:id/members, /entities/:id/roles).

import { api } from "../client";
import type { Member, Role } from "../types";
import { mapMember, type ApiMembership } from "./mappers";

export const membersApi = {
  list: async (entityId: string): Promise<Member[]> => {
    const members = await api.get<ApiMembership[]>(`/entities/${entityId}/members`);
    return members.map(mapMember);
  },
};

export const rolesApi = {
  /** O backend devolve os roles com o JSON de permissions completo. */
  list: (entityId: string) => api.get<Role[]>(`/entities/${entityId}/roles`),
};

// ---------------------------------------------------------------------------
// Convites — página pública de aceite usa o token do link do e-mail.
// ---------------------------------------------------------------------------

export interface PublicInvitation {
  entityName: string;
  roleName: string;
  email: string;
  expiresAt: string;
}

export const invitationsApi = {
  /** Criar convite para novo membro. */
  create: async (entityId: string, body: { email: string; roleId: string }) => {
    return api.post<{ id: string; email: string; status: string }>(
      `/entities/${entityId}/invitations`,
      body,
    );
  },
  /** Dados públicos do convite (sem auth) — 404 se inválido/expirado. */
  getPublic: (token: string) =>
    api.get<PublicInvitation>(`/invitations/${token}`, undefined, { anonymous: true }),
  /** Aceita o convite (autenticado; o e-mail da conta deve bater com o do convite). */
  accept: (token: string) =>
    api.post<{ accepted: boolean; entityId: string }>(`/invitations/${token}/accept`, {}),
};
