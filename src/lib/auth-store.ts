/**
 * State auth global untuk area host/admin (PRD Auth §3.1).
 *
 * Aturan keamanan:
 * - access_token hanya hidup di memory modul ini — tidak pernah masuk
 *   localStorage/sessionStorage dan tidak diekspos ke komponen React.
 * - refresh_token sepenuhnya milik browser (cookie HttpOnly).
 */
import type { AuthUser } from "@/types";

export interface AuthSnapshot {
  user: AuthUser | null;
}

let accessToken: string | null = null;
let snapshot: AuthSnapshot = { user: null };

const listeners = new Set<() => void>();
const expiredListeners = new Set<() => void>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function getAuthSnapshot(): AuthSnapshot {
  return snapshot;
}

/** Simpan token lebih dulu agar request lanjutan (mis. /auth/me) terautentikasi. */
export function setAccessToken(token: string) {
  accessToken = token;
}

export function setSession(token: string, user: AuthUser) {
  accessToken = token;
  snapshot = { user };
  emit();
}

export function clearSession() {
  accessToken = null;
  snapshot = { user: null };
  emit();
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  listeners.forEach((listener) => listener());
}

/** Dipanggil saat refresh gagal (401) — sesi dianggap berakhir. */
export function notifySessionExpired() {
  clearSession();
  expiredListeners.forEach((listener) => listener());
}

export function onSessionExpired(listener: () => void): () => void {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
}
