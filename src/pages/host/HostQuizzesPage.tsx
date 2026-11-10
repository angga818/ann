import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
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
import { Logo } from "@/components/Logo";
import { PageTransition } from "@/components/common";
import { SmartImage } from "@/components/SmartImage";
import { ThemeToggle } from "@/components/ThemeToggle";
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
import { saveHostCreds } from "@/lib/storage";
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

export default function HostQuizzesPage() {
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
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link to="/host/quiz/new">
                <Plus /> Kuis Baru
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <PageTransition>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">Pustaka Kuis</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Kelola kuis Anda atau mulai sesi langsung.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari kuis…"
                className="w-56 pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={load} title="Muat ulang">
              <RefreshCw className={cn(!quizzes && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Loading */}
        {!filtered && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        )}

        {/* Error */}
        {filtered && error && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-12 text-center">
            <p className="text-sm text-red-300">{error}</p>
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Coba Lagi
            </Button>
          </div>
        )}

        {/* Empty */}
        {filtered && !error && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-5 rounded-3xl border border-dashed border-foreground/15 bg-foreground/[0.02] px-6 py-20 text-center"
          >
            <div className="rounded-2xl bg-secondary p-5 text-primary">
              <ListChecks className="size-9" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">
                {query ? "Tidak ada hasil" : "Belum ada kuis"}
              </h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
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
          <motion.div layout className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((quiz) => (
                <motion.article
                  key={quiz.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-1 hover:border-foreground/25"
                >
                  <SmartImage
                    url={quiz.cover_image_url}
                    alt={`Cover ${quiz.title}`}
                    className="h-40 w-full rounded-none border-b border-border"
                  />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 min-h-11 font-display text-base font-bold leading-snug">{quiz.title}</h2>
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === quiz.id ? null : quiz.id)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
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
                                className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg"
                              >
                                <button
                                  onClick={() => {
                                    setMenuOpenId(null);
                                    navigate(`/host/quiz/${quiz.id}`);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-foreground/10"
                                >
                                  <Pencil className="size-3.5" /> Edit
                                </button>
                                <button
                                  onClick={() => {
                                    setMenuOpenId(null);
                                    setDeleteTarget(quiz);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
                                >
                                  <Trash2 className="size-3.5" /> Hapus
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    {quiz.description && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{quiz.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="secondary">
                        <ListChecks className="size-3" />
                        {quiz.question_count} soal
                      </Badge>
                      <Badge variant="outline">{timeAgo(quiz.updated_at)}</Badge>
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
      </PageTransition>

      {/* Dialog konfirmasi hapus */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus kuis ini?</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.title}” akan dihapus permanen beserta seluruh soalnya. Tindakan ini tidak bisa dibatalkan.
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
    </div>
  );
}
