// Membros: gerenciar equipe (criar, editar papel, remover).
// Tabs: Membros / Convites pendentes / Papéis (matriz de permissões).

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, MoreVertical, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/frisby/app-shell";
import { EmptyState } from "@/components/frisby/empty-state";
import { InvitationForm } from "@/components/frisby/invitation-form";
import { PermissionGate } from "@/components/frisby/permission-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMembers, useRoles, useCurrentUser } from "@/hooks/api";
import { useCurrentEntity } from "@/lib/auth/use-current-entity";
import { PERMISSIONS } from "@/lib/auth/use-permissions";
import { apiErrorMessage } from "@/lib/api/error-messages";

export const Route = createFileRoute("/_authenticated/membros")({
  component: MembrosPage,
});

function MembrosPage() {
  const { entity } = useCurrentEntity();
  const userQ = useCurrentUser();
  const [inviting, setInviting] = useState(false);

  const membersQ = useMembers(entity?.id);
  const rolesQ = useRoles(entity?.id);

  const members = membersQ.data ?? [];
  const roles = rolesQ.data ?? [];
  const roleMap = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const currentUser = userQ.data;

  const isLoading = membersQ.isLoading || rolesQ.isLoading;

  return (
    <AppShell>
      <PageHeader
        title="Membros"
        subtitle="Gerencie a equipe desta entidade"
        actions={
          <PermissionGate permission={PERMISSIONS.MEMBER_MANAGE}>
            <Button size="sm" className="gap-1.5" onClick={() => setInviting(true)}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Convidar</span>
            </Button>
          </PermissionGate>
        }
      />

      <div className="mx-4 space-y-4 sm:mx-6 lg:mx-0">
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Membros ({members.length})</TabsTrigger>
            <TabsTrigger value="roles">Papéis ({roles.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            ) : members.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nenhum membro"
                description="Convide pessoas para participar desta entidade."
              />
            ) : (
              <ul className="space-y-2.5">
                {members.map((member) => {
                  const role = roleMap.get(member.roleId);
                  const isSelf = member.userId === currentUser?.id;
                  return (
                    <li
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-card p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{member.email}</p>
                        {member.displayName && (
                          <p className="text-xs text-muted-foreground">{member.displayName}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0 ml-2">
                        {role?.name ?? member.roleId}
                      </Badge>
                      <PermissionGate permission={PERMISSIONS.MEMBER_MANAGE}>
                        {!isSelf && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 ml-2"
                                aria-label={`Ações de ${member.displayName ?? member.email}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem disabled>Remover (em breve)</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </PermissionGate>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="roles" className="mt-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            ) : roles.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nenhum papel"
                description="Crie papéis customizados com permissões específicas."
              />
            ) : (
              <ul className="space-y-2.5">
                {roles.map((role: (typeof roles)[0]) => (
                  <li key={role.id} className="rounded-lg border border-border/60 bg-card p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-medium">{role.name}</p>
                      <Badge variant="outline">{role.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {
                        Object.entries(role.permissions || {}).filter(([, enabled]) => enabled)
                          .length
                      }{" "}
                      permissão(ões)
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <InvitationForm entityId={entity?.id} open={inviting} onOpenChange={setInviting} />
    </AppShell>
  );
}
