/**
 * Menyimpan pilihan mode & konfigurasi kuis secara lokal.
 *
 * Backend QuizLive saat ini belum memiliki field `game_mode` / `game_config`
 * (PRD §10.2 masih usulan). Karena itu metadata disimpan di localStorage dan
 * dipakai frontend sebagai sumber kebenaran. Quiz lama tanpa metadata otomatis
 * dianggap `QUIZ`, sehingga perilaku Quiz Mode tidak berubah.
 */
import { DEFAULT_SNAKES_CONFIG } from "@/lib/snakes";
import type { GameMode, QuizGameMeta, SnakesGameConfig } from "@/types";

const KEY = "quizlive.game-meta";

type Store = Record<string, QuizGameMeta>;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* ignore — mode selection tetap bekerja selama halaman terbuka */
  }
}

export function saveQuizGameMeta(quizId: string, meta: QuizGameMeta) {
  const store = read();
  store[quizId] = meta;
  write(store);
}

export function loadQuizGameMeta(quizId: string): QuizGameMeta | null {
  return read()[quizId] ?? null;
}

export function getQuizGameMode(quizId: string): GameMode {
  return loadQuizGameMeta(quizId)?.game_mode ?? "QUIZ";
}

export function getSnakesConfig(quizId: string): SnakesGameConfig {
  return loadQuizGameMeta(quizId)?.config ?? { ...DEFAULT_SNAKES_CONFIG };
}

/** Daftar kuis yang mode-nya Ular Tangga (dipakai halaman pemilih). */
export function listSnakesQuizIds(): string[] {
  return Object.entries(read())
    .filter(([, meta]) => meta.game_mode === "SNAKES_AND_LADDERS")
    .map(([id]) => id);
}
