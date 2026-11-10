import * as React from "react";
import { motion } from "framer-motion";
import { useServerCountdown } from "@/hooks/useServerCountdown";
import { cn } from "@/lib/utils";

/**
 * Bar countdown soal: menyusut 100% → 0% berbasis jam server,
 * tanpa animasi JS per-frame — cukup transisi CSS.
 */
export function CountdownBar({
  deadlineMs,
  totalMs,
  className,
}: {
  deadlineMs?: number;
  totalMs: number;
  className?: string;
}) {
  const remaining = useServerCountdown(deadlineMs);
  const progress = totalMs > 0 ? Math.min(1, remaining / totalMs) : 1;
  const urgent = progress < 0.25;
  const warn = progress < 0.55;

  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-foreground/10", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-150 ease-linear",
          urgent ? "bg-destructive" : warn ? "bg-warning" : "bg-primary",
        )}
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}

/** Angka detik besar — pop halus tiap detik lewat remount key (tanpa animasi bocor). */
export function TimerDigits({ deadlineMs }: { deadlineMs?: number }) {
  const remaining = useServerCountdown(deadlineMs);
  const sec = Math.max(0, Math.ceil(remaining / 1000));
  const urgent = remaining <= 5000;

  return (
    <motion.span
      key={sec}
      initial={{ scale: 1.18, opacity: 0.55 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn(
        "inline-block font-display text-2xl font-black tabular-nums sm:text-3xl",
        urgent && "text-destructive",
      )}
    >
      {sec}
    </motion.span>
  );
}
