/**
 * Penyimpanan kredensial sesi di sessionStorage — refresh tidak kehilangan
 * sesi host/pemain (PRD §4). Avatar adalah data frontend-only (backend tidak
 * punya field avatar), tersimpan lokal dan tidak mengubah kontrak API.
 */
import type { CreateSessionResponse, JoinResponse } from "@/types";

const HOST_KEY = "quizlive.host";
const PLAYER_KEY = "quizlive.player";
const AVATAR_KEY = "quizlive.avatar";
const ACTIVITY_KEY = "quizlive.activity";

export interface HostCreds extends CreateSessionResponse {
  openedAt: number;
}

export interface PlayerCreds extends JoinResponse {
  pin: string;
  quizTitle?: string;
  avatarId: number;
  openedAt: number;
}

export function saveHostCreds(c: CreateSessionResponse) {
  sessionStorage.setItem(HOST_KEY, JSON.stringify({ ...c, openedAt: Date.now() } satisfies HostCreds));
}

export function loadHostCreds(): HostCreds | null {
  try {
    const raw = sessionStorage.getItem(HOST_KEY);
    return raw ? (JSON.parse(raw) as HostCreds) : null;
  } catch {
    return null;
  }
}

export function clearHostCreds() {
  sessionStorage.removeItem(HOST_KEY);
}

export function savePlayerCreds(pin: string, c: JoinResponse, quizTitle: string | undefined, avatarId: number) {
  sessionStorage.setItem(
    PLAYER_KEY,
    JSON.stringify({ ...c, pin, quizTitle, avatarId, openedAt: Date.now() } satisfies PlayerCreds),
  );
}

export function loadPlayerCreds(): PlayerCreds | null {
  try {
    const raw = sessionStorage.getItem(PLAYER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerCreds;
    if (typeof parsed.avatarId !== "number") parsed.avatarId = 0;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPlayerCreds() {
  sessionStorage.removeItem(PLAYER_KEY);
}

/** Pilihan avatar pemain — persisten lintas sesi. */
export function loadAvatarChoice(): number | null {
  try {
    const raw = localStorage.getItem(AVATAR_KEY);
    const n = raw === null ? null : Number(raw);
    return n !== null && Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function saveAvatarChoice(id: number) {
  try {
    localStorage.setItem(AVATAR_KEY, String(id));
  } catch {
    /* ignore */
  }
}

/* --------------------- log aktivitas untuk dashboard --------------------- */

export interface ActivityItem {
  type: "quiz-created" | "quiz-updated" | "session-hosted" | "game-ended" | "player-joined";
  label: string;
  detail?: string;
  at: number;
}

export function pushActivity(item: Omit<ActivityItem, "at">) {
  try {
    const list = loadActivity();
    list.unshift({ ...item, at: Date.now() });
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(list.slice(0, 12)));
  } catch {
    /* ignore */
  }
}

export function loadActivity(): ActivityItem[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    return raw ? (JSON.parse(raw) as ActivityItem[]) : [];
  } catch {
    return [];
  }
}
