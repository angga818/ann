import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  ChevronRight,
  Flame,
  Home,
  Loader2,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { AnimatedNumber, ConnectionPill, PageTransition } from "@/components/common";
import { CountdownBar, TimerDigits } from "@/components/game/Countdown";
import { LeaderboardList, PodiumView } from "@/components/game/Leaderboard";
import { OptionGrid, QuestionHeader } from "@/components/game/OptionGrid";
import { useGameSocket } from "@/hooks/useGameSocket";
import { useToast } from "@/components/toast";
import { clearPlayerCreds, loadPlayerCreds } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function PlayerLivePage() {
  const { pin } = useParams<{ pin: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const creds = loadPlayerCreds();

  // Tanpa kredensial pemain → kembali ke halaman join.
  React.useEffect(() => {
    if (!pin) navigate("/join", { replace: true });
    else if (!creds || creds.pin !== pin) navigate(`/join/${pin}`, { replace: true });
  }, [pin, creds, navigate]);

  const { store, wsStatus, send, forceReconnect } = useGameSocket(
    creds && creds.pin === pin ? creds.ws_url : null,
  );

  // Error WS → toast sekali per pesan.
  const lastErrRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (store.lastError && store.lastError.message !== lastErrRef.current) {
      lastErrRef.current = store.lastError.message;
      const { code, message } = store.lastError;
      toast(
        code === "ALREADY_ANSWERED" || code === "QUESTION_CLOSED" ? "warning" : "error",
        code === "ALREADY_ANSWERED"
          ? "Sudah menjawab"
          : code === "QUESTION_CLOSED"
            ? "Waktu habis"
            : `Error: ${code}`,
        message,
      );
    }
  }, [store.lastError, toast]);

  function submitAnswer(optionId: string) {
    if (store.yourAnswer || store.status !== "QUESTION") return;
    const ok = send("SUBMIT_ANSWER", { index: store.index, option_id: optionId });
    if (!ok) toast("warning", "Belum terhubung", "Jawaban tidak terkirim — tunggu koneksi pulih.");
  }

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

  if (!pin) return null;

  const you = store.you;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header ringkas */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/">
            <Logo compact />
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-display tabular-nums">
              PIN {pin}
            </Badge>
            <ConnectionPill status={wsStatus} />
            {wsStatus !== "open" && (
              <Button variant="outline" size="iconSm" onClick={forceReconnect} title="Sambung ulang">
                <RefreshCw />
              </Button>
            )}
          </div>
        </div>
      </header>

      <PageTransition className="max-w-4xl pb-32">
        <AnimatePresence mode="wait">
          {/* ------------------------------ LOBBY ------------------------------ */}
          {view === "lobby" && (
            <motion.section
              key="lobby"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-col items-center py-10 text-center"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
                className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-xl shadow-fuchsia-500/25"
              >
                <Users className="size-9 text-white" strokeWidth={2.2} />
              </motion.div>

              <h1 className="mt-7 font-display text-3xl font-black tracking-tight">
                Halo, <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">{creds?.nickname}</span>!
              </h1>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Anda sudah masuk lobby. Menunggu host memulai permainan…
              </p>

              <div className="mt-10 grid w-full max-w-sm grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-card/60 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pemain</p>
                  <AnimatedNumber value={store.totalPlayers || store.players.length} className="mt-1 block font-display text-3xl font-black tabular-nums" />
                </div>
                <div className="rounded-2xl border border-border bg-card/60 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Soal</p>
                  <AnimatedNumber value={store.total} className="mt-1 block font-display text-3xl font-black tabular-nums" />
                </div>
              </div>

              <div className="mt-10 w-full max-w-sm">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Sudah di lobby</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <AnimatePresence>
                    {store.players.map((p) => (
                      <motion.span
                        key={p.player_id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-semibold",
                          p.player_id === creds?.player_id
                            ? "border-violet-400/50 bg-violet-500/15 text-violet-200"
                            : "border-border bg-white/[0.03] text-foreground/80",
                        )}
                      >
                        {p.nickname}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <motion.p
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="mt-12 flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Loader2 className="size-4 animate-spin" /> Menunggu host…
              </motion.p>
            </motion.section>
          )}

          {/* ------------------------------ PREVIEW ----------------------------- */}
          {view === "preview" && (
            <motion.section
              key={`preview-${store.question?.index ?? 0}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[70vh] flex-col items-center justify-center text-center"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative grid size-32 place-items-center"
              >
                <motion.span
                  className="absolute inset-0 rounded-full border-4 border-violet-400/40"
                  animate={{ scale: [1, 1.35, 1], opacity: [0.8, 0, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
                <span className="font-display text-6xl font-black">
                  {String((store.question?.index ?? 0) + 1).padStart(2, "0")}
                </span>
              </motion.div>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Soal berikutnya
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">Bersiap jawab secepat mungkin untuk poin maksimal!</p>
            </motion.section>
          )}

          {/* --------------------------- QUESTION / RESULT --------------------------- */}
          {(view === "question" || view === "result") && store.question && (
            <motion.section
              key={`q-${store.question.index}`}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* status jawaban / timer */}
              <div className="mb-5 flex items-center justify-between gap-3">
                {view === "question" && !store.yourAnswer ? (
                  <div className="flex items-center gap-4">
                    <TimerDigits deadlineMs={store.deadlineMs} totalMs={store.question.time_limit_sec * 1000} />
                    <span className="text-sm text-muted-foreground">detik</span>
                  </div>
                ) : (
                  <Badge variant={you?.is_correct === true ? "success" : you?.is_correct === false ? "destructive" : "accent"} className="px-3.5 py-2 text-xs">
                    {view === "question" ? (
                      <>
                        <BadgeCheck className="size-4" /> Jawaban diterima!
                      </>
                    ) : you?.is_correct ? (
                      <>
                        <Trophy className="size-4" /> Benar! +{you.points_earned.toLocaleString("id-ID")}
                      </>
                    ) : you?.answered ? (
                      <>Salah — coba lagi di soal berikutnya</>
                    ) : (
                      <>Tidak sempat menjawab</>
                    )}
                  </Badge>
                )}
                {view === "question" && (
                  <Badge variant="secondary" className="px-3 py-1.5">
                    <Flame className={cn(you?.streak ? "text-orange-400" : "text-muted-foreground/50")} />
                    streak {you?.streak ?? 0}
                  </Badge>
                )}
              </div>

              {view === "question" && !store.yourAnswer && (
                <CountdownBar deadlineMs={store.deadlineMs} totalMs={store.question.time_limit_sec * 1000} className="mb-6" />
              )}

              <QuestionHeader question={store.question} eager />

              <OptionGrid
                question={store.question}
                mode="player"
                selectedOptionId={store.yourAnswer?.option_id}
                correctOptionId={store.correctOptionId}
                reveal={view === "result"}
                onSelect={(opt) => submitAnswer(opt.id)}
              />

              {/* Hasil personal */}
              {view === "result" && you && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="mt-8 grid grid-cols-3 gap-3"
                >
                  <div
                    className={cn(
                      "rounded-2xl border p-4 text-center",
                      you.is_correct ? "border-emerald-500/30 bg-emerald-500/10" : "border-border bg-white/[0.03]",
                    )}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Poin</p>
                    <AnimatedNumber
                      value={you.points_earned}
                      className={cn("mt-1 block font-display text-2xl font-black", you.is_correct && "text-emerald-300")}
                    />
                  </div>
                  <div className="rounded-2xl border border-border bg-white/[0.03] p-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Peringkat</p>
                    <p className="mt-1 font-display text-2xl font-black tabular-nums">
                      #{you.rank}
                      <span className="text-sm font-bold text-muted-foreground"> / {store.totalPlayers}</span>
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-white/[0.03] p-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Streak</p>
                    <p className="mt-1 font-display text-2xl font-black tabular-nums">
                      {you.streak}
                      {you.streak > 1 && <Flame className="ml-0.5 inline size-4 text-orange-400" />}
                    </p>
                  </div>
                </motion.div>
              )}

              {view === "result" && store.leaderboard.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8 rounded-2xl border border-border bg-card/60 p-5"
                >
                  <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Top 10
                  </h3>
                  <LeaderboardList entries={store.leaderboard} highlightPlayerId={creds?.player_id} />
                </motion.div>
              )}

              {view === "result" && (
                <motion.p
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground"
                >
                  <Loader2 className="size-4 animate-spin" /> Menunggu host melanjutkan…
                </motion.p>
              )}
            </motion.section>
          )}

          {/* ------------------------------ PODIUM ------------------------------ */}
          {view === "podium" && (
            <motion.section
              key="podium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-6"
            >
              <div className="mb-14 text-center">
                <motion.h1
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 14 }}
                  className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text font-display text-4xl font-black text-transparent sm:text-5xl"
                >
                  Hasil Akhir
                </motion.h1>
                {you && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Anda finis peringkat{" "}
                    <span className="font-display font-black text-violet-300">#{you.rank}</span> dengan{" "}
                    <span className="font-display font-black text-violet-300">
                      {you.score.toLocaleString("id-ID")}
                    </span>{" "}
                    poin
                  </p>
                )}
              </div>

              <PodiumView podium={store.podium ?? []} highlightPlayerId={creds?.player_id} />

              {store.finalLeaderboard && store.finalLeaderboard.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-16 rounded-2xl border border-border bg-card/60 p-5"
                >
                  <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Klasemen Akhir
                  </h3>
                  <LeaderboardList entries={store.finalLeaderboard} highlightPlayerId={creds?.player_id} />
                </motion.div>
              )}

              <div className="mt-12 flex flex-wrap justify-center gap-3">
                <Button asChild variant="outline">
                  <Link to="/">
                    <Home /> Beranda
                  </Link>
                </Button>
                <Button
                  onClick={() => {
                    clearPlayerCreds();
                    navigate("/join");
                  }}
                >
                  Main Lagi <ChevronRight />
                </Button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </PageTransition>
    </div>
  );
}
