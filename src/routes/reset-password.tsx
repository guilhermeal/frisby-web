// Redefinição de senha via token do link do e-mail (?token=). Ao concluir,
// TODAS as sessões são revogadas pelo backend — o usuário entra de novo.

import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/frisby/auth-layout";
import { authApi } from "@/lib/api/endpoints";
import { apiErrorMessage } from "@/lib/api/error-messages";

const searchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: searchSchema,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = useSearch({ from: "/reset-password" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await authApi.resetPassword(token!, password);
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Link inválido" subtitle="Este link de redefinição está incompleto.">
        <Button asChild variant="outline" className="w-full">
          <Link to="/forgot-password">Pedir um novo link</Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Nova senha" subtitle="Escolha uma nova senha para a sua conta.">
      {done ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-income/30 bg-income/5 px-3 py-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-income" />
            <p>
              Senha redefinida com sucesso. Por segurança, todas as suas sessões foram encerradas —
              entre novamente.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to="/auth">Ir para o login</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-expense/40 bg-expense/5 px-3 py-2 text-xs text-expense"
            >
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Redefinir senha
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
