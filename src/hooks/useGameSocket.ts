import * as React from "react";
import { GameSocket, type WsStatus } from "@/lib/ws";
import { syncServerClock, syncServerClockFallback, nowServerMs } from "@/lib/time";
import type {
  GameStatus,
  LeaderboardEntry,
  LeaderboardYou,
  StateSyncPayload,
  WsEvent,
  WsPlayer,
  WsQuestion,
} from "@/types";

export interface GameStore {
  status: GameStatus;
  pin: string;
  quizTitle: string;
  index: number;
  total: number;
  players: WsPlayer[];
  question?: WsQuestion;
  previewEndsAtMs?: number;
  deadlineMs?: number;
  yourAnswer?: { index: number; option_id: string };
  correctOptionId?: string;
  answerCounts?: Record<string, number>;
  answeredCount: number;
  totalPlayers: number;
  leaderboard: LeaderboardEntry[];
  /** Posisi sebelum pembaruan klasemen terakhir — untuk chip delta (▲/▼). */
  prevRanks?: Record<string, number>;
  /** Skor sebelum pembaruan klasemen terakhir — untuk chip delta (+poin). */
  prevScores?: Record<string, number>;
  you?: LeaderboardYou;
  podium?: LeaderboardEntry[];
  finalLeaderboard?: LeaderboardEntry[];
  isLast: boolean;
  lastError?: { code: string; message: string };
}

const initialState = (pin: string): GameStore => ({
  status: "LOBBY",
  pin,
  quizTitle: "",
  index: -1,
  total: 0,
  players: [],
  answeredCount: 0,
  totalPlayers: 0,
  leaderboard: [],
  isLast: false,
});

/**
 * Snapshot klasemen → peta posisi/skor per pemain. Dipakai sebagai "keadaan
 * sebelumnya" saat LEADERBOARD_UPDATE/GAME_OVER agar UI leaderboard bisa
 * menampilkan perubahan (▲/▼ peringkat, +poin). Murni state frontend —
 * tidak ada field baru di kontrak WS.
 */
function snapshotPrev(leaderboard: LeaderboardEntry[]) {
  const prevRanks: Record<string, number> = {};
  const prevScores: Record<string, number> = {};
  for (const e of leaderboard) {
    prevRanks[e.player_id] = e.rank;
    prevScores[e.player_id] = e.score;
  }
  return { prevRanks, prevScores };
}

/**
 * State permainan tunggal untuk host dan pemain (PRD §6).
 * Semua state penting berasal dari event WS; frontend tidak pernah
 * menghitung skor/kebenaran sendiri.
 */
