// Esqueci a senha. A resposta do backend é sempre neutra (não revela se o
// e-mail existe) — a UI reflete isso.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/frisby/auth-layout";
import { authApi } from "@/lib/api/endpoints";
import { apiErrorMessage } from "@/lib/api/error-messages";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Enviaremos um link de redefinição para o seu e-mail."
    >
      {sent ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-income/30 bg-income/5 px-3 py-3 text-sm">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-income" />
            <p>
              Se existir uma conta com <strong>{email}</strong>, você receberá um e-mail com o link
              para redefinir a senha. O link vale por 1 hora.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link to="/auth">Voltar para o login</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
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
            Enviar link
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Lembrou a senha?{" "}
            <Link
              to="/auth"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Entrar
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
