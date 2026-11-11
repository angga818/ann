import * as React from "react";
import { motion } from "framer-motion";
import { useServerCountdown } from "@/hooks/useServerCountdown";
import { cn } from "@/lib/utils";

/**
 * Bar countdown soal: menyusut 100% → 0% berbasis jam server.
 * Transisi CSS murni antar pembaruan diskrit (hemat render, tetap halus),
 * berdenyut saat waktu kritis.
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
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div
        className={cn(
          "h-full origin-left rounded-full transition-[width] duration-150 ease-linear",
          urgent ? "bg-opt-0" : warn ? "bg-opt-2" : "bg-primary",
        )}
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}

/** Timer lingkaran: cincin progress + angka detik yang "pop" tiap detik. */
export function TimerRing({
  deadlineMs,
  totalMs,
  size = 76,
  className,
}: {
  deadlineMs?: number;
  totalMs: number;
  size?: number;
  className?: string;
}) {
  const remaining = useServerCountdown(deadlineMs);
  const sec = Math.max(0, Math.ceil(remaining / 1000));
  const progress = totalMs > 0 ? Math.min(1, remaining / totalMs) : 0;
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const urgent = remaining <= 5000;

  return (
    <motion.div
      animate={urgent ? { x: [0, -1.5, 1.5, -1, 1, 0] } : { x: 0 }}
      transition={urgent ? { repeat: Infinity, repeatDelay: 0.9, duration: 0.4 } : { duration: 0.2 }}
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      role="timer"
      aria-label={`${sec} detik tersisa`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--secondary)" strokeWidth="6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={urgent ? "var(--opt-0)" : "var(--primary)"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          style={{ transition: "stroke-dashoffset 150ms linear, stroke 300ms" }}
        />
      </svg>
      <motion.span
        key={sec}
        initial={{ scale: 1.28 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "absolute font-display text-xl font-extrabold tabular-nums",
          urgent ? "text-destructive" : "text-foreground",
        )}
      >
        {sec}
      </motion.span>
    </motion.div>
  );
}

/** Angka detik sederhana (dipakai di header host). */
export function TimerDigits({ deadlineMs }: { deadlineMs?: number }) {
  const remaining = useServerCountdown(deadlineMs);
  const sec = Math.max(0, Math.ceil(remaining / 1000));
  const urgent = remaining <= 5000;

  return (
    <motion.span
      key={sec}
      initial={{ scale: 1.22, opacity: 0.6 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn(
        "inline-block font-display text-2xl font-extrabold tabular-nums sm:text-3xl",
        urgent && "text-destructive",
      )}
    >
      {sec}
    </motion.span>
  );
}

/**
 * Hitungan mundur fase PREVIEW (sebelum soal dimulai).
 * Angka besar yang mengecil tiap detik dengan efek pop, cincin yang menyusut,
 * dan aksen warna yang menghangat saat mendekati nol.
 * Bila timestamp akhir preview belum diketahui (event belum sampai), angka
 * soal berikutnya ditampilkan sebagai fallback statis yang berdenyut.
 */
export function PreviewCountdown({
  endsAtMs,
  totalMs = 3000,
  fallbackNumber,
  label = "Bersiap!",
  className,
}: {
  endsAtMs?: number;
  totalMs?: number;
  fallbackNumber?: number;
  label?: string;
  className?: string;
}) {
  const remaining = useServerCountdown(endsAtMs);
  const sec = Math.max(0, Math.ceil(remaining / 1000));
  const progress = totalMs > 0 ? Math.min(1, remaining / totalMs) : 0;
  const hasTarget = !!endsAtMs;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative grid size-36 place-items-center sm:size-44">
        {/* cincin luar berdenyut */}
        <motion.span
          className="absolute inset-0 rounded-full border-4 border-primary/25"
          animate={{ scale: [1, 1.12, 1], opacity: [0.7, 0.25, 0.7] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
        />
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90">
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--secondary)" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 44}
            strokeDashoffset={2 * Math.PI * 44 * (1 - progress)}
            style={{ transition: "stroke-dashoffset 150ms linear" }}
          />
        </svg>
        {hasTarget ? (
          <motion.span
            key={sec}
            initial={{ scale: 1.6, opacity: 0, rotate: -6 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 18 }}
            className="font-display text-7xl font-black tabular-nums text-primary sm:text-8xl"
          >
            {sec}
          </motion.span>
        ) : (
          <motion.span
            key={`fb-${fallbackNumber}`}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
            className="font-display text-7xl font-black tabular-nums text-primary sm:text-8xl"
          >
            {String(Math.max(1, fallbackNumber ?? 1)).padStart(2, "0")}
          </motion.span>
        )}
      </div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-5 text-sm font-bold uppercase tracking-[0.3em] text-muted-foreground"
      >
        {label}
      </motion.p>
    </div>
  );
}
