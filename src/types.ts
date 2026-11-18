/** REST + WebSocket contracts (PRD §5–§6) */

/* ------------------------------- Auth/RBAC ------------------------------- */

export type AuthRole = "host" | "admin" | "superadmin";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: AuthRole;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthSession {
  access_token: string;
  user: AuthUser;
}

/** User yang dikelola admin (backend hanya mengembalikan role host). */
export interface ManagedUser extends AuthUser {
  last_login_at?: string;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  role: "host";
}

export interface UpdateUserInput {
  role?: "host";
  is_active?: boolean;
}


export interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface QuizOptionInput {
  option_text: string;
  is_correct: boolean;
  color_index: number;
}

export interface QuizQuestionInput {
  question_text: string;
  image_url?: string;
  time_limit_sec: number;
  points_multiplier: number;
  options: QuizOptionInput[];
}

/* ---------------- Game mode (QuizLive / Snakes & Ladders) ---------------- */

/** PRD §1.2 / §2.1 — dua mode permainan dalam satu platform. */
export type GameMode = "QUIZ" | "SNAKES_AND_LADDERS";

/** PRD §2.3 — CUSTOM: soal pilihan host. RANDOM: soal diambil acak dari bank soal. */
export type QuestionMode = "CUSTOM" | "RANDOM";

/** PRD §5 — lima tema papan (map 1–5). */
export type MapThemeId = 1 | 2 | 3 | 4 | 5;

/** PRD §6 — tujuh karakter asli pengguna (karakter 1–7). */
export type CharacterId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** PRD §3.3 — hasil dadu 1–6 = tingkat kesulitan 1–6. */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** PRD §2.2 / §10.2 — konfigurasi khusus Snakes & Ladders. */
export interface SnakesGameConfig {
  map_id: MapThemeId;
  question_mode: QuestionMode;
  answer_time_limit: number;
  max_players: number;
  game_duration_minutes?: number;
  character_id?: CharacterId;
}

/** Metadata mode yang disimpan lokal (backend belum punya field ini). */
export interface QuizGameMeta {
  game_mode: GameMode;
  config: SnakesGameConfig;
}

export interface QuizInput {
  title: string;
  description?: string;
  cover_image_url?: string;
  questions: QuizQuestionInput[];
  /** Opsional: dikirim hanya bila backend mendukung (default QUIZ). */
  game_mode?: GameMode;
  game_config?: SnakesGameConfig;
}

export interface QuizListItem {
  id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  question_count: number;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  question_text: string;
  image_url?: string;
  time_limit_sec: number;
  points_multiplier: number;
  order_index: number;
  options: {
    id: string;
    option_text: string;
    is_correct: boolean;
    color_index: number;
    order_index: number;
  }[];
}

export interface QuizDetail extends QuizListItem {
  questions: QuizQuestion[];
  /** Diisi backend bila sudah mendukung; frontend memakai fallback lokal. */
  game_mode?: GameMode;
  game_config?: SnakesGameConfig;
}

export interface CreateSessionResponse {
  session_id: string;
  pin: string;
  host_token: string;
  quiz_id: string;
  quiz_title: string;
  question_count: number;
  ws_url: string;
}

export interface SessionInfo {
  session_id: string;
  pin: string;
  quiz_id: string;
  quiz_title: string;
  status: GameStatus;
  player_count: number;
  question_count: number;
}

export interface JoinResponse {
  player_id: string;
  player_token: string;
  nickname: string;
  ws_url: string;
}

export interface UploadResponse {
  key: string;
  url: string;
  content_type: string;
  size: number;
}

export type GameStatus = "LOBBY" | "PREVIEW" | "QUESTION" | "RESULT" | "PODIUM";

export interface WsPlayer {
  player_id: string;
  nickname: string;
  score: number;
  streak: number;
  joined_at_ms: number;
}

export interface WsOption {
  id: string;
  text: string;
  color_index: number;
}

export interface WsQuestion {
  index: number;
  total: number;
  question_text: string;
  image_url: string;
  time_limit_sec: number;
  options: WsOption[];
  started_at_ms?: number;
  deadline_ms?: number;
  /** Durasi fase preview (dikirim pada QUESTION_PREVIEW). */
  preview_ms?: number;
}

export interface StateSyncPayload {
  pin: string;
  status: GameStatus;
  quiz_title: string;
  index: number;
  total: number;
  players: WsPlayer[];
  question?: WsQuestion;
  your_answer?: { index: number; option_id: string };
  correct_option_id?: string;
  leaderboard: LeaderboardEntry[];
  total_players: number;
  server_time_ms: number;
  preview_ends_at_ms?: number;
  deadline_ms?: number;
}

export interface LeaderboardEntry {
  rank: number;
  player_id: string;
  nickname: string;
  score: number;
}

export interface LeaderboardYou {
  rank: number;
  score: number;
  streak: number;
  points_earned: number;
  is_correct: boolean;
  answered: boolean;
}

export type WsEvent =
  | { event: "STATE_SYNC"; payload: StateSyncPayload }
  | {
      event: "PLAYER_JOINED" | "PLAYER_LEFT";
      payload: { player_id: string; nickname: string; total: number };
    }
  | { event: "START_GAME"; payload: { status: string; total_questions: number; preview_seconds: number } }
  | { event: "QUESTION_PREVIEW"; payload: WsQuestion & { preview_ms: number } }
  | { event: "QUESTION_START"; payload: WsQuestion & { started_at_ms: number; deadline_ms: number } }
  | { event: "ANSWER_ACCEPTED"; payload: { index: number; option_id: string } }
  | { event: "ANSWER_COUNT_UPDATE"; payload: { index: number; answered: number; total_players: number } }
  | {
      event: "ANSWER_SUMMARY";
      payload: {
        index: number;
        correct_option_id: string;
        counts: Record<string, number>;
        total_answers: number;
        correct_count: number;
        total_players: number;
      };
    }
  | { event: "QUESTION_END"; payload: { index: number; is_last: boolean } }
  | {
      event: "LEADERBOARD_UPDATE";
      payload: { top: LeaderboardEntry[]; total_players: number; you?: LeaderboardYou };
    }
  | {
      event: "GAME_OVER";
      payload: { podium: LeaderboardEntry[]; leaderboard: LeaderboardEntry[]; total_players: number; ended_at_ms: number };
    }
  | { event: "ERROR"; payload: { code: string; message: string } };
