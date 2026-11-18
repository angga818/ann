import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bot,
  Check,
  Clock,
  Dices,
  Info,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { apiErrorMessage, getQuiz, listQuizzes } from "@/lib/api";
import { optionStyle } from "@/lib/option-colors";
import {
  BOARD_SIZE,
  CHARACTERS,
  DICE_PIPS,
  DICE_TRANSFORM,
  DIFFICULTY_LABELS,
  MAP_THEMES,
  TOKEN_AREAS,
  characterAsset,
  computePoints,
  mapTheme,
  pickQuestion,
  resolveSpecialCell,
  rollDice,
  tokenRect,
  type TokenAreaKey,
} from "@/lib/snakes";
import { DEFAULT_SNAKES_CONFIG } from "@/lib/snakes";
import { getQuizGameMode, getSnakesConfig } from "@/lib/snakes-meta";
import { pushActivity } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { HostShell } from "@/components/HostShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast";
import type {
  CharacterId,
  DifficultyLevel,
  MapThemeId,
  QuizDetail,
  QuizListItem,
  QuizQuestion,
  SnakesGameConfig,
} from "@/types";

/* ------------------------------------------------------------------ */
/*  Tipe & konstanta tampilan                                           */
/* ------------------------------------------------------------------ */

type Phase = "lobby" | "playing" | "result";
type AnswerResult = "correct" | "wrong" | "timeout" | null;

interface GamePlayer {
  id: string;
  name: string;
  character: CharacterId;
  isBot: boolean;
  position: number;
  score: number;
  correct: number;
}

interface SpecialEvent {
  type: "snake" | "ladder";
  from: number;
  to: number;
}

const TOKEN_TINT = [
  "bg-primary text-primary-foreground",
  "bg-accent text-accent-foreground",
  "bg-warning text-warning-foreground",
  "bg-success text-success-foreground",
  "bg-coral text-foreground",
  "bg-destructive text-destructive-foreground",
];

/* ------------------------------------------------------------------ */
/*  Dadu 3D                                                             */
/* ------------------------------------------------------------------ */

