// Cadastro. Suporta ?invitation=<token> (link do e-mail de convite): mostra
// para qual entidade/papel o convite é, trava o e-mail, e após criar a conta
// faz login + aceite automáticos.

import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Loader2, MailPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthLayout } from "@/components/frisby/auth-layout";
import { authApi, invitationsApi } from "@/lib/api/endpoints";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { useAuth } from "@/lib/auth/context";

const searchSchema = z.object({
  invitation: z.string().optional(),
});

export const Route = createFileRoute("/signup")({
  validateSearch: searchSchema,
  component: SignupPage,
});

const CURRENCIES = [
  { code: "BRL", label: "Real brasileiro (R$)" },
  { code: "USD", label: "Dólar americano (US$)" },
  { code: "EUR", label: "Euro (€)" },
];

const LOCALES = [
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];

/** Defaults inteligentes a partir do navegador. */
function browserDefaults(): { locale: string; currency: string } {
  if (typeof navigator === "undefined") return { locale: "pt-BR", currency: "BRL" };
  const lang = navigator.language || "pt-BR";
  const locale = LOCALES.find((l) => lang.startsWith(l.code.slice(0, 2)))?.code ?? "pt-BR";
  const currency = locale === "en" ? "USD" : locale === "es" ? "EUR" : "BRL";
  return { locale, currency };
}

function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { invitation } = useSearch({ from: "/signup" });
  const defaults = browserDefaults();

  const inviteQ = useQuery({
    queryKey: ["invitation-public", invitation],
    queryFn: () => invitationsApi.getPublic(invitation!),
    enabled: !!invitation,
    retry: false,
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState(defaults.currency);
  const [locale, setLocale] = useState(defaults.locale);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Com convite válido, o e-mail é o do convite (o backend valida a igualdade).
  const effectiveEmail = inviteQ.data?.email ?? email;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await authApi.signup({
        name,
        email: effectiveEmail,
        password,
        baseCurrency: currency,
        locale,
      });
      await login(effectiveEmail, password);
      if (invitation && inviteQ.data) {
        await invitationsApi.accept(invitation);
      }
      void navigate({ to: "/", replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "Falha ao criar a conta. Tente novamente."));
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Comece a organizar seu dinheiro em minutos."
      footer="Ao criar a conta você concorda com os Termos e a Política de Privacidade."
    >
      {invitation && inviteQ.data && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-brand/30 bg-brand-soft/40 px-3 py-2.5 text-xs">
          <MailPlus className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p>
            Você foi convidado para <strong>{inviteQ.data.entityName}</strong> como{" "}
            <strong>{inviteQ.data.roleName}</strong>. Crie sua conta com o e-mail{" "}
            <strong>{inviteQ.data.email}</strong> para entrar automaticamente.
          </p>
        </div>
      )}
      {invitation && inviteQ.isError && (
        <div className="mb-4 rounded-lg border border-expense/40 bg-expense/5 px-3 py-2.5 text-xs text-expense">
          Este convite é inválido ou expirou. Você ainda pode criar uma conta normalmente.
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={effectiveEmail}
            disabled={!!inviteQ.data}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
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
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Moeda</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Idioma</Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          Criar conta
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link
            to="/auth"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
