import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import * as React from "react";
import { remainingMs } from "@/lib/time";
import { cn } from "@/lib/utils";

/**
 * Bar countdown di atas soal: menyusut dari 100% → 0% mengikuti sisa waktu
 * berbasis jam server; berubah warna saat mendesak.
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
  const [progress, setProgress] = React.useState(1);

  React.useEffect(() => {
    if (!deadlineMs || totalMs <= 0) {
      setProgress(1);
      return;
    }
    const update = () => {
      const rem = remainingMs(deadlineMs);
      setProgress(Math.min(1, Math.max(0, rem / totalMs)));
    };
    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [deadlineMs, totalMs]);

  const urgent = progress < 0.25;
  const warn = progress < 0.55;

  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-white/8", className)}>
      <motion.div
        className={cn(
          "h-full rounded-full",
          urgent
            ? "bg-gradient-to-r from-red-500 to-rose-400 shadow-[0_0_18px_rgba(244,63,94,0.5)]"
            : warn
              ? "bg-gradient-to-r from-amber-500 to-orange-400"
              : "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400",
        )}
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.12, ease: "linear" }}
      />
    </div>
  );
}

/** Angka detik besar yang beranimasi tiap detik. */
export function TimerDigits({ deadlineMs, totalMs }: { deadlineMs?: number; totalMs: number }) {
  const [sec, setSec] = React.useState(Math.ceil(totalMs / 1000));

  React.useEffect(() => {
    if (!deadlineMs) return;
    const update = () => setSec(Math.max(0, Math.ceil(remainingMs(deadlineMs) / 1000)));
    update();
    const id = setInterval(update, 200);
    return () => clearInterval(id);
  }, [deadlineMs]);

  const scale = useMotionValue(1);
  const mvSec = useMotionValue(sec);

  React.useEffect(() => {
    const controls = animate(mvSec, sec, { duration: 0.3 });
    animate(scale, [1.25, 1], { duration: 0.3, ease: "easeOut" });
    return controls.stop;
  }, [sec, mvSec, scale]);

  const text = useTransform(mvSec, (v) => String(Math.max(0, Math.round(v))));

  return (
    <motion.span
      style={{ scale, originX: 0.5, originY: 0.5 }}
      className={cn(
        "inline-block font-display text-2xl font-black tabular-nums sm:text-3xl",
        sec <= 5 ? "text-red-400" : "text-foreground",
      )}
    >
      <motion.span>{text}</motion.span>
    </motion.span>
  );
}
