// Confirmação de e-mail via token do link (?token=). Página pública —
// funciona deslogado (o GET do backend não exige auth).

import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/frisby/auth-layout";
import { authApi } from "@/lib/api/endpoints";
import { apiErrorMessage } from "@/lib/api/error-messages";

const searchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/verify-email")({
  validateSearch: searchSchema,
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { token } = useSearch({ from: "/verify-email" });

  const verifyQ = useQuery({
    queryKey: ["verify-email", token],
    queryFn: () => authApi.confirmVerification(token!),
    enabled: !!token,
    retry: false,
  });

  if (!token) {
    return (
      <AuthLayout title="Link inválido" subtitle="Este link de verificação está incompleto.">
        <Button asChild variant="outline" className="w-full">
          <Link to="/auth">Ir para o login</Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Verificação de e-mail">
      {verifyQ.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Verificando…
        </div>
      ) : verifyQ.isError ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-expense/40 bg-expense/5 px-3 py-3 text-sm text-expense">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{apiErrorMessage(verifyQ.error)}</p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link to="/auth">Ir para o login</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-income/30 bg-income/5 px-3 py-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-income" />
            <p>E-mail verificado com sucesso!</p>
          </div>
          <Button asChild className="w-full">
            <Link to="/auth">Ir para o login</Link>
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
