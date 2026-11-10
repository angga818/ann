import axios, { AxiosError } from "axios";
import type {
  ApiErrorBody,
  CreateSessionResponse,
  JoinResponse,
  QuizDetail,
  QuizInput,
  QuizListItem,
  SessionInfo,
  UploadResponse,
} from "@/types";

/** Origin API tunggal — semua path relatif digabungkan ke sini. */
export const API_BASE_URL = "https://api.workilham.my.id";
export const API_V1 = `${API_BASE_URL}/api/v1`;

export const http = axios.create({
  baseURL: API_V1,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

/** Ubah path relatif (mis. /api/v1/media/...) menjadi URL absolut API. */
export function absoluteUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** Ubah ws_url relatif menjadi URL WebSocket absolut (PRD §3). */
export function wsUrl(wsUrl: string): string {
  if (/^wss?:\/\//i.test(wsUrl)) return wsUrl;
  return `${API_BASE_URL.replace(/^http/i, "ws")}${wsUrl.startsWith("/") ? "" : "/"}${wsUrl}`;
}

/** Pesan error ramah user dari body error REST backend. */
export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body?.error?.message) return body.error.message;
    if (err.code === "ERR_NETWORK") return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Terjadi kesalahan tak terduga.";
}

/** Kode error REST (untuk penanganan spesifik di UI). */
export function apiErrorCode(err: unknown): string | undefined {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiErrorBody | undefined;
    return body?.error?.code;
  }
  return undefined;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await axios.get(`${API_BASE_URL}/healthz`, { timeout: 8000 });
    return res.status === 200;
  } catch {
    return false;
  }
}

/* ------------------------------ Quizzes ------------------------------ */

export async function listQuizzes(): Promise<QuizListItem[]> {
  const res = await http.get<QuizListItem[]>("/quizzes");
  return res.data ?? [];
}

export async function getQuiz(id: string): Promise<QuizDetail> {
  const res = await http.get<QuizDetail>(`/quizzes/${id}`);
  return res.data;
}

export async function createQuiz(input: QuizInput): Promise<QuizDetail> {
  const res = await http.post<QuizDetail>("/quizzes", input);
  return res.data;
}

export async function updateQuiz(id: string, input: QuizInput): Promise<QuizDetail> {
  const res = await http.put<QuizDetail>(`/quizzes/${id}`, input);
  return res.data;
}

export async function deleteQuiz(id: string): Promise<void> {
  await http.delete(`/quizzes/${id}`);
}

/* ------------------------------ Sessions ----------------------------- */

export async function createSession(quizId: string): Promise<CreateSessionResponse> {
  const res = await http.post<CreateSessionResponse>("/sessions", { quiz_id: quizId });
  return res.data;
}

export async function getSession(pin: string): Promise<SessionInfo> {
  const res = await http.get<SessionInfo>(`/sessions/${pin}`);
  return res.data;
}

export async function joinSession(pin: string, nickname: string): Promise<JoinResponse> {
  const res = await http.post<JoinResponse>(`/sessions/${pin}/join`, { nickname });
  return res.data;
}

/* ------------------------------- Media ------------------------------- */

export async function uploadImage(file: File, kind: "quiz-cover" | "question" | "general", onProgress?: (pct: number) => void): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  const res = await http.post<UploadResponse>("/media/images", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return res.data;
}
