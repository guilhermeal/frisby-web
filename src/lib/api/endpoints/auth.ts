// Autenticação e perfil (/auth/*, /me).

import { api } from "../client";
import type { AuthTokens, User } from "../types";

export interface SignupBody {
  name: string;
  email: string;
  password: string;
  baseCurrency: string; // ISO 4217 (3 letras)
  locale: string; // ex.: "pt-BR" — o schema do backend NÃO aceita timezone
}

export interface UpdateMeBody {
  name?: string;
  baseCurrency?: string;
  locale?: string;
  timezone?: string;
  taxId?: string | null; // CPF (11 dígitos)
  password?: string;
}

export const authApi = {
  /** Devolve só os tokens — o backend não inclui o usuário no login. */
  login: (email: string, password: string) =>
    api.post<AuthTokens>("/auth/login", { email, password }, { anonymous: true }),
  signup: (body: SignupBody) =>
    api.post<{ id: string; email: string; name: string }>("/auth/signup", body, {
      anonymous: true,
    }),
  /** O backend exige o refresh token no corpo para revogar a sessão. */
  logout: (refreshToken: string | null) =>
    refreshToken ? api.post<void>("/auth/logout", { refreshToken }) : Promise.resolve(undefined),
  me: () => api.get<User>("/me"),
  updateMe: (body: UpdateMeBody) => api.patch<User>("/me", body),
  /** Resposta sempre neutra — não revela se o e-mail existe. */
  forgotPassword: (email: string) =>
    api.post<{ sent: boolean }>("/auth/forgot-password", { email }, { anonymous: true }),
  resetPassword: (token: string, password: string) =>
    api.post<{ reset: boolean }>("/auth/reset-password", { token, password }, { anonymous: true }),
  /** Dispara o e-mail de verificação (autenticado). */
  sendVerification: () =>
    api.post<{ sent?: boolean; alreadyVerified?: boolean }>("/auth/verify-email", {}),
  /** Confirma o token do link do e-mail (público). */
  confirmVerification: (token: string) =>
    api.get<{ verified: boolean }>("/auth/verify-email", { token }, { anonymous: true }),
};
