import { wsUrl } from "@/lib/api";
import type { WsEvent } from "@/types";

export type WsStatus = "connecting" | "open" | "reconnecting" | "closed";

type Handler = (e: WsEvent) => void;

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
      try {
        const data = JSON.parse(msg.data as string) as WsEvent;
        if (data && typeof data.event === "string") this.handler(data);
      } catch {
        /* pesan tidak valid diabaikan */
      }
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
