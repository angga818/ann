/**
 * Sinkronisasi waktu server (PRD §6.6).
 * offset = server_time_ms - Date.now(); sisa waktu selalu dihitung dari jam server.
 */
let serverOffsetMs = 0;

export function syncServerClock(serverTimeMs: number) {
  serverOffsetMs = serverTimeMs - Date.now();
}

export function nowServerMs(): number {
  return Date.now() + serverOffsetMs;
}

export function remainingMs(deadlineMs?: number | null): number {
  if (!deadlineMs) return 0;
  return Math.max(0, deadlineMs - nowServerMs());
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : String(s);
}