export function useGameSocket(wsUrl: string | null) {
  const socketRef = React.useRef<GameSocket | null>(null);
  const storeRef = React.useRef<GameStore>(initialState(""));
  const [store, setStore] = React.useState<GameStore>(storeRef.current);
  const [wsStatus, setWsStatus] = React.useState<WsStatus>("connecting");

  const apply = React.useCallback((patch: Partial<GameStore>) => {
    storeRef.current = { ...storeRef.current, ...patch };
    setStore(storeRef.current);
  }, []);

  /** Waktu pesan WS terakhir diterima + throttle untuk watchdog. */
  const lastEventAtRef = React.useRef(Date.now());
  const lastNudgeRef = React.useRef(0);
  const lastForceRef = React.useRef(0);

  const handleEvent = React.useCallback(
    (e: WsEvent) => {
      lastEventAtRef.current = Date.now();
      switch (e.event) {
        case "STATE_SYNC": {
          const p: StateSyncPayload = e.payload;
          syncServerClock(p.server_time_ms);          const next: Partial<GameStore> = {
            status: p.status,
            pin: p.pin,
            quizTitle: p.quiz_title,
            index: p.index,
            total: p.total,
            players: p.players ?? [],
            question: p.question,
            yourAnswer: p.your_answer,
            correctOptionId: p.correct_option_id || undefined,
            leaderboard: p.leaderboard ?? [],
            totalPlayers: p.total_players,
            deadlineMs: p.deadline_ms || p.question?.deadline_ms,
            previewEndsAtMs: p.preview_ends_at_ms || undefined,
          };
          apply(next);
          break;
        }
        case "PLAYER_JOINED": {
          const p = e.payload;
          if (!storeRef.current.players.some((pl) => pl.player_id === p.player_id)) {
            const merged = [...storeRef.current.players, {
              player_id: p.player_id,
              nickname: p.nickname,
              score: 0,
              streak: 0,
              joined_at_ms: Date.now(),
            }];
            apply({ players: merged, totalPlayers: Math.max(storeRef.current.totalPlayers, p.total) });
          } else {
            apply({ totalPlayers: p.total });
          }
          break;
        }
        case "PLAYER_LEFT": {
          const p = e.payload;
          apply({
            players: storeRef.current.players.filter((pl) => pl.player_id !== p.player_id),
            totalPlayers: p.total,
          });
          break;
        }
        case "START_GAME":
          apply({ status: "PREVIEW", index: 0, total: e.payload.total_questions, isLast: false, podium: undefined });
          break;
        case "QUESTION_PREVIEW":
          apply({
            status: "PREVIEW",
            index: e.payload.index,
            total: e.payload.total,
            question: e.payload,
            previewEndsAtMs: nowServerMs() + e.payload.preview_ms,
            deadlineMs: undefined,
            yourAnswer: undefined,
            correctOptionId: undefined,
            answerCounts: undefined,
            answeredCount: 0,
            isLast: false,
          });
          break;
        case "QUESTION_START":
          // Fallback jam server: kalau STATE_SYNC belum pernah sampai (frame
          // hilang di transport), started_at_ms dipakai agar countdown tetap akurat.
          syncServerClockFallback(e.payload.started_at_ms);
          apply({
            status: "QUESTION",
            index: e.payload.index,
            total: e.payload.total,
            question: e.payload,
            deadlineMs: e.payload.deadline_ms,
            previewEndsAtMs: undefined,
            yourAnswer: undefined,
            correctOptionId: undefined,
            answerCounts: undefined,
            answeredCount: 0,
          });
          break;
        case "ANSWER_ACCEPTED":
          apply({ yourAnswer: { index: e.payload.index, option_id: e.payload.option_id } });
          break;
        case "ANSWER_COUNT_UPDATE":
          apply({ answeredCount: e.payload.answered, totalPlayers: e.payload.total_players });
          break;
        case "ANSWER_SUMMARY":
          apply({
            status: "RESULT",
            correctOptionId: e.payload.correct_option_id,
            answerCounts: e.payload.counts,
            answeredCount: e.payload.total_answers,
            totalPlayers: e.payload.total_players,
            deadlineMs: undefined,
          });
          break;
        case "QUESTION_END":
          apply({ status: "RESULT", isLast: e.payload.is_last, deadlineMs: undefined });
          break;
        case "LEADERBOARD_UPDATE":
          apply({
            ...snapshotPrev(storeRef.current.leaderboard),
            leaderboard: e.payload.top,
            totalPlayers: e.payload.total_players,
            ...(e.payload.you ? { you: e.payload.you } : {}),
          });
          break;
        case "GAME_OVER":
          apply({
            ...snapshotPrev(storeRef.current.leaderboard),
            status: "PODIUM",
            podium: e.payload.podium,
            finalLeaderboard: e.payload.leaderboard,
            leaderboard: e.payload.leaderboard,
            totalPlayers: e.payload.total_players,
            deadlineMs: undefined,
            previewEndsAtMs: undefined,
          });
          break;
        case "ERROR":
          apply({ lastError: e.payload });
          break;
      }
    },
    [apply],
  );

  React.useEffect(() => {
    if (!wsUrl) return;
    const sock = new GameSocket(wsUrl, handleEvent);
    socketRef.current = sock;
    const off = sock.onStatus(setWsStatus);
    // Koneksi awal ditunda satu macro-task: pada StrictMode dev, efek ini
    // dijalankan dua kali (mount → cleanup → mount) dan server membatalkan
    // token pemain begitu koneksi pertamanya tertutup (reconnect dengan token
    // yang sama ditolak "UNAUTHORIZED"). Tanpa penundaan, koneksi pertama dari
    // StrictMode yang segera ditutup akan "membakar" token sehingga koneksi
    // kedua tidak pernah berhasil. Dengan penundaan, hanya mount terakhir yang
    // benar-benar membuka koneksi — perilaku produksi tidak berubah.
    const openTimer = setTimeout(() => sock.connect(), 0);
    return () => {
      clearTimeout(openTimer);
      off();
      sock.close();
      socketRef.current = null;
    };
  }, [wsUrl, handleEvent]);

  /**
   * Watchdog anti-stuck: bila fase QUESTION/PREVIEW sudah melewati deadline
   * server tetapi event penutup (ANSWER_SUMMARY / QUESTION_END / QUESTION_START)
   * tidak kunjung datang, minta STATE_SYNC berkala dan reconnect bila perlu.
   * Ini menyembuhkan layar yang "menggantung" di angka 0 tanpa reload manual.
   */
  React.useEffect(() => {
    const id = setInterval(() => {
      const sock = socketRef.current;
      if (!sock || sock.status !== "open") return;
      const s = storeRef.current;
      const now = nowServerMs();
      const wall = Date.now();

      const stuckMs =
        s.status === "QUESTION" && s.deadlineMs
          ? now - s.deadlineMs
          : s.status === "PREVIEW" && s.previewEndsAtMs
            ? now - s.previewEndsAtMs
            : 0;

      // Belum lewat deadline + toleransi 1.5 s → tidak perlu apa-apa.
      if (stuckMs <= 1500) return;

      // Stuck terlalu lama → koneksi kemungkinan mati senyap, sambung ulang.
      if (stuckMs > 12000 && wall - lastForceRef.current > 15000) {
        lastForceRef.current = wall;
        sock.forceReconnect();
        return;
      }
      // Minta state terbaru dari server (server membalas STATE_SYNC).
      if (wall - lastNudgeRef.current > 2500) {
        lastNudgeRef.current = wall;
        sock.send("SYNC");
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const send = React.useCallback((event: string, payload?: object) => socketRef.current?.send(event, payload), []);
  const forceReconnect = React.useCallback(() => socketRef.current?.forceReconnect(), []);

  return { store, wsStatus, send, forceReconnect };
}
