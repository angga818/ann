/** REST + WebSocket contracts (PRD §5–§6) */

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

export interface QuizInput {
  title: string;
  description?: string;
  cover_image_url?: string;
  questions: QuizQuestionInput[];
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
