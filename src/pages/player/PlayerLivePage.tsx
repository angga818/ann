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
  Volume2,
  VolumeX,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { AnimatedNumber, ConnectionPill, PageTransition } from "@/components/common";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CountdownBar, PreviewCountdown, TimerRing } from "@/components/game/Countdown";
import { CelebrationBurst } from "@/components/game/Celebration";
import { LeaderboardList, PodiumView } from "@/components/game/Leaderboard";
import { Top3Strip } from "@/components/game/Top3Strip";
import { OptionGrid, QuestionHeader } from "@/components/game/OptionGrid";
import { useGameSocket } from "@/hooks/useGameSocket";
import { useServerCountdown } from "@/hooks/useServerCountdown";
import { useToast } from "@/components/toast";
import {
  PlayerAvatar,
  avatarForPlayer,
  customAvatarRef,
  loadCustomAvatarChoice,
  type AvatarRef,
} from "@/lib/avatars";
import { clearPlayerCreds, loadPlayerCreds } from "@/lib/storage";
import {
  loadSoundEnabled,
  playClick,
  playCorrect,
  playTimeUp,
  playWrong,
  saveSoundEnabled,
} from "@/lib/sound";
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

  // Sisa waktu soal aktif — untuk mengunci input dan info "waktu habis".
  const remaining = useServerCountdown(store.deadlineMs);
  const timeUp = store.status === "QUESTION" && !!store.deadlineMs && remaining <= 0;

  // Avatar: pemain lain → hash player_id; diri sendiri → pilihan di halaman join
  // (karakter preset atau foto hasil unggahan, tersimpan lokal).
  const [customAvatar] = React.useState(() => loadCustomAvatarChoice());
  const myAvatar: AvatarRef = React.useMemo(
    () => (customAvatar ? customAvatarRef(customAvatar) : (creds?.avatarId ?? 0)),
    [customAvatar, creds],
  );
  const getAvatar = React.useCallback(
    (playerId: string) => (playerId === creds?.player_id ? myAvatar : avatarForPlayer(playerId)),
    [creds, myAvatar],
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

  // Efek suara: bisa dimatikan pemain, diputar sekali per soal saat hasil keluar.
  const [soundOn, setSoundOn] = React.useState(() => loadSoundEnabled());
  const soundPlayedRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (store.status !== "RESULT" || !store.question || !store.you) return;
    if (soundPlayedRef.current === store.question.index) return;
    soundPlayedRef.current = store.question.index;
    const you = store.you;
    if (!you.answered) playTimeUp();
    else if (you.is_correct) playCorrect();
    else playWrong();
  }, [store.status, store.question, store.you]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    saveSoundEnabled(next);
    if (next) playClick();
  }

  function submitAnswer(optionId: string) {
    if (store.yourAnswer || store.status !== "QUESTION" || timeUp) return;
    playClick();
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
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/">
            <Logo compact />
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden font-display tabular-nums sm:inline-flex">
              PIN {pin}
            </Badge>
            <ConnectionPill status={wsStatus} />
            {wsStatus !== "open" && (
              <Button variant="outline" size="iconSm" onClick={forceReconnect} title="Sambung ulang">
                <RefreshCw />
              </Button>
            )}
            <Button
              variant="ghost"
              size="iconSm"
              onClick={toggleSound}
              title={soundOn ? "Matikan efek suara" : "Nyalakan efek suara"}
              aria-pressed={soundOn}
            >
              {soundOn ? <Volume2 /> : <VolumeX className="text-muted-foreground" />}
            </Button>
            <ThemeToggle />
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
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
                className="grid size-24 place-items-center rounded-3xl border-4 border-primary/20 bg-primary-soft"
              >
                <PlayerAvatar avatar={myAvatar} className="size-20" alt={creds?.nickname ?? ""} />
              </motion.div>

              <h1 className="mt-7 font-display text-3xl font-black tracking-tight">
                Halo, <span className="text-primary">{creds?.nickname}</span>!
              </h1>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Anda sudah masuk lobby. Menunggu host memulai permainan…
              </p>

              <div className="mt-10 grid w-full max-w-sm grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pemain</p>
                  <AnimatedNumber
                    value={store.totalPlayers || store.players.length}
                    className="mt-1 block font-display text-3xl font-black tabular-nums"
                  />
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Soal</p>
                  <AnimatedNumber value={store.total} className="mt-1 block font-display text-3xl font-black tabular-nums" />
                </div>
              </div>

              <div className="mt-10 w-full max-w-sm">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Sudah di lobby
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <AnimatePresence>
                    {store.players.map((p) => {
                      const me = p.player_id === creds?.player_id;
                      return (
                        <motion.span
                          key={p.player_id}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 450, damping: 25 }}
                          className={cn(
                            "flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-xs font-semibold",
                            me ? "border-primary/45 bg-primary-soft text-primary" : "border-border bg-card text-foreground/80",
                          )}
                        >
                          <PlayerAvatar avatar={getAvatar(p.player_id)} className="size-6" />
                          {p.nickname}
                        </motion.span>
                      );
                    })}
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
              <PreviewCountdown
                endsAtMs={store.previewEndsAtMs}
                fallbackNumber={(store.question?.index ?? 0) + 1}
                totalMs={3000}
                label={`Soal ${String((store.question?.index ?? 0) + 1).padStart(2, "0")} dari ${store.total || "?"}`}
              />
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 text-xs text-muted-foreground/70"
              >
                Jawab secepat mungkin untuk poin maksimal!
              </motion.p>
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
            >
              {/* status jawaban / timer */}
              <div className="mb-5 flex items-center justify-between gap-3">
                {view === "question" && !store.yourAnswer && !timeUp ? (
                  <TimerRing
                    deadlineMs={store.deadlineMs}
                    totalMs={store.question.time_limit_sec * 1000}
                    size={64}
                  />
                ) : view === "question" && timeUp && !store.yourAnswer ? (
                  <Badge variant="warning" className="px-3.5 py-2 text-xs">
                    <Loader2 className="animate-spin" /> Waktu habis — menghitung hasil…
                  </Badge>
                ) : view === "question" ? (
                  <Badge variant="accent" className="px-3.5 py-2 text-xs">
                    <BadgeCheck className="size-4" /> Jawaban diterima!
                  </Badge>
                ) : (
                  <span className="relative inline-flex">
                    {/* ledakan kecil saat jawaban benar */}
                    {you?.is_correct && <CelebrationBurst count={16} spread={90} />}
                    <motion.span
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 420, damping: 18 }}
                    >
                      <Badge
                        variant={you?.is_correct === true ? "success" : you?.is_correct === false ? "destructive" : "secondary"}
                        className="px-3.5 py-2 text-xs"
                      >
                        {you?.is_correct ? (
                          <>
                            <Trophy className="size-4" /> Benar! +{you.points_earned.toLocaleString("id-ID")}
                          </>
                        ) : you?.answered ? (
                          <>Salah — coba lagi di soal berikutnya</>
                        ) : (
                          <>Tidak sempat menjawab</>
                        )}
                      </Badge>
                    </motion.span>
                  </span>
                )}
                {view === "question" && (
                  <Badge variant="secondary" className="px-3 py-1.5">
                    <Flame className={cn(you?.streak ? "text-warning" : "text-muted-foreground/50")} />
                    streak {you?.streak ?? 0}
                  </Badge>
                )}
              </div>

              {view === "question" && !store.yourAnswer && !timeUp && (
                <CountdownBar
                  deadlineMs={store.deadlineMs}
                  totalMs={store.question.time_limit_sec * 1000}
                  className="mb-6"
                />
              )}

              <QuestionHeader question={store.question} eager />

              <OptionGrid
                question={store.question}
                mode="player"
                selectedOptionId={store.yourAnswer?.option_id}
                correctOptionId={store.correctOptionId}
                reveal={view === "result"}
                frozen={timeUp && view === "question"}
                onSelect={(opt) => submitAnswer(opt.id)}
              />

              {/* Hasil personal */}
              {view === "result" && you && (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-8 grid grid-cols-3 gap-3"
                >
                  <div
                    className={cn(
                      "rounded-2xl border bg-card p-4 text-center",
                      you.is_correct ? "border-success/40 bg-success-soft" : "border-border",
                    )}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Poin</p>
                    <AnimatedNumber
                      value={you.points_earned}
                      className={cn("mt-1 block font-display text-2xl font-black", you.is_correct && "text-success")}
                    />
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Peringkat</p>
                    <p className="mt-1 font-display text-2xl font-black tabular-nums">
                      #{you.rank}
                      <span className="text-sm font-bold text-muted-foreground"> / {store.totalPlayers}</span>
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Streak</p>
                    <p className="mt-1 font-display text-2xl font-black tabular-nums">
                      {you.streak}
                      {you.streak > 1 && <Flame className="ml-0.5 inline size-4 text-warning" />}
                    </p>
                  </div>
                </motion.div>
              )}

              {view === "result" && store.leaderboard.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="mt-8 rounded-2xl border border-border bg-card p-5"
                >
                  <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Top 10
                  </h3>
                  <div className="space-y-4">
                    <Top3Strip entries={store.leaderboard} highlightPlayerId={creds?.player_id} getAvatar={getAvatar} />
                    <LeaderboardList
                      entries={store.leaderboard}
                      highlightPlayerId={creds?.player_id}
                      getAvatar={getAvatar}
                      prevRanks={store.prevRanks}
                      prevScores={store.prevScores}
                    />
                  </div>
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
            <motion.section key="podium" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6">
              <div className="mb-14 text-center">
                <motion.h1
                  initial={{ scale: 0.75, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 14 }}
                  className="font-display text-4xl font-black tracking-tight text-gold sm:text-5xl"
                >
                  Hasil Akhir
                </motion.h1>
                {you && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Anda finis peringkat{" "}
                    <span className="font-display font-black text-primary">#{you.rank}</span> dengan{" "}
                    <span className="font-display font-black text-primary">
                      {you.score.toLocaleString("id-ID")}
                    </span>{" "}
                    poin
                  </p>
                )}
              </div>

              <PodiumView podium={store.podium ?? []} highlightPlayerId={creds?.player_id} getAvatar={getAvatar} />

              {store.finalLeaderboard && store.finalLeaderboard.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-16 rounded-2xl border border-border bg-card p-5"
                >
                  <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Klasemen Akhir
                  </h3>
                  <LeaderboardList
                    entries={store.finalLeaderboard}
                    highlightPlayerId={creds?.player_id}
                    getAvatar={getAvatar}
                    prevRanks={store.prevRanks}
                    prevScores={store.prevScores}
                  />
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
