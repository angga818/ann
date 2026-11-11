import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clock,
  ListChecks,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { apiErrorMessage, createSession, deleteQuiz, listQuizzes } from "@/lib/api";
import type { QuizListItem } from "@/types";
import { HostShell } from "@/components/HostShell";
import { QuizThumb } from "@/components/QuizThumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/toast";
import { pushActivity, saveHostCreds } from "@/lib/storage";
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

export default function HostLibraryPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quizzes, setQuizzes] = React.useState<QuizListItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [startingId, setStartingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<QuizListItem | null>(null);
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);

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

  const filtered = React.useMemo(() => {
    if (!quizzes) return null;
    const q = query.trim().toLowerCase();
    if (!q) return quizzes;
    return quizzes.filter((x) => x.title.toLowerCase().includes(q) || x.description?.toLowerCase().includes(q));
  }, [quizzes, query]);

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

  async function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteQuiz(target.id);
      setQuizzes((prev) => prev?.filter((q) => q.id !== target.id) ?? null);
      toast("success", "Kuis dihapus", `“${target.title}” telah dihapus.`);
    } catch (e) {
      toast("error", "Gagal menghapus", apiErrorMessage(e));
    }
  }

  return (
    <HostShell>
      <motion.div
        key="library"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="space-y-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Library Kuis</h1>
            <p className="mt-1 text-sm text-muted-foreground">Kelola kuis Anda atau mulai sesi langsung.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari kuis…"
                className="w-52 pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={load} title="Muat ulang">
              <RefreshCw className={cn(!quizzes && "animate-spin")} />
            </Button>
            <Button asChild>
              <Link to="/host/quiz/new">
                <Plus /> <span className="hidden sm:inline">Kuis Baru</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Loading */}
        {!filtered && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-60 rounded-2xl" />
            ))}
          </div>
        )}

        {/* Error */}
        {filtered && error && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/30 bg-coral-soft p-12 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Coba Lagi
            </Button>
          </div>
        )}

        {/* Empty */}
        {filtered && !error && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center"
          >
            <QuizThumb title={query || "empty"} className="size-20" iconSize="size-10" />
            <div>
              <h2 className="font-display text-lg font-bold">{query ? "Tidak ada hasil" : "Belum ada kuis"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {query ? "Coba kata kunci lain." : "Buat kuis pertama Anda dan mulai sesi dengan pemain."}
              </p>
            </div>
            {!query && (
              <Button asChild size="lg">
                <Link to="/host/quiz/new">
                  <Plus /> Buat Kuis
                </Link>
              </Button>
            )}
          </motion.div>
        )}

        {/* Grid kuis */}
        {filtered && filtered.length > 0 && (
          <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((quiz) => (
                <motion.article
                  key={quiz.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="relative">
                    <QuizThumb url={quiz.cover_image_url} title={quiz.title} className="h-40 w-full rounded-none border-b border-border" iconSize="size-10" />
                    <div className="absolute right-2.5 top-2.5">
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === quiz.id ? null : quiz.id)}
                          className="grid size-8 place-items-center rounded-lg bg-card/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
                          aria-label="Menu kuis"
                        >
                          <MoreVertical className="size-4" />
                        </button>
                        <AnimatePresence>
                          {menuOpenId === quiz.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                              <motion.div
                                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                                className="absolute right-0 top-10 z-20 w-36 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg"
                              >
                                <button
                                  onClick={() => {
                                    setMenuOpenId(null);
                                    navigate(`/host/quiz/${quiz.id}`);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-secondary"
                                >
                                  <Pencil className="size-3.5" /> Edit
                                </button>
                                <button
                                  onClick={() => {
                                    setMenuOpenId(null);
                                    setDeleteTarget(quiz);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-coral-soft"
                                >
                                  <Trash2 className="size-3.5" /> Hapus
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="line-clamp-2 min-h-11 font-display text-base font-bold leading-snug">{quiz.title}</h2>
                    {quiz.description && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{quiz.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        <ListChecks /> {quiz.question_count} soal
                      </Badge>
                      <Badge variant="outline">
                        <Clock /> {timeAgo(quiz.updated_at)}
                      </Badge>
                    </div>
                    <div className="mt-auto flex gap-2 pt-5">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={startingId === quiz.id}
                        onClick={() => handleStart(quiz)}
                      >
                        <Play className={cn(startingId === quiz.id && "animate-pulse")} />
                        {startingId === quiz.id ? "Memulai…" : "Mulai Sesi"}
                      </Button>
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link to={`/host/quiz/${quiz.id}`}>
                          <Pencil /> Edit
                        </Link>
                      </Button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>

      {/* Dialog konfirmasi hapus */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus kuis ini?</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.title}” akan dihapus permanen beserta seluruh soalnya. Tindakan ini tidak bisa
              dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 /> Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HostShell>
  );
}
