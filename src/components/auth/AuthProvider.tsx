/**
 * Provider auth global (PRD Auth §3.1/§3.4).
 * Bootstrap: coba POST /auth/refresh sebelum area host dirender, supaya refresh
 * halaman tidak flicker ke form login.
 */
import * as React from "react";
import {
  changePasswordRequest,
  isUnauthorizedError,
  loginRequest,
  logoutRequest,
  refreshSession,
} from "@/lib/auth-api";
import {
  clearSession,
  getAuthSnapshot,
  onSessionExpired,
  subscribeAuth,
} from "@/lib/auth-store";
import { clearHostCreds } from "@/lib/storage";
import type { AuthUser } from "@/types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error" | "unsupported-role";

export class UnsupportedRoleError extends Error {
  constructor() {
    super("Role ini tidak didukung di aplikasi ini.");
    this.name = "UnsupportedRoleError";
  }
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  retry: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

type BroadcastMessage = "login" | "logout";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const snapshot = React.useSyncExternalStore(subscribeAuth, getAuthSnapshot);
  const channelRef = React.useRef<BroadcastChannel | null>(null);

  const broadcast = React.useCallback((message: BroadcastMessage) => {
    channelRef.current?.postMessage(message);
  }, []);

  const bootstrap = React.useCallback(async () => {
    setStatus("loading");
    try {
      const session = await refreshSession();
      if (session.user.role === "superadmin") {
        // Role di luar scope FE ini — jangan tampilkan fitur superadmin.
        await logoutRequest().catch(() => undefined);
        clearSession();
        clearHostCreds();
        setStatus("unsupported-role");
        return;
      }
      setStatus("authenticated");
    } catch (err) {
      clearSession();
      setStatus(isUnauthorizedError(err) ? "unauthenticated" : "error");
    }
  }, []);

  React.useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Refresh token ditolak saat request berjalan → sesi berakhir.
  React.useEffect(
    () =>
      onSessionExpired(() => {
        clearHostCreds();
        setStatus("unauthenticated");
      }),
    [],
  );

  // Sinkronkan login/logout antar-tab.
  React.useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("quizlive.auth");
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent) => {
      if (event.data === "logout") {
        clearSession();
        clearHostCreds();
        setStatus("unauthenticated");
      } else if (event.data === "login") {
        void bootstrap();
      }
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [bootstrap]);

  const login = React.useCallback(
    async (username: string, password: string): Promise<AuthUser> => {
      const session = await loginRequest(username, password);
      if (session.user.role === "superadmin") {
        await logoutRequest().catch(() => undefined);
        clearSession();
        clearHostCreds();
        setStatus("unsupported-role");
        throw new UnsupportedRoleError();
      }
      setStatus("authenticated");
      broadcast("login");
      return session.user;
    },
    [broadcast],
  );

  const logout = React.useCallback(async () => {
    await logoutRequest().catch(() => undefined);
    clearSession();
    clearHostCreds();
    setStatus("unauthenticated");
    broadcast("logout");
  }, [broadcast]);

  const changePassword = React.useCallback(
    async (currentPassword: string, newPassword: string) => {
      await changePasswordRequest(currentPassword, newPassword);
      // Backend mencabut refresh session — keluar dan login ulang.
      await logoutRequest().catch(() => undefined);
      clearSession();
      clearHostCreds();
      setStatus("unauthenticated");
      broadcast("logout");
    },
    [broadcast],
  );

  const value = React.useMemo<AuthContextValue>(
    () => ({ status, user: snapshot.user, login, logout, retry: bootstrap, changePassword }),
    [status, snapshot.user, login, logout, bootstrap, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>.");
  return ctx;
}
