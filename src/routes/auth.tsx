import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/frisby/auth-layout";
import { useAuth } from "@/lib/auth/context";
import { apiErrorMessage } from "@/lib/api/error-messages";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const { redirect: redirectParam } = useSearch({ from: "/auth" });
  // Só aceita destinos internos que não apontem de volta para /auth.
  const redirectTo =
    redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("/auth")
      ? redirectParam
      : undefined;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      void navigate({ to: redirectTo ?? "/", replace: true });
    }
  }, [status, navigate, redirectTo]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      void navigate({ to: redirectTo ?? "/", replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "Falha ao entrar. Tente novamente."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Use seu e-mail e senha do Frisby."
      footer="Ao entrar você concorda com os Termos e a Política de Privacidade."
    >
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
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link
              to="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Esqueci a senha
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          Entrar
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link
            to="/signup"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
