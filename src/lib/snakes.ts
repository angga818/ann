/**
 * Game engine murni Snakes & Ladders (PRD ular tangga fix.md v2.0).
 *
 * Modul ini sengaja bebas dari React agar mudah dipindah ke server saat
 * backend sudah menyediakan endpoint / event PRD §10.3–§10.4. Seluruh aturan
 * (papan 100 kotak, dadu → difficulty, skor, ular/tangga) ada di sini.
 */
import type {
  CharacterId,
  DifficultyLevel,
  MapThemeId,
  QuizQuestion,
  SnakesGameConfig,
} from "@/types";

export const BOARD_SIZE = 100;
export const BOARD_COLS = 10;

/** Tangga: pangkal (bawah) → ujung (atas). PRD §3.8. */
export const LADDERS: Record<number, number> = {
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100,
};

/** Ular: kepala → ekor. PRD §3.7. */
export const SNAKES: Record<number, number> = {
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  74: 58,
  87: 24,
  93: 73,
  95: 75,
  98: 78,
};

/** PRD §5 — kelima tema memakai aturan yang sama, beda aset visual saja. */
export interface MapTheme {
  id: MapThemeId;
  name: string;
  description: string;
  asset: string;
  tint: string;
}

export const MAP_THEMES: MapTheme[] = [
  {
    id: 1,
    name: "Industrial World",
    description: "Pabrik pupuk, menara produksi, dan pipa industri.",
    asset: "/assets/maps/map1.jpg",
    tint: "from-slate-600 to-slate-900",
  },
  {
    id: 2,
    name: "Agricultural World",
    description: "Sawah, traktor, dan ketahanan pangan.",
    asset: "/assets/maps/map2.jpg",
    tint: "from-lime-600 to-emerald-900",
  },
  {
    id: 3,
    name: "Laboratory World",
    description: "Riset, tabung reaksi, dan inovasi teknologi.",
    asset: "/assets/maps/map3.jpg",
    tint: "from-sky-600 to-indigo-900",
  },
  {
    id: 4,
    name: "Distribution World",
    description: "Kapal, truk, kontainer, dan jalur distribusi.",
    asset: "/assets/maps/map4.jpg",
    tint: "from-amber-600 to-orange-900",
  },
  {
    id: 5,
    name: "Green Environment",
    description: "Penghijauan, K3, dan keberlanjutan lingkungan.",
    asset: "/assets/maps/map5.jpg",
    tint: "from-emerald-600 to-teal-900",
  },
];

/** PRD §6 — asli desain pengguna (karakter 1–7), tidak diubah identitas visualnya. */
export interface GameCharacter {
  id: CharacterId;
  name: string;
  role: string;
  asset: string;
}

export const CHARACTERS: GameCharacter[] = [
  { id: 1, name: "Karakter 1", role: "Karakter 1", asset: "/assets/characters/character1.png" },
  { id: 2, name: "Karakter 2", role: "Karakter 2", asset: "/assets/characters/character2.png" },
  { id: 3, name: "Karakter 3", role: "Karakter 3", asset: "/assets/characters/character3.png" },
  { id: 4, name: "Karakter 4", role: "Karakter 4", asset: "/assets/characters/character4.png" },
  { id: 5, name: "Karakter 5", role: "Karakter 5", asset: "/assets/characters/character5.png" },
  { id: 6, name: "Karakter 6", role: "Karakter 6", asset: "/assets/characters/character6.png" },
  { id: 7, name: "Karakter 7", role: "Karakter 7", asset: "/assets/characters/character7.png" },
];

/**
 * Gambar map 1–5 (2400 × 1792) dipakai sebagai permukaan papan.
 * Area jalur 100 kotak adalah persegi 1792 × 1792 di tengah gambar,
 * sehingga koordinatnya identik di kelima tema (PRD §5.1).
 */
export const BOARD_AREA = {
  x: (2400 - 1792) / 2 / 2400, // 12,67%
  y: 0,
  size: 1792 / 2400, // 74,67%
} as const;

/** Posisi sebuah kotak di dalam area papan, dalam persen (0–100). */
export function cellRect(cell: number) {
  const { row, col } = cellToCoords(cell);
  return {
    left: col * (100 / BOARD_COLS),
    top: row * (100 / BOARD_COLS),
    size: 100 / BOARD_COLS,
    cx: (col + 0.5) * (100 / BOARD_COLS),
    cy: (row + 0.5) * (100 / BOARD_COLS),
  };
}

