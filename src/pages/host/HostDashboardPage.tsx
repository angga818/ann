import * as React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ChevronRight,
  ClipboardList,
  Clock,
  LibraryBig,
  ListChecks,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { apiErrorMessage, createSession, listQuizzes } from "@/lib/api";
import type { QuizListItem } from "@/types";
import { HostShell } from "@/components/HostShell";
import { QuizThumb } from "@/components/QuizThumb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/toast";
import { loadActivity, pushActivity, saveHostCreds } from "@/lib/storage";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari lalu`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

const ACTIVITY_ICON = {
  "quiz-created": { icon: Plus, cls: "bg-primary-soft text-primary" },
  "quiz-updated": { icon: ClipboardList, cls: "bg-accent-soft text-accent" },
  "session-hosted": { icon: Play, cls: "bg-success-soft text-success" },
  "game-ended": { icon: Users, cls: "bg-coral-soft text-coral" },
  "player-joined": { icon: Users, cls: "bg-warning-soft text-warning" },
} as const;

export default function HostDashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quizzes, setQuizzes] = React.useState<QuizListItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [startingId, setStartingId] = React.useState<string | null>(null);
  const [activity, setActivity] = React.useState(loadActivity);

  const load = React.useCallback(async () => {
    setError(null);
    setQuizzes(null);
    try {
      setQuizzes(await listQuizzes());
    } catch (e) {
      setError(apiErrorMessage(e));
      setQuizzes([]);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleStart(quiz: QuizListItem) {
    setStartingId(quiz.id);
    try {
      const s = await createSession(quiz.id);
      saveHostCreds(s);
      pushActivity({
        type: "session-hosted",
        label: `Memulai sesi “${quiz.title}”`,
        detail: `PIN ${s.pin} · ${quiz.question_count} soal`,
      });
      navigate(`/host/live/${s.pin}`);
    } catch (e) {
      toast("error", "Gagal membuat sesi", apiErrorMessage(e));
    } finally {
      setStartingId(null);
    }
  }

  const totalQuestions = quizzes?.reduce((a, q) => a + q.question_count, 0) ?? 0;
  const sessionsHosted = activity.filter((a) => a.type === "session-hosted").length;
  const recent = [...(quizzes ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);

  return (
    <HostShell>
      <motion.div
        key="dashboard"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="space-y-8"
      >
        {/* Sapaan + aksi */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{greeting()}, Host 👋</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Siap meng-host kuis hari ini?</h1>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/host/library">
                <LibraryBig /> Library
              </Link>
            </Button>
            <Button asChild>
              <Link to="/host/quiz/new">
                <Plus /> Buat Kuis
              </Link>
            </Button>
          </div>
        </div>

        {/* Statistik */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { icon: LibraryBig, label: "Total Kuis", value: quizzes?.length, tint: "bg-primary-soft text-primary" },
            { icon: ListChecks, label: "Total Soal", value: totalQuestions, tint: "bg-accent-soft text-accent" },
            { icon: Play, label: "Sesi Di-hosting", value: sessionsHosted, tint: "bg-success-soft text-success" },
            { icon: Users, label: "Permainan Selesai", value: activity.filter((a) => a.type === "game-ended").length, tint: "bg-coral-soft text-coral" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 260, damping: 22 }}
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className={cn("mb-3 grid size-9 place-items-center rounded-xl", s.tint)}>
                <s.icon className="size-4.5" />
              </span>
              {s.value === null || s.value === undefined ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="font-display text-2xl font-bold tabular-nums">{s.value.toLocaleString("id-ID")}</p>
              )}
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Kuis terbaru */}
          <section className="rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="flex items-center gap-2 font-display text-base font-bold">
                <Sparkles className="size-4 text-primary" /> Kuis Terbaru
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/host/library">
                  Lihat semua <ChevronRight />
                </Link>
              </Button>
            </div>

            <div className="divide-y divide-border">
              {!quizzes && (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="size-14 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {quizzes && error && (
                <div className="flex flex-col items-center gap-3 p-10 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button variant="outline" size="sm" onClick={load}>
                    <RefreshCw /> Coba Lagi
                  </Button>
                </div>
              )}

              {quizzes && !error && recent.length === 0 && (
                <div className="flex flex-col items-center gap-4 p-10 text-center">
                  <QuizThumb title="empty" className="size-16" />
                  <p className="text-sm text-muted-foreground">Belum ada kuis. Buat kuis pertama Anda!</p>
                  <Button asChild size="sm">
                    <Link to="/host/quiz/new">
                      <Plus /> Buat Kuis
                    </Link>
                  </Button>
                </div>
              )}

              {quizzes &&
                !error &&
                recent.map((q, i) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group flex items-center gap-4 p-4 transition-colors hover:bg-secondary/50"
                  >
                    <QuizThumb url={q.cover_image_url} title={q.title} className="size-14 shrink-0" iconSize="size-6" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{q.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <ListChecks className="size-3" /> {q.question_count} soal
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" /> {timeAgo(q.updated_at)}
                        </span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0"
                      disabled={startingId === q.id}
                      onClick={() => handleStart(q)}
                    >
                      <Play className={cn(startingId === q.id && "animate-pulse")} />
                      <span className="hidden sm:inline">{startingId === q.id ? "Memulai…" : "Mulai"}</span>
                    </Button>
                  </motion.div>
                ))}
            </div>
          </section>

          {/* Aktivitas terbaru */}
          <section className="rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="flex items-center gap-2 font-display text-base font-bold">
                <Activity className="size-4 text-accent" /> Aktivitas Terbaru
              </h2>
            </div>
            {activity.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Belum ada aktivitas tercatat di perangkat ini.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activity.slice(0, 6).map((a, i) => {
                  const cfg = ACTIVITY_ICON[a.type] ?? ACTIVITY_ICON["player-joined"];
                  return (
                    <motion.div
                      key={`${a.at}-${i}`}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-start gap-3 p-4"
                    >
                      <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg", cfg.cls)}>
                        <cfg.icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.label}</p>
                        {a.detail && <p className="truncate text-xs text-muted-foreground">{a.detail}</p>}
                        <p className="mt-0.5 text-[11px] text-muted-foreground/70">{timeAgo(new Date(a.at).toISOString())}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* CTA join pemain */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-primary-soft p-6">
          <div className="flex items-center gap-4">
            <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Users className="size-5" />
            </span>
            <div>
              <p className="font-display font-bold">Ingin ikut bermain?</p>
              <p className="text-sm text-muted-foreground">Buka halaman join dan masukkan PIN dari host.</p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link to="/join">
              <Play /> Halaman Join
            </Link>
          </Button>
        </div>
      </motion.div>
    </HostShell>
  );
}
