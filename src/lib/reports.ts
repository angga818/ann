/**
 * Laporan hasil permainan (host-side).
 *
 * Backend tidak menyediakan endpoint riwayat sesi — laporan direkam langsung
 * dari event WS yang sudah ada (ANSWER_SUMMARY + question saat RESULT,
 * GAME_OVER untuk klasemen akhir) di HostLivePage, lalu disimpan lokal di
 * perangkat host. Ini murni state frontend: kontrak REST/WS tidak berubah.
 */
import type { LeaderboardEntry } from "@/types";

/** Statistik satu soal, disalin saat hasilnya diumumkan (ANSWER_SUMMARY). */
export interface ReportQuestion {
  index: number;
  question_text: string;
  time_limit_sec: number;
  correct_option_id: string;
  /** option_id → jumlah pemain yang memilih opsi tersebut. */
  counts: Record<string, number>;
  options: { id: string; text: string; color_index: number }[];
  total_answers: number;
  correct_count: number;
  total_players: number;
}

/** Ringkasan satu sesi yang sudah selesai. */
export interface SessionReport {
  id: string;
  pin: string;
  quizTitle: string;
  endedAtMs: number;
  totalPlayers: number;
  /** Urut naik berdasarkan index soal. */
  questions: ReportQuestion[];
  leaderboard: LeaderboardEntry[];
}

const REPORTS_KEY = "quizlive.reports";
const MAX_REPORTS = 30;

/**
 * Persentase benar satu soal. Pemain yang tidak sempat menjawab dihitung
 * salah (denominator = total pemain saat soal berjalan, fallback ke jumlah
 * jawaban bila total pemain tidak tersedia).
 */
export function correctRate(q: ReportQuestion): number {
  const denom = Math.max(q.total_players, q.total_answers, 1);
  return q.correct_count / denom;
}

/** Rata-rata persentase benar dari seluruh soal yang dimainkan. */
export function avgCorrectRate(questions: ReportQuestion[]): number {
  if (questions.length === 0) return 0;
  return questions.reduce((a, q) => a + correctRate(q), 0) / questions.length;
}

/** Soal tersulit: persentase benar terendah (bisa lebih dari satu saat seri). */
export function hardestQuestions(questions: ReportQuestion[]): ReportQuestion[] {
  if (questions.length === 0) return [];
  const min = Math.min(...questions.map(correctRate));
  return questions.filter((q) => correctRate(q) === min);
}

export function loadSessionReports(): SessionReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    const list = raw ? (JSON.parse(raw) as SessionReport[]) : [];
    if (!Array.isArray(list)) return [];
    return list
      .filter((r) => r && typeof r.id === "string" && Array.isArray(r.questions) && Array.isArray(r.leaderboard))
      .sort((a, b) => b.endedAtMs - a.endedAtMs);
  } catch {
    return [];
  }
}

export function getReport(id: string): SessionReport | null {
  return loadSessionReports().find((r) => r.id === id) ?? null;
}

export function saveSessionReport(report: SessionReport): void {
  try {
    const list = loadSessionReports().filter((r) => r.id !== report.id);
    list.unshift(report);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(list.slice(0, MAX_REPORTS)));
  } catch {
    /* storage penuh / private mode — laporan hanya tidak tersimpan */
  }
}

export function deleteReport(id: string): void {
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(loadSessionReports().filter((r) => r.id !== id)));
  } catch {
    /* ignore */
  }
}

/** Format tanggal Indonesia, mis. “11 Nov 2026, 14.05”. */
export function formatReportDate(ms: number): string {
  return new Date(ms).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
