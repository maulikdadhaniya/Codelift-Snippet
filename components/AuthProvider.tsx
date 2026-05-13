"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { encryptedPostJson } from "@/lib/crypto/hybrid-client";

export type AuthUser = { id: string; email: string; firstName: string; lastName: string; mobile?: string };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await encryptedPostJson<{ success: boolean; user?: AuthUser | null }>("/api/auth/me", {});
      if (data.success && data.user) {
        const u = data.user;
        setUser({
          id: u.id,
          email: u.email,
          firstName: u.firstName ?? "",
          lastName: u.lastName ?? "",
          ...(u.mobile ? { mobile: u.mobile } : {}),
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await encryptedPostJson("/api/auth/logout", {});
    } catch {
      /* still clear local session */
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