function Dice({ value, rolling }: { value: DifficultyLevel | null; rolling: boolean }) {
  return (
    <div
      className="dice-scene"
      aria-label={rolling ? "Dadu berputar" : `Dadu showing ${value ?? "-"}`}
    >
      <div
        className={cn("dice-cube", rolling && "is-rolling")}
        style={!rolling && value ? { transform: DICE_TRANSFORM[value] } : undefined}
      >
        {[1, 2, 3, 4, 5, 6].map((face) => (
          <div key={face} className="dice-face" data-face={face}>
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className={cn("dice-pip", DICE_PIPS[face].includes(i + 1) && "on")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Papan 100 kotak dengan tema peta sebagai latar                      */
/* ------------------------------------------------------------------ */

function Board({
  players,
  themeId,
  special,
  tokenArea,
}: {
  players: GamePlayer[];
  themeId: MapThemeId;
  special: SpecialEvent | null;
  tokenArea: TokenAreaKey;
}) {
  const theme = mapTheme(themeId);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border-2 border-border bg-card shadow-sm"
      style={{ aspectRatio: "2400 / 1792" }}
    >
      {/* Gambar map 1–5 adalah papan permainan itu sendiri — tanpa grid buatan. */}
      <img src={theme.asset} alt={`Papan ${theme.name}`} className="absolute inset-0 size-full object-fill" draggable={false} />

      {/* Hanya token karakter yang digambar di atas papan */}
      <div className="pointer-events-none absolute inset-0">
        {players.map((p, i) => {
          const jitter = (i % 3) - 1;
          const rect = tokenRect(p.position, tokenArea);
          return (
            <motion.div
              key={p.id}
              className="absolute grid place-items-center"
              style={rect}
              animate={{ left: rect.left, top: rect.top }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
            >
              <motion.div
                animate={{ x: jitter * 4, y: jitter * 3 }}
                className="relative flex size-full items-end justify-center"
              >
                <img
                  src={characterAsset(p.character)}
                  alt={p.name}
                  title={p.name}
                  className="max-h-full w-full object-contain object-bottom drop-shadow-[0_3px_4px_rgba(0,0,0,0.65)]"
                  draggable={false}
                />
                <span
                  className={cn(
                    "absolute -top-1 right-0 grid size-5 shrink-0 place-items-center rounded-full text-[9px] font-bold shadow-md ring-2 ring-white/80",
                    TOKEN_TINT[i % TOKEN_TINT.length],
                  )}
                >
                  {i + 1}
                </span>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Umpan balik visual ular / tangga */}
      <AnimatePresence>
        {special && (
          <motion.div
            key={`${special.type}-${special.from}-${special.to}`}
            initial={{ opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={cn(
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 px-5 py-3 text-center shadow-xl",
              special.type === "ladder"
                ? "border-success bg-success-soft text-success"
                : "border-destructive bg-coral-soft text-destructive",
            )}
          >
            <p className="font-display text-lg font-bold">
              {special.type === "ladder" ? "🪜 TANGGA!" : "🐍 Ular!"}
            </p>
            <p className="text-sm font-bold tabular-nums">
              {special.from} → {special.to}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal pertanyaan                                                    */
/* ------------------------------------------------------------------ */

function QuestionOverlay({
  question,
  player,
  difficulty,
  timeLimit,
  remainingMs,
  selected,
  result,
  onAnswer,
}: {
  question: QuizQuestion;
  player: GamePlayer;
  difficulty: DifficultyLevel;
  timeLimit: number;
  remainingMs: number;
  selected: string | null;
  result: AnswerResult;
  onAnswer: (optionId: string) => void;
}) {
  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/55 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src={characterAsset(player.character)}
              alt={`${player.name} — karakter ${player.character}`}
              className="h-14 w-10 shrink-0 object-contain object-bottom"
              draggable={false}
            />
            <div>
              <p className="text-xs font-bold text-primary">Giliran {player.name}</p>
              <p className="text-[11px] text-muted-foreground">
                Jawab benar untuk bergerak sejumlah hasil dadu.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Level {difficulty}</Badge>
            <Badge variant="outline">{DIFFICULTY_LABELS[difficulty]}</Badge>
            <Badge variant="outline" className="tabular-nums">
              <Clock className="size-3" /> {seconds}s
            </Badge>
          </div>
        </div>

        {/* countdown bar */}
        <div className="h-1.5 w-full bg-secondary">
          <div
            key={`${question.id}-${difficulty}`}
            className="snakes-timer-bar h-full bg-primary"
            style={{ animationDuration: `${timeLimit}s` }}
          />
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          <h3 className="font-display text-lg font-bold leading-relaxed">{question.question_text}</h3>
          {question.image_url && (
            <img
              src={question.image_url}
              alt="Gambar soal"
              className="mt-4 max-h-48 w-full rounded-xl border border-border object-contain"
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
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-white transition-all",
                    style.base,
                    style.hover,
                    selected === null && "hover:-translate-y-0.5",
                    isChosen && result === "correct" && "ring-4 ring-success ring-offset-2 ring-offset-card",
                    isChosen && result === "wrong" && "ring-4 ring-destructive ring-offset-2 ring-offset-card",
                    selected !== null && isCorrect && "ring-4 ring-success ring-offset-2 ring-offset-card",
                    selected !== null && !isChosen && !isCorrect && "opacity-50",
                  )}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/20">
                    {isChosen && result === "correct" ? (
                      <Check className="size-4" strokeWidth={3} />
                    ) : (
                      <style.icon className="size-4" />
                    )}
                  </span>
                  <span>{opt.option_text}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {result && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "mt-5 rounded-xl px-4 py-3 text-center text-sm font-bold",
                  result === "correct" ? "bg-success-soft text-success" : "bg-coral-soft text-destructive",
                )}
              >
                {result === "correct"
                  ? "✓ Benar! Karakter bergerak maju."
                  : result === "timeout"
                    ? "⏱ Waktu habis — posisi tetap."
                    : "✗ Kurang tepat — posisi tetap."}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Halaman                                                             */
/* ------------------------------------------------------------------ */

export default function SnakesGamePage() {
  const { quizId } = useParams<{ quizId?: string }>();
  const { toast } = useToast();

  const [quiz, setQuiz] = React.useState<QuizDetail | null>(null);
  const [quizzes, setQuizzes] = React.useState<QuizListItem[]>([]);
  const [config, setConfig] = React.useState<SnakesGameConfig>({ ...DEFAULT_SNAKES_CONFIG });
  const [dataLoading, setDataLoading] = React.useState(true);

  const [phase, setPhase] = React.useState<Phase>("lobby");
  const [players, setPlayers] = React.useState<GamePlayer[]>([]);
  const [turn, setTurn] = React.useState(0);
  const [newName, setNewName] = React.useState("");
  const [newCharacter, setNewCharacter] = React.useState<CharacterId>(1);

  const [dice, setDice] = React.useState<DifficultyLevel | null>(null);
  const [rolling, setRolling] = React.useState(false);
  const [moving, setMoving] = React.useState(false);
  const [questionOpen, setQuestionOpen] = React.useState(false);
  const [currentQuestion, setCurrentQuestion] = React.useState<QuizQuestion | null>(null);
  const [difficulty, setDifficulty] = React.useState<DifficultyLevel>(1);
  const [selectedOption, setSelectedOption] = React.useState<string | null>(null);
  const [answerResult, setAnswerResult] = React.useState<AnswerResult>(null);
  const [remainingMs, setRemainingMs] = React.useState(0);
  const [notice, setNotice] = React.useState("Siap bermain! Tambah pemain lalu mulai permainan.");
  const [log, setLog] = React.useState<string[]>([]);
  const [winner, setWinner] = React.useState<GamePlayer | null>(null);
  const [special, setSpecial] = React.useState<SpecialEvent | null>(null);
  const [rounds, setRounds] = React.useState(0);
  const [tokenArea, setTokenArea] = React.useState<TokenAreaKey>("penuh");

  /* --- refs untuk callback async --- */
  const timers = React.useRef<number[]>([]);
  const answerTimeout = React.useRef<number | null>(null);
  const answered = React.useRef(false);
  const deadline = React.useRef(0);
  const questionStart = React.useRef(0);
  const usedQuestions = React.useRef<Set<string>>(new Set());
  const snap = React.useRef({ players, turn, phase, questionOpen, currentQuestion, config, rolling, moving });
  snap.current = { players, turn, phase, questionOpen, currentQuestion, config, rolling, moving };

  const later = React.useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  const clearTimers = React.useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    if (answerTimeout.current !== null) {
      window.clearTimeout(answerTimeout.current);
      answerTimeout.current = null;
    }
  }, []);

  React.useEffect(() => () => clearTimers(), [clearTimers]);

  /* --- muat kuis & konfigurasi --- */
  React.useEffect(() => {
    let alive = true;
    setDataLoading(true);
    (async () => {
      try {
        if (quizId) {
          const [detail, list] = await Promise.all([getQuiz(quizId), listQuizzes()]);
          if (!alive) return;
          setQuiz(detail);
          setQuizzes(list);
          setConfig(getSnakesConfig(quizId));
        } else {
          const list = await listQuizzes();
          if (!alive) return;
          setQuizzes(list);
          setConfig({ ...DEFAULT_SNAKES_CONFIG });
        }
      } catch (e) {
        if (alive) toast("error", "Gagal memuat kuis", apiErrorMessage(e));
      } finally {
        if (alive) setDataLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [quizId, toast]);

  /** Soal diurutkan dan order_index dinormalisasi (0..n-1). */
  const questions = React.useMemo<QuizQuestion[]>(() => {
    if (!quiz) return [];
    return [...quiz.questions]
      .sort((a, b) => a.order_index - b.order_index)
      .map((q, i) => ({ ...q, order_index: i }));
  }, [quiz]);

  // Inisialisasi pemain-host sekali setelah kuis termuat.
  React.useEffect(() => {
    if (!quiz || players.length > 0) return;
    setPlayers([
      {
        id: "host",
        name: "Host",
        character: config.character_id ?? 1,
        isBot: false,
        position: 0,
        score: 0,
        correct: 0,
      },
    ]);
  }, [quiz, config.character_id, players.length]);

  /* --- timer tampilan countdown --- */
  React.useEffect(() => {
    if (!questionOpen) return;
    const id = window.setInterval(() => setRemainingMs(Math.max(0, deadline.current - Date.now())), 100);
    return () => window.clearInterval(id);
  }, [questionOpen]);

  /* --- batas durasi permainan (PRD §3.9, opsional) --- */
  React.useEffect(() => {
    if (phase !== "playing" || !config.game_duration_minutes) return;
    const id = window.setTimeout(() => {
      const ranked = [...snap.current.players].sort((a, b) => b.position - a.position || b.score - a.score);
      if (ranked[0]) {
        setWinner(ranked[0]);
        setNotice(`Waktu habis — ${ranked[0].name} menang berdasarkan posisi tertinggi.`);
      }
      setPhase("result");
    }, config.game_duration_minutes * 60 * 1000);
    return () => window.clearTimeout(id);
  }, [phase, config.game_duration_minutes]);

  /* ------------------------- aksi lobby ------------------------- */

  function addPlayer(isBot: boolean) {
    if (players.length >= config.max_players) {
      toast("warning", "Pemain penuh", `Batas maksimum ${config.max_players} pemain.`);
      return;
    }
    const id = `p${Date.now()}`;
    const player: GamePlayer = {
      id,
      name: isBot ? `Bot PUSRI ${players.length}` : newName.trim() || `Pemain ${players.length + 1}`,
      character: isBot
        ? CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)].id
        : newCharacter,
      isBot,
      position: 0,
      score: 0,
      correct: 0,
    };
    setPlayers((prev) => [...prev, player]);
    setNewName("");
  }

  function removePlayer(id: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  function handleStart() {
    if (!quiz || questions.length === 0) {
      toast("warning", "Belum ada soal", "Tambahkan minimal satu soal pada kuis ini terlebih dahulu.");
      return;
    }
    if (players.length < 1) {
      toast("warning", "Belum ada pemain", "Tambahkan minimal satu pemain.");
      return;
    }
    clearTimers();
    usedQuestions.current = new Set();
    setPlayers((prev) => prev.map((p) => ({ ...p, position: 0, score: 0, correct: 0 })));
    setTurn(0);
    setDice(null);
    setWinner(null);
    setRounds(0);
    setSpecial(null);
    setLog([`Game dimulai — ${questions.length} soal dari “${quiz.title}”.`]);
    setNotice(`Giliran ${players[0]?.name ?? "Host"}. Putar dadu!`);
    setPhase("playing");
  }

  /* ------------------------- aksi gameplay ------------------------- */

  function openQuestion(q: QuizQuestion, value: DifficultyLevel, timeLimit: number) {
    answered.current = false;
    setCurrentQuestion(q);
    setSelectedOption(null);
    setAnswerResult(null);
    setQuestionOpen(true);
    questionStart.current = Date.now();
    deadline.current = Date.now() + timeLimit * 1000;
    setRemainingMs(timeLimit * 1000);
    setNotice(`Level ${value} · ${DIFFICULTY_LABELS[value]} — jawab dalam ${timeLimit} detik!`);

    answerTimeout.current = window.setTimeout(() => submitAnswer(null, value), timeLimit * 1000);

    const active = snap.current.players[snap.current.turn];
    if (active?.isBot) {
      const rate = 0.5 + value * 0.055;
      later(() => {
        const correct = Math.random() < rate;
        const right = q.options.find((o) => o.is_correct);
        const wrong = q.options.filter((o) => !o.is_correct);
        const chosen = correct ? right : wrong[Math.floor(Math.random() * wrong.length)] ?? right;
        submitAnswer(chosen?.id ?? null, value);
      }, 700 + Math.random() * 700);
    }
  }

  function handleRoll() {
    const s = snap.current;
    if (s.phase !== "playing" || s.rolling || s.moving || s.questionOpen) return;

    const value = rollDice();
    setRolling(true);
    setNotice(`Dadu berputar untuk ${s.players[s.turn]?.name ?? "pemain"}…`);
    later(() => {
      setRolling(false);
      setDice(value);
      setDifficulty(value);
      const q = pickQuestion(
        questions,
        value,
        usedQuestions.current,
        s.config.question_mode === "RANDOM",
      );
      if (!q) {
        setNotice("Belum ada soal yang tersedia untuk level ini.");
        return;
      }
      openQuestion(q, value, s.config.answer_time_limit);
    }, 1050);
  }

  function submitAnswer(optionId: string | null, value: DifficultyLevel) {
    if (answered.current) return;
    answered.current = true;
    if (answerTimeout.current !== null) {
      window.clearTimeout(answerTimeout.current);
      answerTimeout.current = null;
    }

    const s = snap.current;
    const q = s.currentQuestion;
    if (!q) return;
    const chosen = optionId ? q.options.find((o) => o.id === optionId) : undefined;
    const correct = chosen?.is_correct === true;
    const elapsed = Date.now() - questionStart.current;

    if (correct) {
      const pts = computePoints(elapsed, q.time_limit_sec || s.config.answer_time_limit, value);
      const idx = s.turn;
      setPlayers((prev) =>
        prev.map((p, i) => (i === idx ? { ...p, score: p.score + pts, correct: p.correct + 1 } : p)),
      );
      setLog((prev) =>
        [`✓ ${s.players[idx]?.name ?? "Pemain"} benar (+${pts} poin, level ${value})`, ...prev].slice(0, 8),
      );
    } else {
      setLog((prev) =>
        [
          optionId
            ? `✗ ${s.players[s.turn]?.name ?? "Pemain"} kurang tepat`
            : `⏱ ${s.players[s.turn]?.name ?? "Pemain"} kehabisan waktu`,
          ...prev,
        ].slice(0, 8),
      );
    }

    setSelectedOption(optionId);
    setAnswerResult(correct ? "correct" : optionId ? "wrong" : "timeout");
    later(() => {
      setQuestionOpen(false);
      resolveTurn(value, correct);
    }, 1250);
  }

  function resolveTurn(value: DifficultyLevel, correct: boolean) {
    const idx = snap.current.turn;
    const player = snap.current.players[idx];
    if (!player) return;
    setRounds((r) => r + 1);

    if (!correct) {
      setNotice(`${player.name} tetap di kotak ${player.position}.`);
      later(() => endTurn(idx, player.position), 650);
      return;
    }

    const target = player.position + value;
    // PRD §3.6 — bila hasil dadu melewati kotak 100, pemain tetap di posisi semula.
    if (target > BOARD_SIZE) {
      setNotice(`${player.name} akan melewati kotak 100 — tetap di kotak ${player.position}.`);
      later(() => endTurn(idx, player.position), 950);
      return;
    }

    setMoving(true);
    setNotice(`${player.name} bergerak ${value} langkah…`);
    let cursor = player.position;
    const step = () => {
      if (cursor >= target) {
        setMoving(false);
        applySpecial(idx, target);
        return;
      }
      cursor += 1;
      const at = cursor;
      setPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, position: at } : p)));
      later(step, 130);
    };
    later(step, 170);
  }

  function applySpecial(idx: number, target: number) {
    const result = resolveSpecialCell(target);
    const name = snap.current.players[idx]?.name ?? "Pemain";
    if (result.type === "none") {
      endTurn(idx, target);
      return;
    }

    setSpecial({ type: result.type, from: target, to: result.final });
    setNotice(
      result.type === "ladder"
        ? `🪜 Tangga! ${name} naik ke kotak ${result.final}.`
        : `🐍 Ular! ${name} turun ke kotak ${result.final}.`,
    );
    setLog((prev) =>
      [
        `${result.type === "ladder" ? "🪜 Tangga" : "🐍 Ular"} ${name}: ${target} → ${result.final}`,
        ...prev,
      ].slice(0, 8),
    );
    later(() => {
      setPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, position: result.final } : p)));
      setSpecial(null);
      endTurn(idx, result.final);
    }, 1200);
  }

  function endTurn(idx: number, finalPosition: number) {
    const s = snap.current;
    const player = s.players[idx];
    if (!player) return;

    if (finalPosition >= BOARD_SIZE) {
      setWinner(player);
      setPhase("result");
      setNotice(`🏆 ${player.name} mencapai kotak 100 dan MENANG!`);
      setLog((prev) => [`🏆 ${player.name} mencapai kotak 100 dan MENANG!`, ...prev].slice(0, 8));
      pushActivity({
        type: "game-ended",
        label: `Ular Tangga: ${player.name} menang`,
        detail: `${quiz?.title ?? "Kuis"} · ${rounds + 1} giliran`,
      });
      return;
    }

    const next = (idx + 1) % s.players.length;
    setTurn(next);
    setNotice(`Giliran ${s.players[next]?.name ?? "pemain"}. Putar dadu!`);
  }

  function resetBoard(toLobby: boolean) {
    clearTimers();
    answered.current = false;
    usedQuestions.current = new Set();
    setPlayers((prev) => prev.map((p) => ({ ...p, position: 0, score: 0, correct: 0 })));
    setTurn(0);
    setDice(null);
    setWinner(null);
    setSpecial(null);
    setQuestionOpen(false);
    setCurrentQuestion(null);
    setRounds(0);
    setLog([]);
    setNotice(toLobby ? "Siap bermain! Tambah pemain lalu mulai permainan." : "Game diulang. Putar dadu!");
    setPhase(toLobby ? "lobby" : "playing");
  }

  /* ================================================================== */
  /*  Render                                                             */
  /* ================================================================== */

  const currentPlayer = players[turn];
  const theme = mapTheme(config.map_id);
  const ranked = [...players].sort((a, b) => b.position - a.position || b.score - a.score);

  return (
    <HostShell>
      {/* --------------- Tanpa quizId: pilih kuis Ular Tangga --------------- */}
      {!quizId && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">QuizLive · Mode Permainan</p>
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Ular Tangga</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Pilih kuis ber-mode Ular Tangga untuk membuka papan permainan.
              </p>
            </div>
            <Button asChild>
              <Link to="/host/quiz/new">
                <Plus /> Buat Kuis Ular Tangga
              </Link>
            </Button>
          </div>

          {dataLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="size-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quizzes.map((q) => {
                const isSnakes = getQuizGameMode(q.id) === "SNAKES_AND_LADDERS";
                return (
                  <div
                    key={q.id}
                    className={cn(
                      "flex flex-col rounded-2xl border bg-card p-5",
                      isSnakes ? "border-accent/40" : "border-border",
                    )}
                  >
                    <Badge className="w-fit" variant={isSnakes ? "default" : "secondary"}>
                      {isSnakes ? <Dices className="size-3" /> : <Sparkles className="size-3" />}
                      {isSnakes ? "Ular Tangga" : "QuizLive"}
                    </Badge>
                    <h2 className="mt-3 line-clamp-2 font-display font-bold">{q.title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{q.question_count} soal</p>
                    <div className="mt-auto pt-5">
                      {isSnakes ? (
                        <Button asChild size="sm" className="w-full">
                          <Link to={`/host/snakes/${q.id}`}>
                            <Play /> Mainkan
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="outline" className="w-full">
                          <Link to={`/host/quiz/${q.id}`}>
                            <Info /> Ubah ke mode Ular Tangga
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {quizzes.length === 0 && (
                <div className="col-span-full rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                  Belum ada kuis. Klik “Buat Kuis Ular Tangga” untuk membuat satu.
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ------------------------- Permainan ------------------------- */}
      {quizId && (
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-5"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Mode Ular Tangga · {theme.name}</p>
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{quiz?.title ?? "Memuat…"}</h1>
            </div>
            {phase !== "lobby" && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => resetBoard(true)}>
                  <ArrowLeft /> Lobby
                </Button>
                <Button variant="outline" size="sm" onClick={() => resetBoard(false)}>
                  <RotateCcw /> Ulangi
                </Button>
              </div>
            )}
          </div>

          {dataLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="size-8 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* ---------------------------- LOBBY ---------------------------- */}
              {phase === "lobby" && (
                <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
                  <section className="space-y-5">
                    <div className="rounded-2xl border border-border bg-card p-6">
                      <h2 className="font-display text-lg font-bold">Pemain</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Maksimal {config.max_players} pemain. Tambah pemain lokal atau lawan bot.
                      </p>

                      <div className="mt-4 space-y-2">
                        {players.map((p, i) => (
                          <motion.div
                            key={p.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 rounded-xl border border-border bg-foreground/[0.02] px-3 py-2"
                          >
                            <span
                              className={cn(
                                "grid size-7 place-items-center rounded-lg text-xs font-bold",
                                TOKEN_TINT[i % TOKEN_TINT.length],
                              )}
                            >
                              {i + 1}
                            </span>
                            <img
                              src={characterAsset(p.character)}
                              alt={`${p.name} — karakter ${p.character}`}
                              className="h-16 w-12 shrink-0 object-contain object-bottom"
                              draggable={false}
                            />
                            <span className="flex-1 text-sm font-semibold">{p.name}</span>
                            {p.isBot && <Badge variant="outline"><Bot className="size-3" /> Bot</Badge>}
                            {i === 0 && <Badge variant="secondary">Host</Badge>}
                            {i !== 0 && (
                              <button
                                onClick={() => removePlayer(p.id)}
                                className="text-muted-foreground transition-colors hover:text-destructive"
                                aria-label={`Hapus ${p.name}`}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
                          </motion.div>
                        ))}
                      </div>

                      <div className="mt-5 space-y-3 border-t border-border pt-5">
                        <div className="space-y-2">
                          <Label>Nama pemain baru</Label>
                          <Input
                            value={newName}
                            maxLength={20}
                            placeholder="Nama pemain…"
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addPlayer(false)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Pilih Karakter (seluruh badan)</Label>
                          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                            {CHARACTERS.map((c) => {
                              const active = newCharacter === c.id;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  title={`Pilih ${c.name}`}
                                  onClick={() => setNewCharacter(c.id)}
                                  className={cn(
                                    "flex flex-col items-center gap-1 rounded-xl border-2 bg-foreground/[0.02] px-1 pb-1.5 pt-1 transition-all",
                                    active
                                      ? "border-primary bg-primary-soft shadow-sm"
                                      : "border-border hover:-translate-y-0.5 hover:border-foreground/30",
                                  )}
                                >
                                  <img
                                    src={c.asset}
                                    alt={c.name}
                                    className="h-16 w-full object-contain object-bottom sm:h-20"
                                    draggable={false}
                                  />
                                  <span className="text-[10px] font-bold">{c.name}</span>
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-[11px] text-muted-foreground/70">
                            Ketujuh karakter ditampilkan lengkap dengan badan — pilih salah satu sebelum menambah pemain.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1" onClick={() => addPlayer(false)}>
                            <Plus /> Tambah Pemain
                          </Button>
                          <Button variant="soft" className="flex-1" onClick={() => addPlayer(true)}>
                            <Bot /> Tambah Bot
                          </Button>
                        </div>
                      </div>

                      <Button size="lg" className="mt-6 w-full" onClick={handleStart} disabled={!quiz}>
                        <Play /> Mulai Permainan
                      </Button>
                    </div>
                  </section>

                  <aside className="space-y-5">
                    <div className="rounded-2xl border border-border bg-card p-5">
                      <p className="text-xs font-semibold text-muted-foreground">Papan permainan</p>
                      <img
                        src={theme.asset}
                        alt={`Papan ${theme.name}`}
                        className="mt-3 aspect-[2400/1792] w-full rounded-xl border border-border object-fill"
                        draggable={false}
                      />
                      <h3 className="mt-3 font-display font-bold">{theme.name}</h3>
                      <p className="text-xs text-muted-foreground">{theme.description}</p>

                      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4 text-center">
                        <div className="rounded-xl bg-secondary py-2">
                          <p className="font-display text-lg font-bold tabular-nums">{questions.length}</p>
                          <p className="text-[10px] text-muted-foreground">Total soal</p>
                        </div>
                        <div className="rounded-xl bg-secondary py-2">
                          <p className="font-display text-lg font-bold tabular-nums">{config.answer_time_limit}s</p>
                          <p className="text-[10px] text-muted-foreground">Waktu jawab</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5">
                      <h3 className="flex items-center gap-2 font-display text-sm font-bold">
                        <Info className="size-4 text-primary" /> Cara Main
                      </h3>
                      <ol className="mt-3 space-y-2 text-xs text-muted-foreground">
                        <li>1. Putar dadu — angka 1–6 menentukan level soal.</li>
                        <li>2. Jawab soal. Benar → jalan sesuai dadu; salah/waktu habis → tetap.</li>
                        <li>3. Injak tangga naik; terkena ular turun.</li>
                        <li>4. Pemain pertama di kotak 100 menang.</li>
                      </ol>
                    </div>
                  </aside>
                </div>
              )}

              {/* ---------------------------- BERMAIN ---------------------------- */}
              {phase === "playing" && currentPlayer && (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <span
                          className={cn(
                            "size-3 rounded-full ring-2",
                            TOKEN_TINT[turn % TOKEN_TINT.length],
                          )}
                        />
                        Giliran <span className="text-primary">{currentPlayer.name}</span>
                        {currentPlayer.isBot && <Bot className="size-4 text-accent" />}
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs font-semibold text-muted-foreground">
                        {players.map((p, i) => (
                          <span key={p.id} className="flex items-center gap-1">
                            <span className={cn("size-2 rounded-full", TOKEN_TINT[i % TOKEN_TINT.length])} />
                            {p.name}: {p.position} · {p.score} pts
                          </span>
                        ))}
                      </div>
                    </div>

                    <Board
                      players={players}
                      themeId={config.map_id}
                      special={special}
                      tokenArea={tokenArea}
                    />

                    <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:gap-4">
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-success">
                        <ArrowUp className="size-3.5" /> Tangga naik
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-destructive">
                        <ArrowDown className="size-3.5" /> Ular turun
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-warning">
                        <Trophy className="size-3.5" /> Kotak 100 = menang
                      </div>
                      <button
                        type="button"
                        onClick={() => setTokenArea((a) => (a === "penuh" ? "tengah" : "penuh"))}
                        title="Ubah area penempatan token bila kotak pada gambar map tidak memenuhi seluruh gambar"
                        className="rounded-full border border-border bg-secondary px-3 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        Area token: {TOKEN_AREAS[tokenArea].label}
                      </button>
                    </div>
                  </div>

                  <aside className="space-y-4">
                    <div className="rounded-2xl border border-border bg-card p-6 text-center">
                      <p className="text-xs font-semibold text-muted-foreground">Dadu</p>
                      <div className="my-5 flex justify-center">
                        <Dice value={dice} rolling={rolling} />
                      </div>
                      {dice !== null && !rolling && (
                        <p className="mb-3 text-xs font-bold text-primary">
                          Level {dice} · {DIFFICULTY_LABELS[dice]}
                        </p>
                      )}
                      <Button
                        size="lg"
                        className="w-full"
                        onClick={handleRoll}
                        disabled={rolling || moving || questionOpen}
                      >
                        {rolling ? <Loader2 className="animate-spin" /> : <Dices />}
                        {rolling ? "Berputar…" : "Putar Dadu"}
                      </Button>
                      <motion.p
                        key={notice}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground"
                      >
                        {notice}
                      </motion.p>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5">
                      <h3 className="flex items-center gap-2 font-display text-sm font-bold">
                        <Trophy className="size-4 text-warning" /> Leaderboard
                      </h3>
                      <div className="mt-3 space-y-2">
                        {ranked.map((p, i) => (
                          <div
                            key={p.id}
                            className={cn(
                              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
                              i === 0 ? "bg-warning-soft" : "bg-foreground/[0.03]",
                            )}
                          >
                            <span className="grid size-6 place-items-center rounded-full bg-card text-[11px] font-bold">
                              {i + 1}
                            </span>
                            <img
                              src={characterAsset(p.character)}
                              alt={`${p.name} — karakter ${p.character}`}
                              className="h-12 w-9 shrink-0 object-contain object-bottom"
                              draggable={false}
                            />
                            <span className="flex-1 truncate font-semibold">{p.name}</span>
                            <span className="text-[11px] text-muted-foreground">pos {p.position}</span>
                            <span className="font-bold text-primary tabular-nums">{p.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5">
                      <h3 className="font-display text-sm font-bold">Log Permainan</h3>
                      <div className="mt-3 max-h-44 space-y-2 overflow-y-auto">
                        {log.length === 0 && <p className="text-xs text-muted-foreground">Belum ada aktivitas.</p>}
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

              {/* ----------------------------- HASIL ----------------------------- */}
              {phase === "result" && winner && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mx-auto max-w-2xl space-y-5"
                >
                  <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
                    <motion.div
                      initial={{ y: -18, rotate: -10 }}
                      animate={{ y: 0, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                      className="mx-auto grid size-20 place-items-center rounded-2xl bg-warning-soft"
                    >
                      <Trophy className="size-10 text-warning" />
                    </motion.div>
                    <div className="mt-4 flex justify-center">
                      <img
                        src={characterAsset(winner.character)}
                        alt={`${winner.name} — karakter ${winner.character}`}
                        className="h-36 w-32 object-contain object-bottom drop-shadow-md"
                        draggable={false}
                      />
                    </div>
                    <h2 className="mt-2 font-display text-3xl font-bold">Selamat, {winner.name}!</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Pemenang mencapai kotak 100 dengan {winner.score} poin.
                    </p>

                    <div className="mt-6 grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-secondary py-3">
                        <p className="font-display text-xl font-bold tabular-nums">{rounds}</p>
                        <p className="text-[10px] text-muted-foreground">Giliran</p>
                      </div>
                      <div className="rounded-xl bg-secondary py-3">
                        <p className="font-display text-xl font-bold tabular-nums">
                          {players.reduce((a, p) => a + p.correct, 0)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Jawaban benar</p>
                      </div>
                      <div className="rounded-xl bg-secondary py-3">
                        <p className="font-display text-xl font-bold tabular-nums">
                          {players.reduce((a, p) => a + p.score, 0)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Total poin</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h3 className="font-display text-base font-bold">Hasil Akhir</h3>
                    <div className="mt-4 space-y-2">
                      {ranked.map((p, i) => (
                        <div
                          key={p.id}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                            i === 0 ? "bg-warning-soft" : "bg-foreground/[0.03]",
                          )}
                        >
                          <span className="grid size-7 place-items-center rounded-full bg-card font-bold text-xs">
                            {i + 1}
                          </span>
                          <img
                            src={characterAsset(p.character)}
                            alt={`${p.name} — karakter ${p.character}`}
                            className="h-16 w-12 shrink-0 object-contain object-bottom"
                            draggable={false}
                          />
                          <span className="flex-1 font-semibold">{p.name}</span>
                          <span className="text-xs text-muted-foreground">posisi {p.position}</span>
                          <span className="font-bold text-primary tabular-nums">{p.score} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-center gap-3">
                    <Button variant="outline" onClick={() => resetBoard(true)}>
                      <Users /> Ganti Pemain
                    </Button>
                    <Button onClick={() => resetBoard(false)}>
                      <RotateCcw /> Main Lagi
                    </Button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* Modal soal */}
      <AnimatePresence>
        {questionOpen && currentQuestion && (
          <QuestionOverlay
            question={currentQuestion}
            player={players[turn] ?? players[0]}
            difficulty={difficulty}
            timeLimit={config.answer_time_limit}
            remainingMs={remainingMs}
            selected={selectedOption}
            result={answerResult}
            onAnswer={(id) => submitAnswer(id, dice ?? 1)}
          />
        )}
      </AnimatePresence>
    </HostShell>
  );
}
