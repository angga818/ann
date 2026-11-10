import * as React from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

/** Angka yang beranimasi naik/turun halus (untuk skor, PIN, countdown). */
export function AnimatedNumber({
  value,
  className,
  springConfig,
}: {
  value: number;
  className?: string;
  springConfig?: { stiffness?: number; damping?: number };
}) {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: springConfig?.stiffness ?? 90, damping: springConfig?.damping ?? 18 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString("id-ID"));

  React.useEffect(() => {
    mv.set(value);
  }, [mv, value]);

  return <motion.span className={cn("tabular-nums", className)}>{display}</motion.span>;
}

/** Wrapper halaman dengan animasi masuk. */
export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn("mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:pt-12", className)}
    >
      {children}
    </motion.main>
  );
}

/** Indikator status koneksi WS. */
const STATUS_CONFIG = {
  open: { label: "Terhubung", dot: "bg-success", pulse: "bg-success" },
  connecting: { label: "Menghubungkan…", dot: "bg-warning", pulse: "bg-warning" },
  reconnecting: { label: "Menyambung ulang…", dot: "bg-warning", pulse: "bg-warning" },
  closed: { label: "Terputus", dot: "bg-destructive", pulse: "bg-destructive" },
} as const;

export function ConnectionPill({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.closed;
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
      <span className="relative flex size-2">
        <AnimatePresence>
          {status !== "open" && (
            <motion.span
              key="pulse"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 2.4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.4, ease: "easeOut" }}
              className={cn("absolute inline-flex size-2 rounded-full", cfg.pulse)}
            />
          )}
        </AnimatePresence>
        <span className={cn("relative inline-flex size-2 rounded-full", cfg.dot)} />
      </span>
      <span className="text-xs font-semibold text-muted-foreground">{cfg.label}</span>
    </div>
  );
}
