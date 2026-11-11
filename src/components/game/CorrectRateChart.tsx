import { motion } from "framer-motion";
import type { ReportQuestion } from "@/lib/reports";
import { correctRate } from "@/lib/reports";
import { cn } from "@/lib/utils";

/**
 * Grafik bar persentase jawaban benar per soal.
 * Dibangun dari div + framer-motion (bukan pustaka chart eksternal) agar
 * gayanya konsisten dengan AnswerBars dan design system. Soal tersulit
 * disorot merah supaya langsung terlihat.
 */
export function CorrectRateChart({ questions, className }: { questions: ReportQuestion[]; className?: string }) {
  if (questions.length === 0) return null;
  const rates = questions.map((q) => Math.round(correctRate(q) * 100));
  const minRate = Math.min(...rates);

  return (
    <div className={className}>
      <div className="flex h-44 items-end gap-1.5 overflow-x-auto pb-1 sm:gap-2.5">
        {questions.map((q, i) => {
          const pct = rates[i];
          const hardest = pct <= minRate;
          return (
            <div
              key={q.index}
              className="flex h-full min-w-8 flex-1 flex-col items-center justify-end gap-1.5"
              title={`Soal ${q.index + 1}: ${pct}% jawaban benar (${q.correct_count}/${q.total_players})`}
            >
              <span
                className={cn(
                  "text-[10px] font-bold tabular-nums",
                  hardest ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {pct}%
              </span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(pct, 2.5)}%` }}
                transition={{ delay: 0.045 * i, type: "spring", stiffness: 180, damping: 24 }}
                className={cn(
                  "w-full min-h-1 rounded-t-md",
                  hardest ? "bg-destructive/75" : pct >= 70 ? "bg-success/80" : "bg-primary/80",
                )}
              />
              <span className="text-[10px] font-semibold tabular-nums text-muted-foreground/70">
                {q.index + 1}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground/70">
        Angka di bawah bar = nomor soal · bar merah = soal tersulit · persentase dari seluruh pemain saat soal
        berjalan.
      </p>
    </div>
  );
}
