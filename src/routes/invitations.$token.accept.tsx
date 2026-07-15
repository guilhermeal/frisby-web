// Página pública de aceite de convite. Mostra entidade/papel,
// autentica se necessário, depois aceita.

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAcceptInvitation, useGetPublicInvitation } from "@/hooks/api";

export function InvitationAcceptPage({ params }: { params: { token: string } }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const invQ = useGetPublicInvitation(params.token);
  const acceptMutation = useAcceptInvitation(params.token);

  const invitation = invQ.data;
  const pending = acceptMutation.isPending;

  async function handleAccept() {
    try {
      await acceptMutation.mutateAsync();
      toast.success("Convite aceito! Você agora faz parte da entidade.");
      setTimeout(() => navigate({ to: "/" }), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao aceitar convite.";
      setError(message);
    }
  }

  if (invQ.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border/60 bg-card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (invQ.error || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm rounded-2xl border border-expense/30 bg-expense/5 p-6">
          <p className="text-sm text-expense">
            {invQ.error ? "Convite inválido, expirado ou já aceito." : "Convite não encontrado."}
          </p>
          <Button onClick={() => navigate({ to: "/auth" })} className="mt-4 w-full">
            Voltar ao login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border/60 bg-card p-6">
        <h1 className="text-lg font-semibold">Você foi convidado!</h1>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Entidade:</span>{" "}
            <strong>{invitation.entityName}</strong>
          </p>
          <p>
            <span className="text-muted-foreground">Papel:</span>{" "}
            <strong>{invitation.roleName}</strong>
          </p>
          <p className="text-xs text-muted-foreground">
            Convite enviado para <strong>{invitation.email}</strong>
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-expense/40 bg-expense/5 p-3 text-xs text-expense">
            {error}
          </div>
        )}

        <Button onClick={handleAccept} disabled={pending} className="w-full">
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Aceitar convite
        </Button>
      </div>
    </div>
  );
}
