/** Logika murni game Ular Tangga Edukasi (client-side). */

export const BOARD_SIZE = 100;

/** Tangga: cell bawah → cell atas */
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

/** Ular: cell kepala → cell ekor */
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

export interface GamePlayer {
  id: string;
  name: string;
  position: number;
  isBot: boolean;
  score: number;
  color: string; // kelas tailwind untuk token
  ring: string;
}

/** Posisi 1..100 → baris (0 = atas) & kolom (0 = kiri), pola serpentin. */
export function cellToCoords(cell: number): { row: number; col: number } {
  const n = Math.max(0, Math.min(BOARD_SIZE, cell) - 1);
  const fromBottom = Math.floor(n / 10);
  const within = n % 10;
  return {
    row: 9 - fromBottom,
    col: fromBottom % 2 === 0 ? within : 9 - within,
  };
}

/** Dice value → transform kubus agar sisi yang benar menghadap. */
export const DICE_TRANSFORM: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateX(0deg) rotateY(-90deg)",
  3: "rotateX(-90deg) rotateY(0deg)",
  4: "rotateX(90deg) rotateY(0deg)",
  5: "rotateX(0deg) rotateY(90deg)",
  6: "rotateX(0deg) rotateY(180deg)",
};

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/** Probabilitas bot menjawab benar berdasarkan kesulitan (PRD §GAME_BOT_CORRECT_RATE). */
export function botCorrectRate(difficulty: "mudah" | "sedang" | "sulit"): number {
  return { mudah: 0.55, sedang: 0.75, sulit: 0.92 }[difficulty];
}

/** Hitung posisi akhir setelah lompatan tangga / gigitan ular. */
export function resolveSpecial(from: number, to: number): { final: number; type: "ladder" | "snake" | "none" } {
  if (LADDERS[to] !== undefined) return { final: LADDERS[to], type: "ladder" };
  if (SNAKES[to] !== undefined) return { final: SNAKES[to], type: "snake" };
  return { final: to, type: "none" };
}

/** Skor PRD 3.5: round(1000 × time_factor × difficulty_multiplier). */
export function computePoints(timeLimitSec: number, answeredInMs: number, multiplier: number): number {
  const timeFactor = Math.max(0.25, 1 - answeredInMs / (timeLimitSec * 1000));
  return Math.round(1000 * timeFactor * (multiplier / 1000));
}
