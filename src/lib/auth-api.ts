/**
 * Client auth/RBAC (PRD Auth §3.8) sesuai "Auth & RBAC — API Contract":
 * - login `{ username, password }` (username boleh username atau email)
 *   → `{ data: { access_token, token_type, expires_in, user } }`
 * - refresh mengembalikan bentuk yang sama dan merotasi cookie refresh_token
 * - ganti password `{ current_password, new_password }` → 204
 * - reset password admin `{ new_password }`
 * - list user admin: `GET /users?role=host`
 * Refresh cookie HttpOnly (path /api/v1/auth), jadi semua request auth memakai
 * withCredentials dan JavaScript tidak pernah membaca token itu.
 */
import axios from "axios";
import { API_V1 } from "@/lib/api-config";
import { clearSession, setAccessToken, setSession } from "@/lib/auth-store";
import { installAuthInterceptors } from "@/lib/http-auth";
import type {
  AuthRole,
  AuthSession,
  AuthUser,
  CreateUserInput,
  ManagedUser,
  UpdateUserInput,
} from "@/types";

/** Client auth: cookie refresh HttpOnly ikut terkirim (credentials include). */
export const authHttp = axios.create({
  baseURL: API_V1,
  timeout: 20000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null ? (value as JsonRecord) : null;
}

/** Lepas wrapper `{ data: ... }` bila ada. */
function unwrap(data: unknown): unknown {
  const rec = asRecord(data);
  if (rec && rec.data !== undefined) return rec.data;
  return data;
}

function parseRole(value: unknown): AuthRole {
  // Role tak dikenal diperlakukan sebagai host (hak paling kecil).
  return value === "admin" || value === "superadmin" ? value : "host";
}

function parseUser(raw: unknown): AuthUser | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const username = typeof rec.username === "string" ? rec.username : "";
  const id = rec.id ?? rec.user_id ?? username;
  if (!id && !username) return null;
  return {
    id: String(id),
    username,
    email: typeof rec.email === "string" ? rec.email : "",
    role: parseRole(rec.role),
    is_active: typeof rec.is_active === "boolean" ? rec.is_active : typeof rec.active === "boolean" ? rec.active : undefined,
    created_at: typeof rec.created_at === "string" ? rec.created_at : undefined,
    updated_at: typeof rec.updated_at === "string" ? rec.updated_at : undefined,
  };
}

function parseManagedUser(raw: unknown): ManagedUser | null {
  const user = parseUser(raw);
  if (!user) return null;
  const rec = asRecord(raw);
  return {
    ...user,
    last_login_at: typeof rec?.last_login_at === "string" ? rec.last_login_at : undefined,
  };
}

interface ParsedSession {
  access_token: string;
  user: AuthUser | null;
}

function parseSession(data: unknown): ParsedSession {
  const root = asRecord(unwrap(data));
  if (!root) throw new Error("Respons autentikasi tidak valid.");
  const token = root.access_token ?? root.accessToken ?? root.token;
  if (typeof token !== "string" || !token) {
    throw new Error("Respons autentikasi tidak berisi access_token.");
  }
  const userRaw = root.user ?? root.account ?? (root.role ? root : null);
  return { access_token: token, user: userRaw ? parseUser(userRaw) : null };
}

async function fetchMe(): Promise<AuthUser> {
  const res = await authHttp.get("/auth/me");
  const root = asRecord(unwrap(res.data));
  const user = parseUser(root?.user ?? unwrap(res.data));
  if (!user) throw new Error("Respons /auth/me tidak berisi data user.");
  return user;
}

/* -------------------------------- Auth -------------------------------- */

export async function loginRequest(username: string, password: string): Promise<AuthSession> {
  const res = await authHttp.post("/auth/login", { username, password });
  const parsed = parseSession(res.data);
  setAccessToken(parsed.access_token);
  const user = parsed.user ?? (await fetchMe());
  setSession(parsed.access_token, user);
  return { access_token: parsed.access_token, user };
}

let refreshInFlight: Promise<AuthSession> | null = null;

async function performRefresh(): Promise<AuthSession> {
  const res = await authHttp.post("/auth/refresh");
  const parsed = parseSession(res.data);
  setAccessToken(parsed.access_token);
  const user = parsed.user ?? (await fetchMe());
  setSession(parsed.access_token, user);
  return { access_token: parsed.access_token, user };
}

/**
 * Refresh single-flight: panggilan paralel dalam satu tab memakai promise yang
 * sama, dan `navigator.locks` mencegah beberapa tab me-refresh bersamaan
 * (refresh token dirotasi backend).
 */
export function refreshSession(): Promise<AuthSession> {
  if (!refreshInFlight) {
    refreshInFlight = withRefreshLock(performRefresh).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
  if (!locks) return task();
  let result!: T;
  await locks.request("quizlive.auth.refresh", async () => {
    result = await task();
  });
  return result;
}

// Endpoint user management juga ikut Bearer + refresh/retry 401.
installAuthInterceptors(authHttp, refreshSession);

export async function logoutRequest(): Promise<void> {
  try {
    await authHttp.post("/auth/logout");
  } finally {
    clearSession();
  }
}

export async function changePasswordRequest(currentPassword: string, newPassword: string): Promise<void> {
  await authHttp.post("/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

/* -------------------------------- Users ------------------------------- */

export async function listUsers(): Promise<ManagedUser[]> {
  // Admin hanya boleh mengelola host; role eksplisit menjaga permintaan tetap sempit.
  const res = await authHttp.get("/users", { params: { role: "host" } });
  const root = unwrap(res.data);
  const rawList = Array.isArray(root)
    ? root
    : (asRecord(root)?.users ?? asRecord(root)?.items ?? asRecord(root)?.data ?? []);
  if (!Array.isArray(rawList)) return [];
  return rawList.map(parseManagedUser).filter((u): u is ManagedUser => u !== null);
}

export async function createUser(input: CreateUserInput): Promise<ManagedUser | null> {
  const res = await authHttp.post("/users", input);
  const root = unwrap(res.data);
  return parseManagedUser(asRecord(root)?.user ?? root);
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<ManagedUser | null> {
  const res = await authHttp.patch(`/users/${encodeURIComponent(id)}`, input);
  const root = unwrap(res.data);
  return parseManagedUser(asRecord(root)?.user ?? root);
}

export async function resetUserPassword(id: string, password: string): Promise<void> {
  await authHttp.post(`/users/${encodeURIComponent(id)}/reset-password`, { new_password: password });
}

export async function revokeUserSessions(id: string): Promise<void> {
  await authHttp.post(`/users/${encodeURIComponent(id)}/revoke-sessions`);
}

/* ------------------------------- Helpers ------------------------------ */

export function isUnauthorizedError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401;
}

