import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Copy,
  Eye,
  Flag,
  Link2,
  Loader2,
  LogOut,
  RefreshCw,
  ScanLine,
  Smartphone,
  Users,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { AnimatedNumber, ConnectionPill, PageTransition } from "@/components/common";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CountdownBar, PreviewCountdown, TimerRing } from "@/components/game/Countdown";
import { LeaderboardList, PodiumView } from "@/components/game/Leaderboard";
import { AnswerBars, OptionGrid, QuestionHeader } from "@/components/game/OptionGrid";
import { useGameSocket } from "@/hooks/useGameSocket";
import { useServerCountdown } from "@/hooks/useServerCountdown";
import { useToast } from "@/components/toast";
import { AvatarIcon, avatarForPlayer } from "@/lib/avatars";
import { loadHostCreds, pushActivity } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function HostLivePage() {
  const { pin } = useParams<{ pin: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [endConfirm, setEndConfirm] = React.useState(false);
  const creds = loadHostCreds();

  // Tanpa kredensial host yang cocok → kembali ke dashboard.
  React.useEffect(() => {
    if (!pin) navigate("/host", { replace: true });
    else if (!creds || creds.pin !== pin) navigate("/host", { replace: true });
  }, [pin, creds, navigate]);

  const { store, wsStatus, send, forceReconnect } = useGameSocket(creds && creds.pin === pin ? creds.ws_url : null);

  // Sisa waktu soal aktif — untuk mendeteksi fase "menghitung hasil".
  const remaining = useServerCountdown(store.deadlineMs);
  const tallying = store.status === "QUESTION" && !!store.deadlineMs && remaining <= 0;

  // Catat aktivitas "permainan selesai" sekali saat podium muncul (untuk dashboard).
  const endedRef = React.useRef(false);
  React.useEffect(() => {
    if (store.status === "PODIUM" && !endedRef.current) {
      endedRef.current = true;
      pushActivity({
        type: "game-ended",
        label: `Permainan selesai — ${store.quizTitle || creds?.quiz_title || "Sesi"}`,
        detail: `${store.totalPlayers} pemain`,
      });
    }
  }, [store.status, store.quizTitle, store.totalPlayers, creds]);

  // Tangani error WS terakhir → toast.
  const lastErrRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (store.lastError && store.lastError.message !== lastErrRef.current) {
      lastErrRef.current = store.lastError.message;
      toast("error", `Error: ${store.lastError.code}`, store.lastError.message);
    }
  }, [store.lastError, toast]);

  // URL join: origin + path + hash route (dengan PIN terisi otomatis).
  const joinUrl = `${window.location.origin}${window.location.pathname}#/join/${pin ?? ""}`;

  function copyPin() {
    const digits = (pin ?? "").split("").join(" ");
    navigator.clipboard?.writeText(pin ?? "").then(
      () => toast("success", "PIN tersalin", digits),
      () => toast("error", "Gagal menyalin"),
    );
  }

  function copyJoinLink() {
    navigator.clipboard?.writeText(joinUrl).then(
      () => toast("success", "Link join tersalin", joinUrl),
      () => toast("error", "Gagal menyalin"),
    );
  }

  function startGame() {
    if (!send("START_GAME")) toast("warning", "Belum terhubung", "Tunggu koneksi tersambung lalu coba lagi.");
  }
  function nextQuestion() {
    send("NEXT_QUESTION");
  }
  function endGame() {
    setEndConfirm(false);
    send("END_GAME");
  }

  if (!pin) return null;

  const view =
    store.status === "PODIUM"
      ? "podium"
      : store.status === "LOBBY"
        ? "lobby"
        : store.status === "RESULT"
          ? "result"
          : store.status === "PREVIEW"
            ? "preview"
            : "question";

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/host">
              <Logo compact />
            </Link>
            <div className="hidden flex-col sm:flex">
              <span className="font-display text-sm font-bold leading-tight">
                {store.quizTitle || creds?.quiz_title || "Sesi Live"}
              </span>
              <span className="text-[11px] text-muted-foreground">Mode Host</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 font-display text-sm font-bold tabular-nums sm:flex">
              PIN {pin}
            </div>
            <ConnectionPill status={wsStatus} />
            {wsStatus !== "open" && (
              <Button variant="outline" size="iconSm" onClick={forceReconnect} title="Sambung ulang">
                <RefreshCw />
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <PageTransition>
        <AnimatePresence mode="wait">
          {/* ------------------------------ LOBBY ------------------------------ */}
          {view === "lobby" && (
            <motion.section
              key="lobby"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.1fr_1fr]"
            >
              {/* Kartu PIN + QR */}
              <div className="rounded-3xl border border-border bg-card p-8 text-center sm:p-10">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Kode PIN</p>
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.1 }}
                  className="mt-4"
                >
                  <span className="font-display text-6xl font-black tracking-[0.18em] tabular-nums sm:text-7xl">
                    {pin}
                  </span>
                </motion.div>

                {/* QR code */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25, type: "spring", stiffness: 220, damping: 20 }}
                  className="mt-8 flex flex-col items-center"
                >
                  <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                    <QRCodeSVG
                      value={joinUrl}
                      size={168}
                      bgColor="#ffffff"
                      fgColor="#202936"
                      level="M"
                      marginSize={0}
                      title={`QR untuk bergabung ke sesi ${pin}`}
                    />
                  </div>
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <ScanLine className="size-3.5 text-primary" />
                    Scan untuk bergabung langsung
                  </p>
                </motion.div>

                <p className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Smartphone className="size-4" />
                  Atau buka <span className="font-semibold text-foreground">QuizLive</span>, pilih “Gabung”, lalu masukkan PIN
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Button variant="outline" onClick={copyPin}>
                    <Copy /> Salin PIN
                  </Button>
                  <Button variant="outline" onClick={copyJoinLink}>
                    <Link2 /> Link Join
                  </Button>
                </div>
              </div>

              {/* Panel pemain */}
              <div className="rounded-3xl border border-border bg-card p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                    <Users className="size-5 text-primary" /> Ruang Tunggu
                  </h2>
                  <Badge variant="secondary" className="px-3 py-1 font-display text-sm">
                    <AnimatedNumber value={store.players.length} className="font-display" /> pemain
                  </Badge>
                </div>

                {store.players.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
                    <motion.div
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ repeat: Infinity, duration: 3.2 }}
                      className="rounded-2xl bg-secondary p-4"
                    >
                      <Eye className="size-7 opacity-60" />
                    </motion.div>
                    <p className="text-sm">Menunggu pemain pertama…</p>
                  </div>
                ) : (
                  <div className="flex max-h-[22rem] flex-wrap gap-2.5 overflow-y-auto pr-1">
                    <AnimatePresence>
                      {store.players.map((p) => (
                        <motion.div
                          key={p.player_id}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2"
                        >
                          <AvatarIcon id={avatarForPlayer(p.player_id)} className="size-8" />
                          <span className="max-w-36 truncate text-sm font-semibold">{p.nickname}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                <div className="mt-8 space-y-3">
                  <Button
                    size="lg"
                    className="w-full text-base"
                    disabled={store.players.length < 1 || wsStatus !== "open"}
                    onClick={startGame}
                  >
                    {store.players.length < 1 ? (
                      <>
                        <Loader2 className="animate-spin" /> Butuh minimal 1 pemain
                      </>
                    ) : (
                      <>
                        Mulai Permainan <ChevronRight />
                      </>
                    )}
                  </Button>
                  <Button variant="outlineDestructive" size="sm" className="w-full" onClick={() => setEndConfirm(true)}>
                    <Flag /> Akhiri Sesi
                  </Button>
                </div>
              </div>
            </motion.section>
          )}

          {/* --------------------------- PREVIEW ------------------------------- */}
          {view === "preview" && (
            <motion.section
              key={`preview-${store.question?.index ?? store.index}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[70vh] flex-col items-center justify-center text-center"
            >
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground"
              >
                Bersiap — Soal {(store.question?.index ?? store.index) + 1} dari {store.question?.total ?? store.total}
              </motion.p>
              <PreviewCountdown
                endsAtMs={store.previewEndsAtMs}
                fallbackNumber={(store.question?.index ?? store.index) + 1}
                totalMs={3000}
                label="Pertanyaan segera dimulai…"
              />
              {store.question && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="mt-8 max-w-xl"
                >
                  <p className="line-clamp-3 rounded-2xl border border-border bg-card px-5 py-3.5 text-sm font-medium text-muted-foreground">
                    {store.question.question_text}
                  </p>
                </motion.div>
              )}
            </motion.section>
          )}

          {/* --------------------------- QUESTION / RESULT --------------------------- */}
          {(view === "question" || view === "result") && store.question && (
            <motion.section
              key={`q-${store.question.index}`}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              {/* Timer + jumlah jawaban */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {tallying ? (
                  <Badge variant="warning" className="px-3.5 py-2 text-xs">
                    <Loader2 className="animate-spin" /> Waktu habis — menghitung hasil…
                  </Badge>
                ) : view === "question" ? (
                  <TimerRing
                    deadlineMs={store.deadlineMs}
                    totalMs={store.question.time_limit_sec * 1000}
                    size={64}
                  />
                ) : (
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Soal selesai
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <Badge
                    variant={store.answeredCount >= store.totalPlayers && store.totalPlayers > 0 ? "success" : "secondary"}
                    className="px-3 py-1.5"
                  >
                    <Users className="size-3.5" />
                    <AnimatedNumber value={store.answeredCount} className="font-display" />
                    <span className="opacity-50">/{store.totalPlayers}</span> menjawab
                  </Badge>
                  <Badge variant="accent" className="px-3 py-1.5">
                    {store.question.time_limit_sec} detik
                  </Badge>
                </div>
              </div>
              {view === "question" && (
                <CountdownBar deadlineMs={store.deadlineMs} totalMs={store.question.time_limit_sec * 1000} />
              )}

              <QuestionHeader question={store.question} eager />

              <OptionGrid
                question={store.question}
                mode="host"
                reveal={view === "result"}
                correctOptionId={store.correctOptionId}
              />

              {/* Ringkasan setelah semua menjawab */}
              {view === "result" && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2"
                >
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <AnswerBars
                      counts={store.answerCounts ?? {}}
                      options={store.question.options}
                      correctOptionId={store.correctOptionId}
                    />
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Klasemen Sementara
                    </h3>
                    <LeaderboardList entries={store.leaderboard} />
                  </div>
                </motion.div>
              )}

              {/* Kontrol host */}
              <div className="sticky bottom-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                <p className="px-2 text-xs text-muted-foreground">
                  {tallying
                    ? "Menunggu ringkasan jawaban dari server…"
                    : view === "question"
                      ? "Menunggu jawaban pemain…"
                      : store.isLast
                        ? "Soal terakhir — lanjutkan untuk podium."
                        : "Lanjutkan ke soal berikutnya."}
                </p>
                <div className="flex gap-2">
                  <Button variant="outlineDestructive" size="sm" onClick={() => setEndConfirm(true)}>
                    <Flag /> Akhiri
                  </Button>
                  {view === "result" && (
                    <Button size="lg" onClick={nextQuestion} disabled={wsStatus !== "open"}>
                      {store.isLast ? (
                        <>
                          Lihat Podium <ChevronRight />
                        </>
                      ) : (
                        <>
                          Soal Berikutnya <ChevronRight />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </motion.section>
          )}

          {/* ------------------------------ PODIUM ------------------------------ */}
          {view === "podium" && (
            <motion.section
              key="podium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-auto w-full max-w-4xl"
            >
              <div className="mb-14 text-center">
                <motion.h1
                  initial={{ scale: 0.75, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 14 }}
                  className="font-display text-4xl font-black tracking-tight text-gold sm:text-5xl"
                >
                  Permainan Selesai!
                </motion.h1>
                <p className="mt-3 text-sm text-muted-foreground">
                  {store.totalPlayers} pemain · {store.quizTitle || creds?.quiz_title}
                </p>
              </div>

              <PodiumView podium={store.podium ?? []} />

              {store.finalLeaderboard && store.finalLeaderboard.length > 3 && (
                <div className="mt-16 rounded-2xl border border-border bg-card p-6">
                  <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Klasemen Akhir
                  </h3>
                  <LeaderboardList entries={store.finalLeaderboard} />
                </div>
              )}

              <div className="mt-10 flex justify-center gap-3">
                <Button variant="outline" onClick={() => navigate("/host")}>
                  <LogOut /> Kembali ke Dashboard
                </Button>
                <Button onClick={() => navigate("/host")}>
                  Buat Sesi Baru <ChevronRight />
                </Button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </PageTransition>

      {/* Konfirmasi akhiri game */}
      <Dialog open={endConfirm} onOpenChange={setEndConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Akhiri permainan sekarang?</DialogTitle>
            <DialogDescription>
              Permainan akan langsung berakhir dan podium final akan ditampilkan. Skor saat ini menjadi skor akhir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndConfirm(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={endGame}>
              <Flag /> Ya, Akhiri
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
