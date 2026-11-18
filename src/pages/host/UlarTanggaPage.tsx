import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  Dice1,
  Info,
  Loader2,
  Play,
  RotateCcw,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiErrorMessage, getQuiz, listQuizzes } from "@/lib/api";
import type { QuizDetail, QuizQuestion, QuizListItem } from "@/types";
import {
  BOARD_SIZE,
  DICE_TRANSFORM,
  LADDERS,
  SNAKES,
  botCorrectRate,
  cellToCoords,
  computePoints,
  resolveSpecial,
  rollDice,
  type GamePlayer,
} from "@/lib/ular-tangga";
import { optionStyle } from "@/lib/option-colors";
import { HostShell } from "@/components/HostShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Konstanta tampilan                                                  */
/* ------------------------------------------------------------------ */

const PLAYER_STYLES = [
  { token: "bg-primary text-primary-foreground", ring: "ring-primary", dot: "bg-primary" },
  { token: "bg-accent text-accent-foreground", ring: "ring-accent", dot: "bg-accent" },
];

const PIP_LAYOUT: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

type Phase = "setup" | "playing" | "finished";
type Mode = "bot" | "duo";
type Difficulty = "mudah" | "sedang" | "sulit";
type AnswerResult = "correct" | "wrong" | null;

/* ------------------------------------------------------------------ */
/*  Komponen dadu 3D                                                    */
/* ------------------------------------------------------------------ */

