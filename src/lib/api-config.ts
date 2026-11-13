/**
 * Konfigurasi origin API (dipakai REST, WebSocket, dan auth).
 * Bisa diarahkan ke backend lain lewat env VITE_API_BASE_URL tanpa mengubah kode.
 */
const DEFAULT_API_BASE_URL = "https://api.workilham.my.id";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
export const API_V1 = `${API_BASE_URL}/api/v1`;
