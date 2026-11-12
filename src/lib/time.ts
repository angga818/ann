/**
 * Sinkronisasi waktu server (PRD §6.6).
 * offset = server_time_ms - Date.now(); sisa waktu selalu dihitung dari jam server.
 */
let serverOffsetMs = 0;
let hasSynced = false;

/** Batas bawah waktu epoch yang masuk akal (2001-09-09) — menolak 0/NaN/detik. */
const MIN_PLAUSIBLE_MS = 1_000_000_000_000;
/** Koreksi di bawah ini dianggap jitter latensi jaringan, bukan drift jam. */
const JITTER_TOLERANCE_MS = 250;

export function syncServerClock(serverTimeMs: number) {
  // Tolak nilai tidak valid: NaN/undefined, epoch 0, atau waktu dalam detik.
  // Nilai seperti ini dulu membuat offset melompat jauh dan countdown beku.
  if (!Number.isFinite(serverTimeMs) || serverTimeMs < MIN_PLAUSIBLE_MS) return;
  const nextOffset = serverTimeMs - Date.now();
  // Abaikan koreksi kecil agar countdown tidak mundur/melompat tiap resync.
  if (hasSynced && Math.abs(nextOffset - serverOffsetMs) < JITTER_TOLERANCE_MS) return;
  serverOffsetMs = nextOffset;
  hasSynced = true;
}

/**
 * Fallback bila STATE_SYNC (sumber utama jam server) belum pernah diterima —
 * misalnya frame-nya hilang saat transport. Pakai timestamp event lain
 * (mis. started_at_ms pada QUESTION_START). Sekali STATE_SYNC asli diterima,
 * fallback ini tidak akan menimpa lagi.
 */
export function syncServerClockFallback(serverTimeMs: number) {
  if (hasSynced || !Number.isFinite(serverTimeMs) || serverTimeMs < MIN_PLAUSIBLE_MS) return;
  serverOffsetMs = serverTimeMs - Date.now();
  hasSynced = true;
}

export function hasServerClockSync(): boolean {
  return hasSynced;
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
