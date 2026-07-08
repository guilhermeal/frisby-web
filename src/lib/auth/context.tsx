// Contexto de autenticação. Fonte única para user + tokens no lado cliente.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi } from "@/lib/api/endpoints";
import { onSessionExpired, tokenStore } from "@/lib/api/client";
import type { User } from "@/lib/api/types";

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: Status;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("").toUpperCase() || "?";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);

  const bootstrap = useCallback(async () => {
    if (!tokenStore.getAccess()) {
      setStatus("unauthenticated");
      setUser(null);
      return;
    }
    try {
      const me = await authApi.me();
      setUser({ ...me, initials: me.initials ?? initials(me.name) });
      setStatus("authenticated");
    } catch {
      tokenStore.clear();
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void bootstrap();
    const unsubscribe = onSessionExpired(() => {
      setUser(null);
      setStatus("unauthenticated");
    });
    return () => {
      unsubscribe();
    };
  }, [bootstrap]);

  const login = useCallback(async (email: string, password: string) => {
    const resp = await authApi.login(email, password);
    tokenStore.set(resp);
    const u = resp.user;
    setUser({ ...u, initials: u.initials ?? initials(u.name) });
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // best effort
    }
    tokenStore.clear();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthState>(
    () => ({ status, user, login, logout }),
    [status, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}

/** Entidade "corrente" — persistida em localStorage, com fallback à primeira. */
const ENTITY_KEY = "frisby.currentEntityId";

export function readCurrentEntityId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ENTITY_KEY);
}

export function writeCurrentEntityId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ENTITY_KEY, id);
}
