import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <motion.div
        whileHover={{ rotate: -8, scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"
      >
        <Zap className="size-5" strokeWidth={2.6} />
      </motion.div>
      {!compact && (
        <span className="font-display text-xl font-bold tracking-tight">
          Quiz<span className="text-primary">Live</span>
        </span>
      )}
    </div>
  );
}
