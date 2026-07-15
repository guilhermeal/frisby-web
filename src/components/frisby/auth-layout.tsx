// Layout compartilhado das telas públicas de autenticação (login, signup,
// esqueci a senha, reset, verificação, aceite de convite).

import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-ink text-primary-foreground">
            <span className="font-display text-sm font-bold">F</span>
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">frisby</span>
        </div>

        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}

        <div className="mt-6">{children}</div>

        {footer && <p className="mt-6 text-center text-xs text-muted-foreground">{footer}</p>}
      </div>
    </div>
  );
}
