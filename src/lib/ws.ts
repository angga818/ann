import { wsUrl } from "@/lib/api";
import type { WsEvent } from "@/types";

export type WsStatus = "connecting" | "open" | "reconnecting" | "closed";

/**
 * Kode ERROR yang berarti sesi tidak bisa dilanjutkan (handshake gagal, sesi
 * kedaluwarsa, atau pemain sudah dihapus). Reconnect dengan token yang sama
 * tidak akan pernah berhasil, jadi client harus berhenti mencoba dan kembali
 * ke form join/dashboard (PRD §6.1 & §9).
 */
const FATAL_ERROR_CODES = new Set(["INVALID_PIN", "UNAUTHORIZED", "INVALID_ROLE", "NOT_FOUND", "PLAYER_NOT_FOUND"]);

export function isFatalWsError(code: string): boolean {
  return FATAL_ERROR_CODES.has(code);
}

type Handler = (e: WsEvent) => void;

/**
 * Parse satu frame WebSocket menjadi daftar event.
 *
 * PENTING: server kadang menggabungkan beberapa dokumen JSON ke dalam SATU
 * frame (teramati: `PLAYER_JOINED`+`STATE_SYNC`, `START_GAME`+`QUESTION_PREVIEW`,
 * dan rangkaian `ANSWER_SUMMARY`+`QUESTION_END`+`LEADERBOARD_UPDATE` saat semua
 * pemain selesai menjawab). `JSON.parse` biasa melempar error pada frame
 * seperti itu — jika frame diabaikan, event penting hilang dan layar menggantung
 * (timer beku di angka 0 padahal game berlanjut di server).
 *
 * Strategi:
 * 1. Fast-path: frame berisi tepat satu dokumen JSON (kasus paling umum).
 * 2. Split per baris (NDJSON).
 * 3. Fallback: pemindah kedalaman kurung untuk dokumen yang digabung tanpa
 *    pemisah baris. Fragmen yang tidak valid diabaikan, dokumen valid tetap
 *    diproses.
 */
export function parseWsMessages(raw: string): WsEvent[] {
  try {
    const one = JSON.parse(raw) as WsEvent;
    return one && typeof one.event === "string" ? [one] : [];
  } catch {
    /* multi-dokumen — lanjut di bawah */
  }

  const docs: WsEvent[] = [];
  const tryPush = (s: string) => {
    const t = s.trim();
    if (!t) return;
    try {
      const d = JSON.parse(t) as WsEvent;
      if (d && typeof d.event === "string") docs.push(d);
    } catch {
      /* fragmen korup diabaikan */
    }
  };

  if (raw.includes("\n")) {
    for (const line of raw.split("\n")) tryPush(line);
    if (docs.length > 0) return docs;
  }

  // Pemindah kurung: ekstrak tiap objek top-level `{...}` lengkap.
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        tryPush(raw.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return docs;
}

/**
 * Koneksi WebSocket permainan dengan reconnect otomatis (backoff eksponensial).
 * Token host/pemain dipakai ulang saat reconnect (PRD §4.3); server selalu
 * mengirim STATE_SYNC setelah koneksi berhasil.
 */
export class GameSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private handler: Handler;
  private manualClose = false;
  private attempts = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private statusListeners = new Set<(s: WsStatus) => void>();
  status: WsStatus = "connecting";

  constructor(url: string, handler: Handler) {
    this.url = wsUrl(url);
    this.handler = handler;
  }

  private setStatus(s: WsStatus) {
    this.status = s;
    this.statusListeners.forEach((fn) => fn(s));
  }

  onStatus(fn: (s: WsStatus) => void): () => void {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  /** Lepas semua handler dari socket lama agar onclose-nya tidak memicu reconnect ganda. */
  private detach(ws: WebSocket | null) {
    if (!ws) return;
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
    ws.onopen = null;
    try {
      ws.close();
    } catch {
      /* abaikan */
    }
  }

  connect() {
    this.manualClose = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.setStatus(this.attempts === 0 ? "connecting" : "reconnecting");
    // Buang koneksi lama (bila ada) sebelum membuka yang baru.
    this.detach(this.ws);
    this.ws = null;
    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      this.attempts = 0;
      this.setStatus("open");
    };
    this.ws.onmessage = (msg) => {
      if (typeof msg.data !== "string") return;
      // Satu frame dapat berisi >1 event (lihat parseWsMessages).
      for (const ev of parseWsMessages(msg.data)) this.handler(ev);
    };
    this.ws.onclose = () => {
      if (this.manualClose) {
        this.setStatus("closed");
        return;
      }
      this.scheduleReconnect();
    };
    this.ws.onerror = () => {
      /* onclose akan menyusul */
    };
  }

  private scheduleReconnect() {
    this.setStatus("reconnecting");
    this.attempts += 1;
    const delay = Math.min(1000 * 2 ** Math.min(this.attempts - 1, 4), 15000);
    this.timer = setTimeout(() => this.connect(), delay);
  }

  /** Reconnect manual — aman dari koneksi ganda. */
  forceReconnect() {
    this.attempts = 0;
    this.connect();
  }

  send(event: string, payload?: object): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify({ event, ...(payload ? { payload } : {}) }));
    return true;
  }

  close() {
    this.manualClose = true;
    if (this.timer) clearTimeout(this.timer);
    this.detach(this.ws);
    this.ws = null;
    this.setStatus("closed");
  }
}