/** PRD §3.3 — label tingkat kesulitan hasil dadu. */
export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  1: "Sangat Mudah",
  2: "Mudah",
  3: "Menengah",
  4: "Cukup Sulit",
  5: "Sulit",
  6: "Sangat Sulit",
};

export const DEFAULT_SNAKES_CONFIG: SnakesGameConfig = {
  map_id: 1,
  question_mode: "CUSTOM",
  answer_time_limit: 20,
  max_players: 4,
  character_id: 1,
};

export function mapTheme(id: MapThemeId): MapTheme {
  return MAP_THEMES.find((m) => m.id === id) ?? MAP_THEMES[0];
}

export function characterAsset(id: CharacterId): string {
  return CHARACTERS.find((c) => c.id === id)?.asset ?? CHARACTERS[0].asset;
}

/**
 * Posisi 1..100 → baris (0 = paling atas) dan kolom (0 = paling kiri).
 * Jalur serpentin: baris paling bawah (1–10) kiri→kanan, baris berikutnya
 * kanan→kiri, dan seterusnya. Berlaku identik di kelima tema (PRD §5.1).
 */
export function cellToCoords(cell: number): { row: number; col: number } {
  const n = Math.max(0, Math.min(BOARD_SIZE, cell) - 1);
  const fromBottom = Math.floor(n / BOARD_COLS);
  const within = n % BOARD_COLS;
  return {
    row: BOARD_COLS - 1 - fromBottom,
    col: fromBottom % 2 === 0 ? within : BOARD_COLS - 1 - within,
  };
}

/** Dadu 1–6 (PRD §3.3). */
export function rollDice(): DifficultyLevel {
  return (Math.floor(Math.random() * 6) + 1) as DifficultyLevel;
}

/** PRD §3.7–3.8 — cek ular/tangga setelah pergerakan normal selesai. */
export function resolveSpecialCell(cell: number): {
  final: number;
  type: "ladder" | "snake" | "none";
} {
  if (LADDERS[cell] !== undefined) return { final: LADDERS[cell], type: "ladder" };
  if (SNAKES[cell] !== undefined) return { final: SNAKES[cell], type: "snake" };
  return { final: cell, type: "none" };
}

/**
 * PRD §4.2:
 *   time_factor          = 1 - (answer_time_ms / time_limit_ms)
 *   difficulty_multiplier = 1 + ((difficulty - 1) * 0.2)
 *   points                = round(1000 * time_factor * difficulty_multiplier)
 * Jawaban salah / timeout = 0 poin (ditanggil caller).
 */
export function computePoints(
  answerTimeMs: number,
  timeLimitSec: number,
  difficulty: DifficultyLevel,
): number {
  const limitMs = Math.max(1, timeLimitSec) * 1000;
  const timeFactor = Math.max(0, 1 - Math.max(0, answerTimeMs) / limitMs);
  const difficultyMultiplier = 1 + (difficulty - 1) * 0.2;
  return Math.round(1000 * timeFactor * difficultyMultiplier);
}

/** Sebar soal secara merata ke enam tingkat kesulitan. */
export function difficultyForIndex(index: number, total: number): DifficultyLevel {
  if (total <= 0) return 1;
  return Math.min(6, Math.max(1, Math.floor((index * 6) / total) + 1)) as DifficultyLevel;
}

/**
 * Ambil soal untuk tingkat kesulitan tertentu (PRD §3.4).
 * `used` berisi id soal yang sudah dipakai; bila pool habis, pool diulang.
 */
export function pickQuestion(
  questions: QuizQuestion[],
  difficulty: DifficultyLevel,
  used: Set<string>,
  random: boolean,
): QuizQuestion | null {
  if (questions.length === 0) return null;
  const pool = questions.filter((q) => difficultyForIndex(q.order_index, questions.length) === difficulty);
  const source = pool.length > 0 ? pool : questions;
  const fresh = source.filter((q) => !used.has(q.id));
  const candidates = fresh.length > 0 ? fresh : source;
  const chosen = random
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : candidates[0];
  if (chosen) used.add(chosen.id);
  return chosen ?? null;
}

/** Transform kubus dadu agar sisi yang benar menghadap (dipakai CSS 3D). */
export const DICE_TRANSFORM: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateX(0deg) rotateY(-90deg)",
  3: "rotateX(-90deg) rotateY(0deg)",
  4: "rotateX(90deg) rotateY(0deg)",
  5: "rotateX(0deg) rotateY(90deg)",
  6: "rotateX(0deg) rotateY(180deg)",
};

export const DICE_PIPS: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};
