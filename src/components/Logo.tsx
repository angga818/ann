import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <motion.div
        whileHover={{ rotate: -8, scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-fuchsia-500/30"
      >
        <Zap className="size-5 text-white" strokeWidth={2.6} />
      </motion.div>
      {!compact && (
        <span className="font-display text-xl font-extrabold tracking-tight">
          Quiz<span className="bg-gradient-to-r from-violet-400 to-cyan-300 bg-clip-text text-transparent">Live</span>
        </span>
      )}
    </div>
  );
}
