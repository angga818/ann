/**
 * Penyimpanan kredensial sesi di sessionStorage — refresh tidak kehilangan
 * sesi host/pemain (PRD §4).
 */
import type { CreateSessionResponse, JoinResponse } from "@/types";

const HOST_KEY = "quizlive.host";
const PLAYER_KEY = "quizlive.player";

export interface HostCreds extends CreateSessionResponse {
  openedAt: number;
}

export interface PlayerCreds extends JoinResponse {
  pin: string;
  quizTitle?: string;
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

export function savePlayerCreds(pin: string, c: JoinResponse, quizTitle?: string) {
  sessionStorage.setItem(
    PLAYER_KEY,
    JSON.stringify({ ...c, pin, quizTitle, openedAt: Date.now() } satisfies PlayerCreds),
  );
}

export function loadPlayerCreds(): PlayerCreds | null {
  try {
    const raw = sessionStorage.getItem(PLAYER_KEY);
    return raw ? (JSON.parse(raw) as PlayerCreds) : null;
  } catch {
    return null;
  }
}

export function clearPlayerCreds() {
  sessionStorage.removeItem(PLAYER_KEY);
}