function Dice({ value, rolling }: { value: number | null; rolling: boolean }) {
  return (
    <div className="dice-scene" aria-label={rolling ? "Dadu berputar" : `Dadu showing ${value ?? "-"}`}>
      <div
        className={cn("dice-cube", rolling && "is-rolling")}
        style={!rolling && value ? { transform: DICE_TRANSFORM[value] } : undefined}
      >
        {[1, 2, 3, 4, 5, 6].map((face) => (
          <div key={face} className="dice-face" data-face={face}>
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className={cn("dice-pip", PIP_LAYOUT[face].includes(i + 1) && "on")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Papan 10 × 10                                                      */
/* ------------------------------------------------------------------ */

function Board({
  players,
  moving,
}: {
  players: GamePlayer[];
  moving: boolean;
}) {
  const cells: { number: number; row: number; col: number }[] = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const fromBottom = 9 - row;
      const within = fromBottom % 2 === 0 ? col : 9 - col;
      cells.push({ number: fromBottom * 10 + within + 1, row, col });
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="grid grid-cols-10 gap-1">
        {cells.map((cell) => {
          const ladderTo = LADDERS[cell.number];
          const snakeTo = SNAKES[cell.number];
          const ladderEnd = Object.values(LADDERS).includes(cell.number);
          const snakeEnd = Object.values(SNAKES).includes(cell.number);
          const occupants = players.filter((p) => p.position === cell.number);

          return (
            <div
              key={cell.number}
              className={cn(
                "relative aspect-square min-h-6 rounded-md border border-border/60 bg-foreground/[0.02] sm:min-h-8",
                ladderTo !== undefined && "border-success/40 bg-success-soft/40",
                snakeTo !== undefined && "border-destructive/40 bg-coral-soft/40",
                cell.number === BOARD_SIZE && "border-warning/50 bg-warning-soft/50",
              )}
            >
              <span className="absolute left-1 top-0.5 text-[8px] font-semibold text-muted-foreground/50 sm:text-[9px]">
                {cell.number}
              </span>

              {ladderTo !== undefined && (
                <ArrowUp className="absolute inset-0 m-auto size-3 text-success sm:size-4" strokeWidth={3} />
              )}
              {snakeTo !== undefined && (
                <ArrowDown className="absolute inset-0 m-auto size-3 text-destructive sm:size-4" strokeWidth={3} />
              )}
              {ladderEnd && ladderTo === undefined && (
                <span className="absolute bottom-0.5 right-1 size-1.5 rounded-full bg-success/60" />
              )}
              {snakeEnd && snakeTo === undefined && (
                <span className="absolute bottom-0.5 right-1 size-1.5 rounded-full bg-destructive/60" />
              )}

              {occupants.length > 0 && (
                <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-0.5">
                  {occupants.map((p, i) => (
                    <motion.span
                      key={p.id}
                      layout
                      transition={moving ? { duration: 0.12 } : { type: "spring", stiffness: 500, damping: 30 }}
                      className={cn(
                        "grid size-4 place-items-center rounded-full text-[8px] font-bold shadow-sm ring-2 sm:size-5 sm:text-[9px]",
                        PLAYER_STYLES[i]?.token ?? PLAYER_STYLES[0].token,
                        PLAYER_STYLES[i]?.ring ?? PLAYER_STYLES[0].ring,
                      )}
                      title={p.name}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </motion.span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal pertanyaan                                                   */
/* ------------------------------------------------------------------ */

function QuestionModal({
  question,
  playerName,
  selected,
  result,
  onAnswer,
}: {
  question: QuizQuestion;
  playerName: string;
  selected: string | null;
  result: AnswerResult;
  onAnswer: (optionId: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-xs font-semibold text-primary">Giliran {playerName}</p>
            <p className="text-[11px] text-muted-foreground">Jawab dengan benar untuk Naik!</p>
          </div>
          <BadgeQuestion index={question.order_index} />
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          <h3 className="font-display text-lg font-bold leading-relaxed">{question.question_text}</h3>
          {question.image_url && (
            <img
              src={question.image_url}
              alt="Gambar soal"
              className="mt-4 max-h-56 w-full rounded-xl border border-border object-contain"
            />
          )}

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {question.options.map((opt) => {
              const style = optionStyle(opt.color_index);
              const isChosen = selected === opt.id;
              const isCorrect = opt.is_correct;
              return (
                <button
                  key={opt.id}
                  disabled={selected !== null}
                  onClick={() => onAnswer(opt.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-left font-semibold text-white transition-all",
                    style.base,
                    style.hover,
                    selected === null && "hover:brightness-95 hover:-translate-y-0.5",
                    isChosen && result === "correct" && "ring-4 ring-success ring-offset-2 ring-offset-card",
                    isChosen && result === "wrong" && "ring-4 ring-destructive ring-offset-2 ring-offset-card",
                    selected !== null && isCorrect && "ring-4 ring-success ring-offset-2 ring-offset-card",
                    selected !== null && !isChosen && !isCorrect && "opacity-50",
                  )}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/20">
                    {isChosen && result === "correct" ? <Check className="size-4" /> : style.icon && <style.icon className="size-4" />}
                  </span>
                  <span className="text-sm">{opt.option_text}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "mt-5 rounded-xl px-4 py-3 text-center text-sm font-bold",
                  result === "correct" ? "bg-success-soft text-success" : "bg-coral-soft text-destructive",
                )}
              >
                {result === "correct" ? "✓ Benar! Kamu bergerak maju." : "✗ Kurang tepat. Tetap di posisi semula."}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BadgeQuestion({ index }: { index: number }) {
  return (
    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-muted-foreground">
      Soal {index + 1}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Halaman utama                                                      */
/* ------------------------------------------------------------------ */

export default function UlarTanggaPage() {
  const { toast } = useToast();

  /* --- setup state --- */
  const [quizzes, setQuizzes] = React.useState<QuizListItem[]>([]);
  const [selectedQuizId, setSelectedQuizId] = React.useState("");
  const [quiz, setQuiz] = React.useState<QuizDetail | null>(null);
  const [quizLoading, setQuizLoading] = React.useState(false);
  const [listLoading, setListLoading] = React.useState(true);
  const [mode, setMode] = React.useState<Mode>("bot");
  const [difficulty, setDifficulty] = React.useState<Difficulty>("sedang");
  const [p1Name, setP1Name] = React.useState("Pemain 1");
  const [p2Name, setP2Name] = React.useState("Pemain 2");
  const [setupError, setSetupError] = React.useState<string | null>(null);

  /* --- game state --- */
  const [phase, setPhase] = React.useState<Phase>("setup");
  const [players, setPlayers] = React.useState<GamePlayer[]>([]);
  const [turn, setTurn] = React.useState(0);
  const [orderedQuestions, setOrderedQuestions] = React.useState<QuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [currentQuestion, setCurrentQuestion] = React.useState<QuizQuestion | null>(null);
  const [questionOpen, setQuestionOpen] = React.useState(false);
  const [selectedOption, setSelectedOption] = React.useState<string | null>(null);
  const [answerResult, setAnswerResult] = React.useState<AnswerResult>(null);
  const [dice, setDice] = React.useState<number | null>(null);
  const [rolling, setRolling] = React.useState(false);
  const [moving, setMoving] = React.useState(false);
  const [lastEvent, setLastEvent] = React.useState("Siap bermain! Putar dadu untuk memulai.");
  const [log, setLog] = React.useState<string[]>([]);
  const [winner, setWinner] = React.useState<GamePlayer | null>(null);

  /* --- refs --- */
  const timers = React.useRef<number[]>([]);
  const playersRef = React.useRef(players);
  const turnRef = React.useRef(turn);
  const diceRef = React.useRef<number>(1);
  const questionStart = React.useRef(0);
  playersRef.current = players;
  turnRef.current = turn;

  const later = React.useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  React.useEffect(() => {
    return () => timers.current.forEach((id) => window.clearTimeout(id));
  }, []);

  /* --- muat daftar kuis --- */
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await listQuizzes();
        if (alive) setQuizzes(list);
      } catch (e) {
        if (alive) setSetupError(apiErrorMessage(e));
      } finally {
        if (alive) setListLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* --- pilih kuis → ambil detail soal --- */
  async function handleSelectQuiz(id: string) {
    setSelectedQuizId(id);
    setQuiz(null);
    setSetupError(null);
    if (!id) return;
    setQuizLoading(true);
    try {
      const detail = await getQuiz(id);
      setQuiz(detail);
    } catch (e) {
      setSetupError(apiErrorMessage(e));
    } finally {
      setQuizLoading(false);
    }
  }

  /* --- mulai game --- */
  function handleStart() {
    if (!quiz) {
      toast("warning", "Pilih kuis dulu", "Game memakai soal dari kuis yang Anda pilih.");
      return;
    }
    if (quiz.questions.length === 0) {
      toast("warning", "Kuis kosong", "Tambahkan minimal satu soal ke kuis terlebih dahulu.");
      return;
    }

    const sorted = [...quiz.questions].sort((a, b) => a.order_index - b.order_index);
    setOrderedQuestions(sorted);
    setQuestionIndex(0);
    setPlayers([
      {
        id: "p1",
        name: p1Name.trim() || "Pemain 1",
        position: 0,
        isBot: false,
        score: 0,
        color: PLAYER_STYLES[0].token,
        ring: PLAYER_STYLES[0].ring,
      },
      {
        id: "p2",
        name: mode === "bot" ? "Bot PUSRI" : p2Name.trim() || "Pemain 2",
        position: 0,
        isBot: mode === "bot",
        score: 0,
        color: PLAYER_STYLES[1].token,
        ring: PLAYER_STYLES[1].ring,
      },
    ]);
    setTurn(0);
    setDice(null);
    setCurrentQuestion(null);
    setWinner(null);
    setLog([`Game dimulai — ${sorted.length} soal dari “${quiz.title}”.`]);
    setLastEvent("Putar dadu untuk memulai giliranmu!");
    setPhase("playing");
  }

  /* --- putar dadu --- */
  function handleRoll() {
    if (rolling || moving || questionOpen || phase !== "playing") return;
    const value = rollDice();
    diceRef.current = value;
    setRolling(true);
    setLastEvent("Dadu berputar…");
    later(() => {
      setDice(value);
      setRolling(false);
      setLastEvent(`${playersRef.current[turnRef.current].name} mendapat ${value}. Jawab soal berikut!`);
      openQuestion(value);
    }, 1150);
  }

  /* --- tampilkan soal --- */
  function openQuestion(diceValue: number) {
    if (orderedQuestions.length === 0) return;
    const q = orderedQuestions[questionIndex % orderedQuestions.length];
    setQuestionIndex((i) => i + 1);
    setCurrentQuestion(q);
    setSelectedOption(null);
    setAnswerResult(null);
    setQuestionOpen(true);
    questionStart.current = Date.now();

    const current = playersRef.current[turnRef.current];
    if (current.isBot) {
      later(() => botAnswer(q, diceValue), 1400);
    }
  }

  /* --- jawaban bot --- */
  function botAnswer(q: QuizQuestion, diceValue: number) {
    const correctOption = q.options.find((o) => o.is_correct);
    const wrongOptions = q.options.filter((o) => !o.is_correct);
    const isCorrect = Math.random() < botCorrectRate(difficulty);
    const chosen = isCorrect
      ? correctOption
      : wrongOptions[Math.floor(Math.random() * wrongOptions.length)] ?? correctOption;

    setSelectedOption(chosen?.id ?? null);
    setAnswerResult(isCorrect ? "correct" : "wrong");
    later(() => {
      setQuestionOpen(false);
      resolveTurn(diceValue, isCorrect, 1400);
    }, 1100);
  }

  /* --- jawaban pemain --- */
  function handleAnswer(optionId: string) {
    if (selectedOption) return;
    const q = currentQuestion;
    if (!q) return;
    const chosen = q.options.find((o) => o.id === optionId);
    const isCorrect = !!chosen?.is_correct;
    const elapsed = Date.now() - questionStart.current;

    setSelectedOption(optionId);
    setAnswerResult(isCorrect ? "correct" : "wrong");
    later(() => {
      setQuestionOpen(false);
      resolveTurn(diceRef.current, isCorrect, elapsed);
    }, 1100);
  }

  /* --- gerakkan karakter dan selesaikan giliran --- */
  function resolveTurn(diceValue: number, correct: boolean, elapsedMs: number) {
    const idx = turnRef.current;
    const player = playersRef.current[idx];
    const q = currentQuestion;

    if (correct && q) {
      const points = computePoints(q.time_limit_sec || 20, elapsedMs, q.points_multiplier || 1000);
      setPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, score: p.score + points } : p)));
      setLog((prev) => [`✓ ${player.name} benar (+${points} poin)`, ...prev].slice(0, 8));
    } else {
      setLog((prev) => [`✗ ${player.name} kurang tepat`, ...prev].slice(0, 8));
    }

    if (!correct) {
      setLastEvent(`${player.name} tetap di posisi ${player.position}.`);
      later(() => finishTurn(idx, player.position), 700);
      return;
    }

    const from = player.position;
    const to = Math.min(BOARD_SIZE, from + diceValue);
    setLastEvent(`${player.name} bergerak dari ${from} ke ${to}…`);

    // animasi langkah demi langkah
    let cursor = from;
    setMoving(true);
    const step = () => {
      if (cursor >= to) {
        setMoving(false);
        resolveSpecialTile(idx, from, to);
        return;
      }
      cursor += 1;
      setPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, position: cursor } : p)));
      later(step, 110);
    };
    later(step, 160);
  }

  /* --- cek tangga / ular --- */
  function resolveSpecialTile(idx: number, from: number, to: number) {
    const result = resolveSpecial(from, to);
    if (result.final !== to) {
      const isLadder = result.type === "ladder";
      setLastEvent(
        isLadder
          ? `🪜 Tangga! ${playersRef.current[idx].name} naik ke ${result.final}.`
          : `🐍 Ular! ${playersRef.current[idx].name} turun ke ${result.final}.`,
      );
      setLog((prev) => [
        `${isLadder ? "🪜 Tangga" : "🐍 Ular"} ${playersRef.current[idx].name}: ${to} → ${result.final}`,
        ...prev,
      ].slice(0, 8));
      later(() => {
        setPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, position: result.final } : p)));
        finishTurn(idx, result.final);
      }, 900);
    } else {
      finishTurn(idx, to);
    }
  }

  /* --- ganti giliran / selesai --- */
  function finishTurn(idx: number, finalPosition: number) {
    const player = playersRef.current[idx];
    if (finalPosition >= BOARD_SIZE) {
      setWinner(player);
      setLog((prev) => [`🏆 ${player.name} mencapai posisi 100 dan MENANG!`, ...prev].slice(0, 8));
      setLastEvent(`🏆 ${player.name} menang!`);
      setPhase("finished");
      return;
    }
    setTurn((idx + 1) % playersRef.current.length);
    setLastEvent(`Giliran ${playersRef.current[(idx + 1) % playersRef.current.length].name}. Putar dadu!`);
  }

  /* --- ulang game --- */
  function handleRestart() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setPhase("setup");
    setPlayers([]);
    setWinner(null);
    setDice(null);
    setCurrentQuestion(null);
    setLastEvent("Siap bermain! Putar dadu untuk memulai.");
  }

  const currentPlayer = players[turn];

  /* ================================================================== */
  /*  RENDER                                                             */
  /* ================================================================== */

  return (
    <HostShell>
      <motion.div
        key={phase}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-5"
      >
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Permainan Edukasi · PUSRI Edition</p>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Ular Tangga</h1>
          </div>
          {phase === "playing" && (
            <Button variant="outline" size="sm" onClick={handleRestart}>
              <RotateCcw /> Ulangi
            </Button>
          )}
        </div>

        {/* ------------------------------ SETUP ------------------------------ */}
        {phase === "setup" && (
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-bold">Siapkan Permainan</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Soal diambil dari kuis yang sudah Anda buat di Library QuizLive.
              </p>

              <div className="mt-5 space-y-5">
                <div className="space-y-2">
                  <Label>Pilih Kuis Sumber Soal *</Label>
                  <div className="relative">
                    <select
                      value={selectedQuizId}
                      onChange={(e) => handleSelectQuiz(e.target.value)}
                      className="h-11 w-full appearance-none rounded-xl border border-input bg-background px-4 pr-10 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">-- Pilih kuis --</option>
                      {quizzes.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.title} ({q.question_count} soal)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3.5 size-4 text-muted-foreground" />
                  </div>
                  {listLoading && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" /> Memuat daftar kuis…
                    </p>
                  )}
                  {quizLoading && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" /> Memuat soal kuis…
                    </p>
                  )}
                  {setupError && <p className="text-xs text-destructive">{setupError}</p>}
                  {quiz && !quizLoading && (
                    <p className="rounded-lg bg-success-soft px-3 py-2 text-xs font-semibold text-success">
                      ✓ {quiz.questions.length} soal siap dipakai dari “{quiz.title}”
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Mode Permainan</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setMode("bot")}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                        mode === "bot" ? "border-primary bg-primary-soft" : "border-border hover:bg-secondary",
                      )}
                    >
                      <Bot className={cn("size-5", mode === "bot" ? "text-primary" : "text-muted-foreground")} />
                      <div>
                        <p className="text-sm font-bold">Lawan Bot</p>
                        <p className="text-[11px] text-muted-foreground">1 pemain vs AI</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setMode("duo")}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                        mode === "duo" ? "border-primary bg-primary-soft" : "border-border hover:bg-secondary",
                      )}
                    >
                      <Users className={cn("size-5", mode === "duo" ? "text-primary" : "text-muted-foreground")} />
                      <div>
                        <p className="text-sm font-bold">2 Pemain</p>
                        <p className="text-[11px] text-muted-foreground">Bergantian (hot-seat)</p>
                      </div>
                    </button>
                  </div>
                </div>

                {mode === "bot" && (
                  <div className="space-y-2">
                    <Label>Tingkat Kesulitan Bot</Label>
                    <div className="flex gap-2">
                      {(["mudah", "sedang", "sulit"] as Difficulty[]).map((d) => (
                        <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          className={cn(
                            "flex-1 rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors",
                            difficulty === d
                              ? "border-primary bg-primary-soft text-primary"
                              : "border-border text-muted-foreground hover:bg-secondary",
                          )}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nama Pemain 1</Label>
                    <Input value={p1Name} onChange={(e) => setP1Name(e.target.value)} maxLength={20} />
                  </div>
                  {mode === "duo" && (
                    <div className="space-y-2">
                      <Label>Nama Pemain 2</Label>
                      <Input value={p2Name} onChange={(e) => setP2Name(e.target.value)} maxLength={20} />
                    </div>
                  )}
                </div>

                <Button size="lg" className="w-full" onClick={handleStart} disabled={!quiz}>
                  <Play /> Mulai Game
                </Button>
              </div>
            </section>

            <aside className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="flex items-center gap-2 font-display text-base font-bold">
                  <Info className="size-4 text-primary" /> Cara Main
                </h3>
                <ol className="mt-4 space-y-3 text-xs text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">1</span>
                    Putar dadu, lalu jawab soal yang muncul.
                  </li>
                  <li className="flex gap-2">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">2</span>
                    Jawaban benar → bergerak maju sejumlah dadu. Salah → tetap di posisi.
                  </li>
                  <li className="flex gap-2">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">3</span>
                    Injak tangga naik, terkena ular turun.
                  </li>
                  <li className="flex gap-2">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">4</span>
                    Pemain pertama yang mencapai kotak 100 menang!
                  </li>
                </ol>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-display text-sm font-bold">Legenda Papan</h3>
                <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                  <p className="flex items-center gap-2"><ArrowUp className="size-4 text-success" /> Tangga — naik ke kotak atas</p>
                  <p className="flex items-center gap-2"><ArrowDown className="size-4 text-destructive" /> Ular — turun ke kotak bawah</p>
                  <p className="flex items-center gap-2"><Trophy className="size-4 text-warning" /> Kotak 100 — garis finish</p>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* ----------------------------- PLAYING ----------------------------- */}
        {phase === "playing" && currentPlayer && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span
                    className={cn(
                      "size-3 rounded-full ring-2",
                      PLAYER_STYLES[turn]?.dot,
                      PLAYER_STYLES[turn]?.ring,
                    )}
                  />
                  Giliran <span className="text-primary">{currentPlayer.name}</span>
                  {currentPlayer.isBot && <Bot className="size-4 text-accent" />}
                </p>
                <div className="flex gap-3 text-xs font-semibold text-muted-foreground">
                  {players.map((p, i) => (
                    <span key={p.id} className="flex items-center gap-1">
                      <span className={cn("size-2 rounded-full", PLAYER_STYLES[i]?.dot)} />
                      {p.name}: {p.position} · {p.score} pts
                    </span>
                  ))}
                </div>
              </div>

              <Board players={players} moving={moving} />
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-6 text-center">
                <p className="text-xs font-semibold text-muted-foreground">Dadu</p>
                <div className="my-5 flex justify-center">
                  <Dice value={dice} rolling={rolling} />
                </div>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleRoll}
                  disabled={rolling || moving || questionOpen}
                >
                  {rolling ? <Loader2 className="animate-spin" /> : <Dice1 />}
                  {rolling ? "Berputar…" : "Putar Dadu"}
                </Button>
                <motion.p
                  key={lastEvent}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground"
                >
                  {lastEvent}
                </motion.p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-display text-sm font-bold">Log Permainan</h3>
                <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
                  {log.map((entry, i) => (
                    <p key={i} className="rounded-lg bg-foreground/[0.03] px-3 py-2 text-[11px] text-muted-foreground">
                      {entry}
                    </p>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* ---------------------------- FINISHED ----------------------------- */}
        {phase === "finished" && winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-10 text-center shadow-lg"
          >
            <motion.div
              initial={{ y: -20, rotate: -10 }}
              animate={{ y: 0, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="mx-auto grid size-20 place-items-center rounded-2xl bg-warning-soft"
            >
              <Trophy className="size-10 text-warning" />
            </motion.div>
            <h2 className="mt-5 font-display text-3xl font-bold">Selamat, {winner.name}!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Berhasil mencapai kotak 100 dengan {winner.score} poin.
            </p>

            <div className="mt-7 space-y-2 rounded-xl border border-border bg-foreground/[0.02] p-4 text-left">
              {[...players]
                .sort((a, b) => b.score - a.score || b.position - a.position)
                .map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm">
                    <span className="grid size-7 place-items-center rounded-full bg-secondary font-bold text-xs">
                      {i + 1}
                    </span>
                    <span className={cn("size-3 rounded-full", PLAYER_STYLES[players.indexOf(p)]?.dot)} />
                    <span className="flex-1 font-semibold">{p.name}</span>
                    <span className="text-xs text-muted-foreground">posisi {p.position}</span>
                    <span className="font-bold text-primary">{p.score} pts</span>
                  </div>
                ))}
            </div>

            <div className="mt-7 flex justify-center gap-3">
              <Button variant="outline" onClick={() => setPhase("setup")}>
                <ArrowLeft /> Ganti Kuis
              </Button>
              <Button onClick={handleRestart}>
                <RotateCcw /> Main Lagi
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Modal soal */}
      <AnimatePresence>
        {questionOpen && currentQuestion && (
          <QuestionModal
            question={currentQuestion}
            playerName={players[turnRef.current]?.name ?? "Pemain"}
            selected={selectedOption}
            result={answerResult}
            onAnswer={handleAnswer}
          />
        )}
      </AnimatePresence>
    </HostShell>
  );
}
