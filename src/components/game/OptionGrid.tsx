import { motion } from "framer-motion";
import { Check, Users, X } from "lucide-react";
import type { WsOption, WsQuestion } from "@/types";
import { optionStyle } from "@/lib/option-colors";
import { SmartImage } from "@/components/SmartImage";
import { cn } from "@/lib/utils";

/** Grid opsi jawaban — mode host (statis) atau pemain (interaktif). */
export function OptionGrid({
  question,
  mode,
  selectedOptionId,
  correctOptionId,
  reveal,
  frozen,
  onSelect,
}: {
  question: WsQuestion;
  mode: "host" | "player";
  selectedOptionId?: string;
  correctOptionId?: string;
  reveal: boolean;
  /** Waktu habis / hasil sedang dihitung — kunci input tanpa mengungkap benar/salah. */
  frozen?: boolean;
  onSelect?: (opt: WsOption) => void;
}) {
  const locked = (mode === "player" && !!selectedOptionId) || !!frozen;

  return (
    <div className={cn("grid gap-3", question.options.length > 2 ? "sm:grid-cols-2" : "grid-cols-1")}>
      {question.options.map((opt, i) => {
        const st = optionStyle(opt.color_index);
        const isSelected = selectedOptionId === opt.id;
        const isCorrect = reveal && correctOptionId === opt.id;
        const isWrongPick = reveal && isSelected && correctOptionId !== opt.id;
        const dimmed = reveal && !isCorrect && !isWrongPick;

        return (
          <motion.button
            key={opt.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, type: "spring", stiffness: 320, damping: 26 }}
            whileHover={mode === "player" && !locked && !reveal ? { scale: 1.015, y: -2 } : undefined}
            whileTap={mode === "player" && !locked && !reveal ? { scale: 0.97 } : undefined}
            disabled={mode === "host" || locked || reveal}
            onClick={() => onSelect?.(opt)}
            className={cn(
              "relative flex items-center gap-4 rounded-2xl p-5 text-left transition-[filter,opacity] duration-150",
              st.base,
              st.text,
              mode === "player" && !locked && !reveal && `cursor-pointer ${st.hover}`,
              isSelected && !reveal && "ring-2 ring-foreground/60 ring-offset-2 ring-offset-background",
              dimmed && "opacity-40",
              isCorrect && "ring-2 ring-success ring-offset-2 ring-offset-background",
              isWrongPick && "ring-2 ring-destructive ring-offset-2 ring-offset-background",
              frozen && !reveal && "opacity-70",
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-black/20">
              <st.icon className="size-5" strokeWidth={2.5} />
            </span>
            <span className="min-w-0 flex-1 font-display text-base font-bold leading-snug sm:text-lg">
              {opt.text}
            </span>

            {isSelected && !reveal && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="grid size-7 shrink-0 place-items-center rounded-full bg-black/25"
              >
                <Check className="size-4" strokeWidth={3} />
              </motion.span>
            )}
            {isCorrect && (
              <motion.span
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="grid size-8 shrink-0 place-items-center rounded-full bg-black/30"
              >
                <Check className="size-5" strokeWidth={3.2} />
              </motion.span>
            )}
            {isWrongPick && (
              <motion.span
                initial={{ scale: 0, rotate: 30 }}
                animate={{ scale: 1, rotate: 0 }}
                className="grid size-8 shrink-0 place-items-center rounded-full bg-black/30"
              >
                <X className="size-5" strokeWidth={3.2} />
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Header soal: nomor, teks, gambar. */
export function QuestionHeader({ question, eager }: { question: WsQuestion; eager?: boolean }) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        <span>
          Soal {question.index + 1} <span className="text-muted-foreground/50">/ {question.total}</span>
        </span>
      </div>
      {question.image_url && (
        <SmartImage
          url={question.image_url}
          alt="Gambar soal"
          eager={eager}
          className="mx-auto max-h-64 w-full max-w-xl rounded-2xl border border-border"
        />
      )}
      <h2 className="text-balance text-center font-display text-2xl font-black leading-tight sm:text-3xl">
        {question.question_text}
      </h2>
    </div>
  );
}

/** Grafik distribusi jawaban untuk host (ANSWER_SUMMARY) — bar flat. */
export function AnswerBars({
  counts,
  options,
  correctOptionId,
}: {
  counts: Record<string, number>;
  options: WsOption[];
  correctOptionId?: string;
}) {
  const max = Math.max(1, ...Object.values(counts ?? {}));
  const total = Object.values(counts ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Users className="size-3.5" /> Distribusi jawaban ({total})
      </p>
      {options.map((opt) => {
        const st = optionStyle(opt.color_index);
        const count = counts?.[opt.id] ?? 0;
        const pct = (count / max) * 100;
        const isCorrect = correctOptionId === opt.id;
        return (
          <div key={opt.id} className="flex items-center gap-3">
            <div className={cn("relative h-10 flex-1 overflow-hidden rounded-xl", st.barTrack)}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
                className={cn("absolute inset-y-0 left-0", st.barFill)}
              />
              <span className={cn("absolute inset-y-0 left-3 flex items-center text-sm font-bold", st.text)}>
                {opt.text}
              </span>
              {isCorrect && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="size-5 text-foreground drop-shadow" strokeWidth={3.5} />
                </span>
              )}
            </div>
            <motion.span
              key={count}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="w-8 text-right font-display text-lg font-black tabular-nums"
            >
              {count}
            </motion.span>
          </div>
        );
      })}
    </div>
  );
}
